<#
.SYNOPSIS
  CupertinoMusic 테마를 Spicetify 에 설치하고 적용한다.

.DESCRIPTION
  1) spicetify CLI 로 실제 설정 경로를 확인하고
  2) 현재 설정과 덮어쓸 파일을 backups\ 아래 날짜 폴더에 백업한 뒤
  3) 테마 파일을 Themes\CupertinoMusic 에 복사하고
  4) 테마 관련 설정 4개(current_theme, color_scheme, inject_css, replace_colors)만 바꿔
  5) spicetify apply 를 실행한다.
  extensions / custom_apps 목록과 그 밖의 설정은 건드리지 않는다.

.PARAMETER Scheme
  색상 스킴. Dark(기본) 또는 Light.

.PARAMETER NoRestart
  적용 후 Spotify 를 재시작하지 않는다 (spicetify apply -n). 직접 재시작해야 반영된다.

.PARAMETER NoApply
  파일 복사와 설정 변경까지만 하고 apply 는 하지 않는다.

.PARAMETER RefreshBackup
  Spotify 가 업데이트되어 Spicetify 원본 백업과 버전이 다를 때,
  "spicetify restore backup" 으로 원본 백업을 새로 만든 뒤 진행한다.

.EXAMPLE
  .\scripts\install.ps1
  .\scripts\install.ps1 -Scheme Light
#>
[CmdletBinding()]
param(
    [ValidateSet('Light', 'Dark')]
    [string]$Scheme = 'Dark',
    [switch]$NoRestart,
    [switch]$NoApply,
    [switch]$RefreshBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ThemeName = 'CupertinoMusic'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackupRoot = Join-Path $ProjectRoot 'backups'

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Info([string]$Message) { Write-Host "    $Message" }

function Get-SpicetifyExe {
    $cmd = Get-Command spicetify -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
    if (Test-Path $fallback) { return $fallback }
    throw 'spicetify 를 찾을 수 없습니다. Spicetify CLI 를 먼저 설치하세요: https://spicetify.app'
}

# spicetify 를 실행하고 실패하면 출력과 함께 예외를 던진다.
function Invoke-Spicetify {
    param([Parameter(Mandatory)][string[]]$Arguments, [switch]$AllowFailure)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $script:Spicetify @Arguments 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $previous }
    if ($code -ne 0 -and -not $AllowFailure) {
        throw ("spicetify {0} 실패 (exit {1}):`n{2}" -f ($Arguments -join ' '), $code, ($output -join "`n"))
    }
    return $output
}

# ANSI 색상 코드 제거
function Remove-Ansi([string]$Text) { return ($Text -replace '\x1b\[[0-9;]*m', '') }

# 출력의 마지막 비어 있지 않은 줄
function Get-LastLine {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $lines = @(Invoke-Spicetify -Arguments $Arguments) | Where-Object { $_ -and "$_".Trim() }
    $last = @($lines) | Select-Object -Last 1
    if ($null -eq $last) { return '' }
    return (Remove-Ansi "$last").Trim()
}

function Get-ConfigValue([string]$Field) {
    return Get-LastLine -Arguments @('config', $Field)
}

function Get-IniValue([string]$Path, [string]$Section, [string]$Key) {
    $inSection = $false
    foreach ($line in Get-Content -LiteralPath $Path) {
        $t = $line.Trim()
        if ($t -match '^\[(.+)\]$') { $inSection = ($Matches[1] -eq $Section); continue }
        if ($inSection -and $t -match ('^{0}\s*=\s*(.*)$' -f [regex]::Escape($Key))) { return $Matches[1].Trim() }
    }
    return ''
}

# 같은 이름의 폴더가 이미 있으면 -2, -3 … 을 붙여 기존 백업을 덮어쓰지 않는다.
function New-UniqueDirectory([string]$Parent, [string]$Name) {
    $path = Join-Path $Parent $Name
    $n = 2
    while (Test-Path $path) { $path = Join-Path $Parent ("{0}-{1}" -f $Name, $n); $n++ }
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    return $path
}

# ---------------------------------------------------------------------------
# 1. 환경 확인
# ---------------------------------------------------------------------------
Write-Step '환경 확인'
$script:Spicetify = Get-SpicetifyExe
$spicetifyVersion = Get-LastLine -Arguments @('-v')
$configPath = Get-LastLine -Arguments @('-c')
$userData = Get-LastLine -Arguments @('path', 'userdata')
if (-not $configPath -or -not $userData) { throw 'spicetify 가 설정 경로를 알려주지 않았습니다. "spicetify -c" 출력을 확인하세요.' }
if (-not (Test-Path -LiteralPath $configPath)) { throw "Spicetify 설정 파일이 없습니다: $configPath" }
if (-not (Test-Path -LiteralPath $userData)) { throw "Spicetify 사용자 폴더가 없습니다: $userData" }
$themesDir = Join-Path $userData 'Themes'
$themeDir = Join-Path $themesDir $ThemeName

