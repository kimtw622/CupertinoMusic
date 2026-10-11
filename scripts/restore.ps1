<#
.SYNOPSIS
  CupertinoMusic 설치 이전의 테마와 테마 관련 설정으로 되돌린다.

.DESCRIPTION
  install.ps1 이 backups\user-settings\ 에 남긴 기록(manifest.json)을 읽어
  current_theme / color_scheme / inject_css / replace_colors / inject_theme_js / overwrite_assets
  여섯 값만 이전으로 되돌리고 spicetify apply 를 실행한다.

  기본 동작은 "설정 값 되돌리기"다. 되돌릴 테마의 폴더가 이미 있으면 그 안의 파일은 건드리지 않는다.
  그래서 CupertinoMusic 이 대상인 백업을 골라도 지금 설치된 color.ini / user.css / theme.js 가 그대로 쓰인다.
  백업 시점의 파일로 되돌리려면 -RestoreFiles 를 붙인다.

  이 스크립트는 Spicetify 자체를 걷어내지 않는다. extensions, custom_apps, Marketplace,
  스니펫은 그대로 둔다. Spicetify 커스터마이징 전체를 제거하려면 "spicetify restore" 를 쓴다.

.PARAMETER Backup
  되돌릴 백업 폴더 이름 (backups\user-settings\ 아래). 생략하면
  "CupertinoMusic 을 처음 설치하기 직전" 상태인 가장 오래된 백업을 쓴다.

.PARAMETER List
  사용할 수 있는 백업 목록만 보여 준다.

.PARAMETER RestoreFiles
  되돌릴 테마의 폴더를 백업에 들어 있는 그 시점의 파일로 바꾼다.
  바꾸기 전에 지금 폴더는 backups\before-restore\<시각>\ 에 보관한다.
  이 스위치가 없으면 테마 폴더가 없을 때만 백업에서 되살린다.

.PARAMETER RemoveTheme
  되돌린 뒤 Themes\CupertinoMusic 폴더도 지운다. 되돌릴 대상이 CupertinoMusic 인 백업에는 쓸 수 없다.

.PARAMETER NoRestart
  적용 후 Spotify 를 재시작하지 않는다 (spicetify apply -n).

.PARAMETER NoApply
  설정(과 -RestoreFiles 의 파일)까지만 되돌리고 apply 는 하지 않는다.

.EXAMPLE
  .\scripts\restore.ps1 -List
  .\scripts\restore.ps1
  .\scripts\restore.ps1 -Backup 2026-10-04_222640 -RemoveTheme
  .\scripts\restore.ps1 -Backup 2026-10-05_010711 -RestoreFiles
#>
[CmdletBinding()]
param(
    [string]$Backup,
    [switch]$List,
    [switch]$RestoreFiles,
    [switch]$RemoveTheme,
    [switch]$NoRestart,
    [switch]$NoApply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ThemeName = 'CupertinoMusic'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$UserBackups = Join-Path $ProjectRoot 'backups\user-settings'

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Info([string]$Message) { Write-Host "    $Message" }
function Remove-Ansi([string]$Text) { return ($Text -replace '\x1b\[[0-9;]*m', '') }

function Get-SpicetifyExe {
    $cmd = Get-Command spicetify -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
    if (Test-Path $fallback) { return $fallback }
    throw 'spicetify 를 찾을 수 없습니다.'
}

function Invoke-Spicetify {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $script:Spicetify @Arguments 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $previous }
    if ($code -ne 0) {
        throw ("spicetify {0} 실패 (exit {1}):`n{2}" -f ($Arguments -join ' '), $code, ($output -join "`n"))
    }
    return $output
}

function Get-LastLine {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $lines = @(Invoke-Spicetify -Arguments $Arguments) | Where-Object { $_ -and "$_".Trim() }
    $last = @($lines) | Select-Object -Last 1
    if ($null -eq $last) { return '' }
    return (Remove-Ansi "$last").Trim()
}