$spotifyPath = Get-ConfigValue 'spotify_path'
$spotifyExe = Join-Path $spotifyPath 'Spotify.exe'
if (-not (Test-Path -LiteralPath $spotifyExe)) { throw "Spotify 실행 파일을 찾을 수 없습니다: $spotifyExe" }
$spotifyVersion = (Get-Item -LiteralPath $spotifyExe).VersionInfo.FileVersion

$previous = [ordered]@{
    current_theme    = Get-ConfigValue 'current_theme'
    color_scheme     = Get-ConfigValue 'color_scheme'
    inject_css       = Get-ConfigValue 'inject_css'
    replace_colors   = Get-ConfigValue 'replace_colors'
    inject_theme_js  = Get-ConfigValue 'inject_theme_js'
    overwrite_assets = Get-ConfigValue 'overwrite_assets'
}
$backupVersion = Get-IniValue $configPath 'Backup' 'version'

Write-Info "Spicetify  : $spicetifyVersion  ($script:Spicetify)"
Write-Info "Spotify    : $spotifyVersion  ($spotifyPath)"
Write-Info "설정 파일  : $configPath"
Write-Info "테마 폴더  : $themesDir"
Write-Info ("현재 테마  : {0} / {1}" -f $previous.current_theme, $previous.color_scheme)

foreach ($file in 'color.ini', 'user.css') {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $file))) { throw "테마 파일이 없습니다: $file" }
}
$schemeHeader = Select-String -LiteralPath (Join-Path $ProjectRoot 'color.ini') -Pattern ('^\[{0}\]\s*$' -f $Scheme) -Quiet
if (-not $schemeHeader) { throw "color.ini 에 [$Scheme] 스킴이 없습니다." }
$hasThemeJs = Test-Path -LiteralPath (Join-Path $ProjectRoot 'theme.js')

# ---------------------------------------------------------------------------
# 2. 원본 백업 상태 확인 (Spicetify 가 관리하는 Spotify 원본)
# ---------------------------------------------------------------------------
Write-Step 'Spotify 원본 백업 확인'
$spaBackup = Join-Path $userData 'Backup\xpui.spa'
if (-not $backupVersion -or -not (Test-Path -LiteralPath $spaBackup)) {
    Write-Info '원본 백업이 없습니다. "spicetify backup" 을 실행합니다.'
    @(Invoke-Spicetify -Arguments @('backup')) | ForEach-Object { Write-Info (Remove-Ansi "$_") }
    $backupVersion = Get-IniValue $configPath 'Backup' 'version'
}
elseif (-not $backupVersion.StartsWith($spotifyVersion)) {
    if (-not $RefreshBackup) {
        throw ("Spotify($spotifyVersion)와 Spicetify 원본 백업($backupVersion)의 버전이 다릅니다. " +
            'Spotify 가 업데이트된 것으로 보입니다. -RefreshBackup 을 붙여 다시 실행하거나 ' +
            '"spicetify restore backup" 을 먼저 실행하세요.')
    }
    Write-Info '버전이 달라 원본 백업을 새로 만듭니다: spicetify restore backup'
    @(Invoke-Spicetify -Arguments @('restore', 'backup')) | ForEach-Object { Write-Info (Remove-Ansi "$_") }
    $backupVersion = Get-IniValue $configPath 'Backup' 'version'
}
else {
    Write-Info "원본 백업 있음: $backupVersion"
}

# ---------------------------------------------------------------------------
# 3. 백업 (원본 Spotify 백업과 사용자 설정 백업을 분리)
# ---------------------------------------------------------------------------
Write-Step '백업'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$userBackup = New-UniqueDirectory (Join-Path $BackupRoot 'user-settings') $stamp
Copy-Item -LiteralPath $configPath -Destination $userBackup
$backedUpThemes = @()
foreach ($name in @($previous.current_theme, $ThemeName) | Where-Object { $_ } | Select-Object -Unique) {
    $src = Join-Path $themesDir $name
    if (Test-Path -LiteralPath $src) {
        $dst = Join-Path $userBackup 'Themes'
        New-Item -ItemType Directory -Path $dst -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination (Join-Path $dst $name) -Recurse
        $backedUpThemes += $name
    }
}
$manifest = [ordered]@{
    createdAt        = (Get-Date).ToString('o')
    createdBy        = 'install.ps1'
    spicetifyVersion = $spicetifyVersion
    spotifyVersion   = $spotifyVersion
    backupVersion    = $backupVersion
    previous         = $previous
    themesCopied     = $backedUpThemes
    # CupertinoMusic 을 처음 설치하기 전 상태인지 여부. restore.ps1 이 기본 복구 지점을 고를 때 쓴다.
    isPreInstall     = ($previous.current_theme -ne $ThemeName)
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $userBackup 'manifest.json') -Encoding UTF8
Write-Info "사용자 설정 백업: $userBackup"