# 설정 파일에서 한 키의 값을 비운다.
# 빈 값은 "spicetify config <키> ''" 로 넘기지 않는다: Windows PowerShell 5.1 은 빈 문자열 인자를
# 버리기 때문에 뒤따르는 인자가 값으로 밀려 들어간다.
function Clear-IniValue([string]$Path, [string]$Section, [string]$Key) {
    $text = [System.IO.File]::ReadAllText($Path)
    $newline = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines = @($text -split "`r?`n")
    $inSection = $false
    $done = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $t = $lines[$i].Trim()
        if ($t -match '^\[(.+)\]$') { $inSection = ($Matches[1] -eq $Section); continue }
        if ($inSection -and $t -match ('^{0}\s*=' -f [regex]::Escape($Key))) {
            $lines[$i] = ($lines[$i] -replace '=.*$', '= ')
            $done = $true
        }
    }
    if (-not $done) { throw "설정 파일에서 [$Section] $Key 를 찾지 못했습니다: $Path" }
    [System.IO.File]::WriteAllText($Path, ($lines -join $newline), (New-Object System.Text.UTF8Encoding($false)))
}

# ---------------------------------------------------------------------------
# 1. 백업 목록
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $UserBackups)) { throw "백업 폴더가 없습니다: $UserBackups" }
$candidates = @()
foreach ($dir in Get-ChildItem -LiteralPath $UserBackups -Directory | Sort-Object Name) {
    $manifestPath = Join-Path $dir.FullName 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { continue }
    $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $candidates += [pscustomobject]@{
        Name         = $dir.Name
        Path         = $dir.FullName
        Theme        = $m.previous.current_theme
        Scheme       = $m.previous.color_scheme
        IsPreInstall = [bool]$m.isPreInstall
        Manifest     = $m
    }
}
if ($candidates.Count -eq 0) { throw "manifest.json 이 있는 백업이 없습니다: $UserBackups" }

if ($List) {
    $candidates | Select-Object Name, Theme, Scheme, IsPreInstall | Format-Table -AutoSize
    return
}

if ($Backup) {
    $chosen = $candidates | Where-Object { $_.Name -eq $Backup } | Select-Object -First 1
    if (-not $chosen) { throw "백업을 찾을 수 없습니다: $Backup  (-List 로 목록 확인)" }
}
else {
    $chosen = $candidates | Where-Object { $_.IsPreInstall } | Select-Object -First 1
    if (-not $chosen) { throw 'CupertinoMusic 설치 이전 상태의 백업이 없습니다. -Backup 으로 직접 지정하세요.' }
}
$prev = $chosen.Manifest.previous
$prevTheme = "$($prev.current_theme)"
if ($RemoveTheme -and $prevTheme -eq $ThemeName) {
    throw "이 백업($($chosen.Name))은 $ThemeName 으로 되돌리는 지점이라 -RemoveTheme 와 함께 쓸 수 없습니다."
}

# ---------------------------------------------------------------------------
# 2. 환경 확인
# ---------------------------------------------------------------------------
Write-Step '환경 확인'
$script:Spicetify = Get-SpicetifyExe
$configPath = Get-LastLine -Arguments @('-c')
if (-not $configPath -or -not (Test-Path -LiteralPath $configPath)) { throw "Spicetify 설정 파일을 찾을 수 없습니다: $configPath" }
$userData = Get-LastLine -Arguments @('path', 'userdata')
if (-not $userData -or -not (Test-Path -LiteralPath $userData)) { throw "Spicetify 사용자 폴더를 찾을 수 없습니다: $userData" }
$themesDir = Join-Path $userData 'Themes'
$prevLabel = if ($prevTheme) { "$prevTheme / $($prev.color_scheme)" } else { '(테마 없음 - Spotify 기본 모습)' }
Write-Info "복구 지점 : $($chosen.Name)"
Write-Info "되돌릴 테마: $prevLabel"

if ($prevTheme) {
    $prevThemeDir = Join-Path $themesDir $prevTheme
    $saved = Join-Path $chosen.Path ("Themes\{0}" -f $prevTheme)
    if (-not (Test-Path -LiteralPath $prevThemeDir)) {
        # 이전 테마 폴더가 사라졌다면 백업본에서 되살린다.
        if (-not (Test-Path -LiteralPath $saved)) { throw "이전 테마 폴더가 없고 백업에도 없습니다: $prevTheme" }
        Copy-Item -LiteralPath $saved -Destination $prevThemeDir -Recurse
        Write-Info "테마 폴더 복원: $prevThemeDir"
    }
    elseif ($RestoreFiles) {
        # 백업 시점의 파일로 바꾼다. 지금 폴더는 먼저 따로 보관한다.
        if (-not (Test-Path -LiteralPath $saved)) {
            throw "이 백업($($chosen.Name))에는 '$prevTheme' 테마 파일이 없어 -RestoreFiles 를 쓸 수 없습니다."
        }
        $keepRoot = Join-Path $ProjectRoot 'backups\before-restore'
        $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
        $keep = Join-Path $keepRoot $stamp
        $n = 2
        while (Test-Path -LiteralPath $keep) { $keep = Join-Path $keepRoot ("{0}-{1}" -f $stamp, $n); $n++ }
        New-Item -ItemType Directory -Path $keep -Force | Out-Null
        Copy-Item -LiteralPath $prevThemeDir -Destination (Join-Path $keep $prevTheme) -Recurse
        Write-Info "지금 테마 폴더 보관: $keep"
        Remove-Item -LiteralPath $prevThemeDir -Recurse -Force
        Copy-Item -LiteralPath $saved -Destination $prevThemeDir -Recurse
        Write-Info "테마 파일 복원: $prevThemeDir  (백업 $($chosen.Name) 시점)"
    }
    else {
        Write-Info '테마 폴더가 이미 있어 파일은 그대로 둡니다 (백업 시점 파일로 되돌리려면 -RestoreFiles).'
    }
}

# ---------------------------------------------------------------------------
# 3. 설정 되돌리기 (테마 관련 키만)
# ---------------------------------------------------------------------------
Write-Step '설정 되돌리기'
$configArgs = @('config')
$toClear = @()
foreach ($key in 'current_theme', 'color_scheme', 'inject_css', 'replace_colors', 'inject_theme_js', 'overwrite_assets') {
    $prop = $prev.PSObject.Properties[$key]
    $value = if ($prop) { "$($prop.Value)" } else { '' }
    if ($value -ne '') {
        $configArgs += @($key, $value)
        Write-Info "$key = $value"
    }
    elseif ($prop -and $key -in 'current_theme', 'color_scheme') {
        # 테마를 쓰지 않던 상태(빈 값)도 그대로 되돌린다.
        $toClear += $key
        Write-Info "$key = (비움)"
    }
    else {
        Write-Warning "$key 의 이전 값이 기록에 없어 건너뜁니다."
    }
}
if ($configArgs.Count -gt 1) { Invoke-Spicetify -Arguments $configArgs | Out-Null }
foreach ($key in $toClear) { Clear-IniValue $configPath 'Setting' $key }

# ---------------------------------------------------------------------------
# 4. 적용
# ---------------------------------------------------------------------------
if ($NoApply) {
    Write-Step '적용 생략 (-NoApply). 준비가 되면 "spicetify apply" 를 실행하세요.'
}
else {
    Write-Step '적용: spicetify apply'
    $applyArgs = @('apply')
    if ($NoRestart) { $applyArgs += '-n' }
    @(Invoke-Spicetify -Arguments $applyArgs) |
        ForEach-Object { (Remove-Ansi "$_").Trim() } |
        Where-Object { $_ -and $_ -notmatch '^[-\\|/]\s' } |   # 진행 표시(스피너) 줄은 생략
        ForEach-Object { Write-Info $_ }
}

if ($RemoveTheme) {
    $themeDir = Join-Path $themesDir $ThemeName
    if (Test-Path -LiteralPath $themeDir) {
        Remove-Item -LiteralPath $themeDir -Recurse -Force
        Write-Info "삭제: $themeDir"
    }
}

Write-Info "복구 완료: $prevLabel"
if ($NoRestart -and -not $NoApply) { Write-Info 'Spotify 를 다시 시작해야 화면에 반영됩니다.' }