if ($backupVersion) {
    $origBackup = Join-Path (Join-Path $BackupRoot 'spotify-original') $backupVersion
    if (Test-Path -LiteralPath $origBackup) {
        Write-Info "원본 Spotify 백업은 이미 보관됨: $origBackup"
    }
    else {
        New-Item -ItemType Directory -Path $origBackup -Force | Out-Null
        Copy-Item -Path (Join-Path $userData 'Backup\*.spa') -Destination $origBackup
        Get-FileHash -Path (Join-Path $origBackup '*.spa') -Algorithm SHA256 |
            ForEach-Object { '{0}  {1}' -f $_.Hash, (Split-Path $_.Path -Leaf) } |
            Set-Content -LiteralPath (Join-Path $origBackup 'SHA256.txt') -Encoding UTF8
        Write-Info "원본 Spotify 백업 보관: $origBackup"
    }
}

# ---------------------------------------------------------------------------
# 4. 테마 파일 설치
# ---------------------------------------------------------------------------
Write-Step "테마 파일 복사 -> $themeDir"
New-Item -ItemType Directory -Path $themeDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $ProjectRoot 'color.ini') -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot 'user.css') -Destination $themeDir -Force
if ($hasThemeJs) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot 'theme.js') -Destination $themeDir -Force
}
elseif (Test-Path -LiteralPath (Join-Path $themeDir 'theme.js')) {
    # 이 테마는 theme.js 를 쓰지 않는다. 예전 설치가 남긴 파일이 주입되지 않게 치운다(백업에는 남아 있음).
    Remove-Item -LiteralPath (Join-Path $themeDir 'theme.js') -Force
}

# ---------------------------------------------------------------------------
# 5. 설정 변경 (테마 관련 키만)
# ---------------------------------------------------------------------------
Write-Step '설정 변경'
$configArgs = @('config', 'current_theme', $ThemeName, 'color_scheme', $Scheme, 'inject_css', '1', 'replace_colors', '1')
if ($hasThemeJs) { $configArgs += @('inject_theme_js', '1') }
Invoke-Spicetify -Arguments $configArgs | Out-Null
Write-Info "current_theme = $ThemeName, color_scheme = $Scheme, inject_css = 1, replace_colors = 1"

# ---------------------------------------------------------------------------
# 6. 적용
# ---------------------------------------------------------------------------
if ($NoApply) {
    Write-Step '적용 생략 (-NoApply). 준비가 되면 "spicetify apply" 를 실행하세요.'
    return
}
Write-Step '적용: spicetify apply'
$applyArgs = @('apply')
if ($NoRestart) { $applyArgs += '-n' }
@(Invoke-Spicetify -Arguments $applyArgs) |
    ForEach-Object { (Remove-Ansi "$_").Trim() } |
    Where-Object { $_ -and $_ -notmatch '^[-\\|/]\s' } |   # 진행 표시(스피너) 줄은 생략
    ForEach-Object { Write-Info $_ }

# ---------------------------------------------------------------------------
# 7. 결과 확인
# ---------------------------------------------------------------------------
Write-Step '결과 확인'
$appliedCss = Join-Path $spotifyPath 'Apps\xpui\user.css'
$appliedColors = Join-Path $spotifyPath 'Apps\xpui\colors.css'
if (-not (Test-Path -LiteralPath $appliedCss)) { throw "적용된 user.css 가 없습니다: $appliedCss" }
$marker = Select-String -LiteralPath $appliedCss -Pattern 'CupertinoMusic' -Quiet
if (-not $marker) { throw '적용된 user.css 가 CupertinoMusic 의 것이 아닙니다. spicetify 출력을 확인하세요.' }
$expectedMain = (Get-IniValue (Join-Path $ProjectRoot 'color.ini') $Scheme 'main').ToLower()
$mainApplied = Select-String -LiteralPath $appliedColors -Pattern ('--spice-main:\s*#{0}' -f $expectedMain) -Quiet
if (-not $mainApplied) { Write-Warning "colors.css 에서 [$Scheme] 스킴의 main 색(#$expectedMain)을 찾지 못했습니다." }
Write-Info "적용 완료: $ThemeName / $Scheme"
if ($NoRestart) { Write-Info 'Spotify 를 다시 시작해야 화면에 반영됩니다.' }
Write-Info '이전 상태로 되돌리려면: .\scripts\restore.ps1'
