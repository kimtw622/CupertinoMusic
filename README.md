# CupertinoMusic

macOS Apple Music 을 연상시키는 차분한 Spicetify 테마입니다.
Spotify 의 기능과 화면 구조는 그대로 두고, 표면·색·글자·간격·재생바만 다시 정돈합니다.
Apple 로고·상표·글꼴 파일은 쓰지 않습니다. 모양은 전부 CSS 입니다. `theme.js` 는 다섯 가지만 합니다: 재생 중인 커버의 색과 주소를 CSS 변수로 넘기기(색조, 앱 전체 커버 배경), 가사 화면에 원형 커버와 스펙트럼 흉내 얹기, Spotify 가 필터 칩 이름에 글자 그대로 찍는 `<br/>` 지우기, Windows 창 버튼 자리의 높이를 상단 바에 맞추기.

```
CupertinoMusic/
  color.ini            색상 스킴 (Dark, Light)
  user.css             실제 Spotify UI 스타일
  theme.js             커버 색조·앱 전체 커버 배경·지금 재생 중 화면·칩 이름의 <br/> 정리 (없어도 테마는 동작)
  README.md
  scripts/
    install.ps1        Windows 설치·적용 (실행할 때마다 백업)
    install.sh         macOS / Linux 설치·적용
    restore.ps1        Windows 에서 설치 이전 테마·설정으로 복구
  backups/             install.ps1 이 이 PC 에만 만드는 백업 (저장소에는 없음)
  docs/screenshots/    실제 Spotify 에서 찍은 확인용 화면
```

## 확인한 환경

| 항목 | 값 |
| --- | --- |
| Spotify | 1.2.96.518 (Windows, `%APPDATA%\Spotify` 사용자 설치) |
| Spicetify | 2.45.3 (`%LOCALAPPDATA%\spicetify\spicetify.exe`) |
| 설정 파일 | `%APPDATA%\spicetify\config-xpui.ini` |
| 테마 폴더 | `%APPDATA%\spicetify\Themes\CupertinoMusic` |
| OS | Windows 11 Pro 10.0.26300 |
| 화면 | 3840×2160, Spotify 창 기준 배율 1.875 (창 내부 1291×831 CSS px) |
| 확인일 | 2026-10-04 |

## 설치 및 적용

PowerShell 에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
.\scripts\install.ps1                # Dark(기본)
.\scripts\install.ps1 -Scheme Light  # Light
```

스크립트가 하는 일:

1. `spicetify -c`, `spicetify path userdata` 로 실제 경로를 확인
2. 현재 설정 파일과 현재 테마 폴더를 `backups\user-settings\<날짜_시각>\` 에 복사
   (같은 이름이 있으면 `-2`, `-3` 을 붙여 기존 백업을 덮어쓰지 않음)
3. Spicetify 가 보관 중인 Spotify 원본(`Backup\*.spa`)을 버전별로 한 번만 `backups\spotify-original\` 에 복사
4. `color.ini`, `user.css`, `theme.js` 를 `Themes\CupertinoMusic` 에 복사
5. `current_theme`, `color_scheme`, `inject_css`, `replace_colors` 네 값만 변경
   (`theme.js` 가 있으면 `inject_theme_js` 도 1. `extensions`, `custom_apps` 와 나머지 설정은 건드리지 않음)
6. `spicetify apply` 실행 → Spotify 가 재시작됨

옵션: `-NoRestart`(재시작 안 함), `-NoApply`(파일·설정까지만), `-RefreshBackup`(Spotify 업데이트로 원본 백업 버전이 달라졌을 때 `spicetify restore backup` 후 진행).

## macOS 에 적용

이 테마의 CSS 와 `theme.js` 는 macOS Spotify 데스크톱에서도 그대로 씁니다.
창 버튼 높이 보정은 `spotify__os--is-windows` 일 때만 동작하므로, 맥의 신호등 버튼은 건드리지 않습니다.
아래 절차는 이 Windows PC 에서 실행해 보지 않았습니다.

1. [Spotify 데스크톱](https://www.spotify.com/download/mac/) 을 설치합니다. Mac App Store 판은 Spicetify 가 고칠 수 없습니다.
2. [Spicetify](https://spicetify.app/docs/advanced-usage/installation/) 를 설치한 뒤, 터미널에서 한 번 실행합니다.

```bash
spicetify backup apply
```

3. 이 저장소를 받아 테마를 적용합니다. 지금 Windows 에 켜 둔 것과 같은 스킴은 Dark 입니다.

```bash
git clone https://github.com/kimtw622/CupertinoMusic.git
cd CupertinoMusic
chmod +x scripts/install.sh
./scripts/install.sh          # Dark
./scripts/install.sh Light    # Light
```

`install.sh` 는 `color.ini`, `user.css`, `theme.js` 만 `~/.config/spicetify/Themes/CupertinoMusic` 에 복사하고, 테마 관련 설정만 바꾼 뒤 `spicetify apply` 를 실행합니다. 확장 프로그램과 사용자 정의 앱 목록은 바꾸지 않습니다.

지금 재생 중 화면(원형 커버·스펙트럼)은 ivLyrics 가사 화면에서만 나옵니다. 테마 자체는 ivLyrics 없이 동작합니다. Marketplace 에 다른 테마가 설치 목록으로 남아 있으면 그 CSS 가 위에 덮일 수 있으니, 설치 목록에서 제거하세요.

## Light / Dark 전환

```powershell
.\scripts\install.ps1 -Scheme Light
.\scripts\install.ps1 -Scheme Dark
```

또는 직접:

```powershell
spicetify config color_scheme Light
spicetify apply
```

색은 모두 `color.ini` 에 있습니다. 포인트색을 바꾸려면 `button`, `button-active`, `accent-text`(작은 글자용), `accent-solid`(흰 글자가 올라가는 버튼 배경)를 함께 바꾸세요.

## 재생 중인 커버의 색조

재생 중인 곡의 커버에서 뽑은 색을 **재생바(16%)·사이드바(9%)·오른쪽 패널(9%)** 배경에 옅게 섞습니다.
상단 바는 사이드바와 같은 표면을 써서 사이드바와 같은 색으로 함께 바뀝니다(2026-10-07).
포인트색(붉은색)과 글자색은 바뀌지 않습니다. 곡이 바뀌면 0.42초에 걸쳐 색이 넘어갑니다.

- `theme.js` 가 Spotify 내부 GraphQL(`fetchExtractedColors`)로 커버색을 받아 채도·밝기를 정해진 범위로 다듬은 뒤
  `html.cm-tinted` 클래스와 `--cm-tint` 변수를 설정합니다. 칠하기는 `user.css` 22번 섹션이 합니다.
- 색조 쪽은 외부 서비스 호출, 이미지 분석, DOM 변경, 반복 polling 이 없습니다.
- 무채색 커버·로컬 파일·색을 못 받은 경우에는 색조를 넣지 않고 기본 표면색을 씁니다.
- 끄려면 프로젝트의 `theme.js` 를 지우고 `install.ps1` 을 다시 실행합니다(아래 칩 이름 정리도 함께 꺼집니다). 세기를 바꾸려면 22번 섹션의 퍼센트를 고칩니다.
- Spicetify 가 제공하는 `Spicetify.colorExtractor` 는 이 Spotify 버전에서 503 으로 실패해 쓰지 않습니다(대체 경로로만 남김).

### 필터 칩 이름의 `<br/>` 정리 (2026-10-09)

- 증상: "신곡 레이더" 플레이리스트의 첫 필터 칩이 `새로운 아티스트를<br/>발견하세요` 로 보였습니다.
- 원인: 테마가 아니라 Spotify 입니다. 그 문구는 앱의 한국어 문자열 파일에 없고 서버에서 내려오며, 칩의 텍스트 노드에 `<br/>` 가 글자로 들어 있습니다(실제 DOM 에서 확인). CSS 는 텍스트 노드의 글자를 만들거나 바꾸지 못하고 그때의 `theme.js` 는 화면을 고치지 않았으므로 테마가 만든 글자가 아닙니다(테마를 끈 상태의 화면을 직접 보지는 않았습니다).
- 처리: 글자는 CSS 로 바꿀 수 없어 `theme.js` 가 칩(`data-encore-id="chip"`) 안의 텍스트에서만 그 태그를 공백으로 바꿉니다. 요소를 만들거나 옮기지 않고, 칩이 아닌 곳의 글자는 건드리지 않습니다.
- 칩은 화면이 바뀔 때마다 새로 그려지므로 `MutationObserver` 하나로 새로 붙는 노드만 봅니다(주기적 polling 없음). `theme.js` 가 Spotify 의 글자를 고치는 곳은 이것 하나입니다.
- Spotify 가 문구를 고치면 이 코드는 아무 일도 하지 않습니다. 칩의 `data-encore-id="chip"` 표식이 바뀌면 정리가 멈추고 원래 글자가 다시 보입니다.

## 앱 전체 커버 배경 (2026-10-10)

재생 중인 곡의 커버를 앱 전체 뒤에 흐리게 깔고, 본문·사이드바·상단 바·오른쪽 패널·재생바를 반투명으로 바꿔 비치게 합니다.
곡이 바뀌면 화면 전체의 분위기가 함께 바뀝니다. 이 기능이 켜져 있는 동안에는 위의 옅은 색조 대신 이 배경이 색을 냅니다.

- `theme.js` 가 커버를 미리 받은 뒤 `html.cm-cover` 클래스와 `--cm-cover-url` 을 넘기고, `user.css` 24번 섹션이 칠합니다.
  이미지는 Spotify 가 원래 커버를 받아 오는 곳(`i.scdn.co`)의 300px 짜리입니다. 새 외부 의존성은 없습니다.
- 글자 대비: 커버가 밝을수록 배경을 더 어둡게 누릅니다(`--cm-bd-dim` 0.32~0.52). 색이 있는 배경 위라 보조 글자색도 한 단계 밝힙니다.
  밝은 주황·파랑 커버에서 보조 글자 대비가 약 4.1:1 로 재어져서 넣은 조정이고, 조정 뒤의 대비는 다시 재지 않았습니다.
- 메뉴·모달·툴팁은 불투명한 그대로입니다.
- 끄려면 `theme.js` 맨 위의 `ENABLE_BACKDROP` 을 `false` 로 바꾸고 `install.ps1` 을 다시 실행합니다. 그러면 예전의 옅은 색조로 돌아갑니다.
  세기는 24번 섹션의 `blur(76px)`, 표면 불투명도(0.34~0.54)로 조절합니다.
- 로컬 파일·광고처럼 커버를 받을 수 없는 항목에서는 꺼지고 기본 표면색이 쓰입니다.

## 지금 재생 중 화면 (ivLyrics 가사 화면, 2026-10-10)

ivLyrics 가사 화면(`/ivLyrics`)에 있을 때 왼쪽에 "지금 재생 중" 제목, 원형 커버, 곡 제목·아티스트·앨범, 커버 둘레의 스펙트럼을 얹고 가사를 오른쪽으로 밉니다.
가사·배경·도구 모음은 ivLyrics 가 그대로 그립니다(가사 번역도 그대로). ivLyrics 의 설정이나 파일은 건드리지 않았습니다.

- **스펙트럼은 실제 소리를 분석한 것이 아닙니다.** Spotify 는 재생 중인 소리에 접근을 막습니다.
  Spotify 가 곡마다 가진 분석 자료(구간별 음높이 12개·음량·박자, `Spicetify.getAudioData`)를 재생 위치에 맞춰 읽어 막대로 옮긴 흉내입니다.
  박자와 음량 변화는 따라가지만 실제 주파수 분포와는 다릅니다. 분석 자료가 없는 항목(팟캐스트·로컬 파일)에서는 막대가 나오지 않습니다.
- 화면이 보이고 재생 중일 때만 그립니다. 창이 가려지거나 일시정지하면 막대가 내려온 뒤 그리기를 멈춥니다.
  Windows 의 "애니메이션 효과" 를 끈 경우(모션 줄이기)에는 스펙트럼과 커버 회전이 모두 꺼집니다.
- 커버는 재생 중에 40초에 한 바퀴 돕니다. 멈추려면 `user.css` 25번 섹션의 `animation` 줄을 지웁니다.
- 얹은 요소는 클릭을 가로채지 않습니다(`pointer-events: none`). ivLyrics 의 싱크 조절·도구 모음은 그대로 눌립니다.
- 가사 칸이 좁아져서 이 화면에서는 가사 줄 크기를 30px 로 고정합니다(ivLyrics 설정값 대신). 바꾸려면 25번 섹션의 `--cm-np-lyric-size`.
- 메인 뷰가 880px 보다 좁으면 얹지 않고 원래 가사 화면 그대로 둡니다.
- Spotify 기본 가사 화면(`/lyrics`)과 ivLyrics 전체화면에는 적용하지 않습니다.
- 끄려면 `theme.js` 맨 위의 `ENABLE_NOW_PLAYING` 을 `false` 로 바꾸고 `install.ps1` 을 다시 실행합니다.
- 방향을 고를 때 만든 샘플(실제 화면에 미리보기를 얹어 찍은 것)은 `docs/samples/` 에 있습니다. 고른 것은 B(원형 디스크)와 C(전체 배경)입니다.

## 창 버튼 높이 (Windows, 2026-10-10)

- 증상: 최소화·최대화·닫기 버튼이 상단 바의 다른 아이콘보다 아래로 내려가 보였습니다.
- 원인: 테마입니다. 창 버튼은 Spotify 가 직접 그리며 높이 64px 자리의 가운데에 놓이는데, 테마가 상단 바를 52px 로 줄여서 버튼이 바 가운데보다 6px 아래에 있었습니다(실제 창 실측: 버튼 중심 60, 바 중심 48.75 물리 픽셀).
- 처리: `theme.js` 가 Spotify 가 스스로 쓰는 `Spicetify.Platform.ControlMessageAPI.setTitlebarHeight` 로 그 자리 높이를 상단 바 높이에 맞춥니다.
  Spotify 가 시작 직후와 확대/축소를 바꿀 때 기본값을 다시 넣으므로, 시작 후 0·1.5·5초와 창 크기가 바뀐 뒤에 다시 맞춥니다.
  맞춘 높이는 `--cm-titlebar-height` 로 넘겨 `user.css` 5번의 창 버튼 자리 밝기 보정도 같은 높이를 씁니다(안 그러면 바 아래에 밝은 띠가 남습니다).
- `theme.js` 를 지우면 Spotify 기본 높이(64px)로 돌아가 버튼이 다시 아래로 내려갑니다. 그 API 가 없는 버전에서는 아무 일도 하지 않습니다.

## 떠 있는 유리 재생바 (캡슐, 2026-10-10)

하단 재생바는 창 가장자리에서 12px 띄운 둥근 유리 캡슐입니다(표면색 72% + 배경 흐림, 모서리 22px).
사이드바·본문·오른쪽 패널이 창 맨 아래까지 내려가고 캡슐이 그 위에 떠서, 아래로 지나가는 내용이 캡슐에 흐리게 비칩니다.
재생바 안의 버튼·진행바·볼륨은 Spotify 그대로이고 위치만 캡슐 안입니다.

- 캡슐 둘레의 빈 곳은 클릭이 아래 화면으로 통과합니다(재생바 줄에 `pointer-events: none`, 캡슐에만 다시 켬).
- 스크롤되는 곳(본문의 일반 페이지, 사이드바, 오른쪽 패널)은 끝에 112px 여백을 두어 마지막 줄이 캡슐 위로 올라옵니다(`--cm-playbar-space`).
- 가사 화면·ivLyrics 처럼 화면 아래에 조작부를 고정해 두는 페이지는 내용 상자가 캡슐 12px 위에서 끝나 버튼이 가려지지 않습니다(`--cm-playbar-row` 97px = 캡슐 73 + 위아래 간격 12×2).
- 간격·둥글기는 `user.css` 맨 위 토큰 `--cm-capsule-gap`, `--cm-capsule-radius`, 유리 농도는 23번 섹션의 `72%`(낮출수록 투명)와 `blur(30px)` 로 조절합니다.
  23번 섹션을 통째로 지우면 창 폭 전체를 쓰는 불투명 재생바로 돌아갑니다.
- `backdrop-filter` 나 `:has()` 를 지원하지 않는 환경에서는 이 섹션이 적용되지 않고 불투명 재생바가 쓰입니다.
- 방향을 고를 때 만든 샘플은 `docs/samples/P1`~`P3` 입니다. 고른 것은 P2(캡슐 + 커버 색)입니다.

### 재생바의 커버 색

커버에서 색조를 받았을 때(`html.cm-tinted`) 재생 버튼이 그 색으로 채운 원이 되고, 진행바와 볼륨바의 채워진 부분도 같은 색이 됩니다(`user.css` 26번).
무채색 커버처럼 색조가 없을 때는 예전 모습(아이콘만 있는 재생 버튼, 회색 진행바)입니다.
끄려면 26번 섹션을 지웁니다.

## Apple Music 식 화면 (홈 · 플레이리스트 · 앨범 · 아티스트)

2026-10-07 에 추가했습니다. Spotify 의 DOM 과 배치는 그대로 두고 CSS 로만 모양을 바꿉니다.

- **홈**: 맨 위에 큰 페이지 제목("홈"), 선반 제목 뒤에 꺾쇠(›)를 붙이고 오른쪽의 "모두 표시" 는 숨김(제목이 같은 곳으로 가는 링크일 때만),
  카드는 hover 때 상자 대신 커버만 살짝 어두워지고 제목은 보통 굵기, 아티스트(원형) 카드는 이름이 가운데 정렬,
  스크롤하면 위에 붙는 필터 줄은 추출색 대신 본문색 반투명 + 구분선. (`user.css` 08번)
- **재생 버튼 줄**(플레이리스트·앨범·아티스트 공통): 둥근 재생 버튼 → 글자가 붙은 포인트색 버튼("재생" / "일시 정지"),
  셔플 아이콘 → 같은 크기의 옅은 버튼("셔플", 켜지면 포인트색). 둘을 맨 앞에 나란히 두고 나머지 아이콘은 32 → 24px.
  팔로우 버튼은 테두리 대신 같은 높이의 옅은 면. (09번)
- **곡 목록**: 한 줄 걸러 옅은 띠. 행 높이와 DOM 은 그대로입니다. (10번)
- **아티스트**: 큰 사진 위의 이름을 32 → 48px.

글자 버튼의 문구는 `aria-label` 로 고르며 한국어와 영어만 넣어 두었습니다. 큰 제목은 한국어면 "홈", 아니면 "Home" 입니다.
되돌리려면 해당 블록(08번 "큰 페이지 제목"·"선반 제목", 09번 "재생 버튼 줄", 10번 "한 줄 걸러 옅은 띠", 21번의 두 블록)을 지우고 `install.ps1` 을 다시 실행합니다.

## 이전 테마로 복구

```powershell
.\scripts\restore.ps1 -List           # 복구 지점 목록
.\scripts\restore.ps1                 # CupertinoMusic 설치 직전 상태(Sleek / RosePine)로
.\scripts\restore.ps1 -RemoveTheme    # 되돌린 뒤 Themes\CupertinoMusic 폴더도 삭제
.\scripts\restore.ps1 -Backup 2026-10-05_010711 -RestoreFiles   # 그 설치 직전의 CupertinoMusic 파일로
```

`restore.ps1` 은 테마 관련 설정 여섯 개(`current_theme`, `color_scheme`, `inject_css`, `replace_colors`, `inject_theme_js`, `overwrite_assets`)만 되돌리고 `spicetify apply` 를 실행합니다.
Spicetify 자체, 확장 프로그램, Marketplace, 스니펫은 그대로 둡니다.

- 기본 동작은 설정 값 되돌리기입니다. 되돌릴 테마의 폴더가 이미 있으면 파일은 건드리지 않습니다.
  그래서 CupertinoMusic 이 대상인 백업을 골라도 지금 설치된 `color.ini`·`user.css`·`theme.js` 가 그대로 쓰입니다.
- `-RestoreFiles` 를 붙이면 테마 폴더를 그 백업에 들어 있는 파일로 바꿉니다. 바꾸기 전의 폴더는 `backups\before-restore\<시각>\` 에 보관합니다.
  백업에는 "그 설치를 실행하기 직전"의 파일이 들어 있습니다. 프로젝트 폴더의 파일은 바뀌지 않으므로 `install.ps1` 을 다시 실행하면 프로젝트의 파일이 다시 적용됩니다.
- 테마를 쓰지 않던 상태(빈 `current_theme`)에서 설치했다면 그 빈 값으로 되돌립니다.
- `-NoApply` 는 설정(과 파일)까지만 되돌리고 `spicetify apply` 는 하지 않습니다. `-RemoveTheme` 는 되돌릴 대상이 CupertinoMusic 인 백업에는 쓸 수 없습니다.
Spicetify 커스터마이징 전체를 걷어내는 것은 별개의 작업이며 `spicetify restore` 를 사용합니다.

## 백업

| 위치 | 내용 |
| --- | --- |
| `backups\user-settings\2026-10-04_222640\` | **작업 전** 설정 파일, `Themes\Sleek`, `Themes\marketplace` (기본 복구 지점) |
| `backups\user-settings\<이후 시각>\` | `install.ps1` 을 실행할 때마다 생기는 그 시점의 설정·테마 사본 |
| `backups\before-restore\<시각>\` | `restore.ps1 -RestoreFiles` 가 덮어쓰기 전에 남기는 테마 폴더 사본 (실행한 적이 있을 때만 생김) |
| `backups\spotify-original\1.2.96.518.g366879e1\` | Spicetify 가 보관하던 Spotify 원본 `xpui.spa`, `login.spa` + SHA256 |
| `backups\marketplace\marketplace-settings-2026-10-04_before-theme-unregister.json` | Marketplace 설정 전체(변경 전), Marketplace 가져오기 형식 |

계정 토큰·인증 정보는 백업에 넣지 않았습니다. Spotify 의 `prefs` 파일은 복사하지 않습니다.

## 이 PC 에서 처리한 충돌

### Marketplace 의 "설치된 테마" 기록 (해제함)

- 증상: Marketplace 화면을 열면 예전 테마(Sleek + Cherry 색상표)가 CupertinoMusic 위에 덧씌워졌습니다.
- 원인: Marketplace 가 Sleek 을 "설치된 테마"로 기억하고 있었고, "설치 목록" 탭의 카드가 열릴 때마다 그 테마의 CSS 를 다시 주입하며 `user.css` 링크를 제거합니다. `current_theme` 이 `marketplace` 가 아니어도 실행됩니다.
- 처리: Marketplace 설정 전체를 위 JSON 으로 내보낸 뒤, Marketplace 의 "테마 제거" 버튼이 지우는 것과 같은 세 항목만 해제했습니다
  (`marketplace:theme-installed`, `marketplace:installed:spicetify/spicetify-themes/Sleek/user.css`, `marketplace:installed-themes` 목록의 해당 항목).
  스니펫 2개와 나머지 Marketplace 설정은 그대로입니다. `Themes\Sleek` 폴더도 그대로라 `restore.ps1` 로 예전 모습에 돌아갈 수 있습니다.
- 되돌리기: Marketplace 설정(톱니바퀴)의 백업/복원에서 위 JSON 내용을 가져오면 됩니다. 이 경로는 직접 실행해 보지 않았습니다(미검증).
- 다른 PC 에 설치할 때 같은 증상이 나오면 Marketplace → 설치 목록에서 해당 테마를 제거하세요.

### Marketplace 스니펫 (그대로 둠)

| 스니펫 | 영향 | 테마 쪽 대응 |
| --- | --- | --- |
| New Hover Panel | 사이드바를 화면 왼쪽 밖에 숨겼다가 hover 때 꺼냄. 배경을 검정으로 고정 | 동작은 유지, 표면색만 테마의 사이드바색으로 맞춤 (`user.css` 20번 섹션) |
| Sonic Dancing | 재생 진행바 위에 GIF 표시 | 손대지 않음 |

New Hover Panel 을 끄면 사이드바가 창 맨 위까지 올라간 일반 레이아웃이 됩니다(이 상태의 크기 조절·접기도 확인했습니다).
스니펫을 끄려면 Marketplace → 설치 목록에서 제거하면 됩니다.

## 실제로 확인한 것

Spotify 를 로컬 디버깅 포트(`127.0.0.1:9222`)로 띄워 실제 앱의 DOM·계산 스타일·화면을 직접 읽었습니다.
별도 목업이나 웹 페이지가 아니라 실제 Spotify 창의 캡처입니다(`docs/screenshots/`).

**`spicetify apply` 로 적용한 Dark 에서 확인**

- 화면: 홈, 검색(둘러보기), 검색 추천 목록과 결과, 좋아요 표시한 곡, 플레이리스트(색 헤더·사진 헤더), 앨범, 아티스트, 설정, 가사, Marketplace 화면
- 겹침 요소: 대기열 패널, 지금 재생 중 패널, 우클릭 메뉴, 프로필 메뉴, 정렬 드롭다운, 모달(Spicetify PopupModal), 접힌 사이드바 항목의 툴팁(제목·부제 대비 12.8:1 / 5.4:1)
- 재생바: 재생/일시정지 전환, 진행바 클릭 탐색, 볼륨바 클릭, 셔플·이전·다음·반복·대기열·기기 연결·미니플레이어·음소거 버튼이 가려지지 않고 32×32px 클릭 영역 유지
- 검색: 입력 → 추천 목록 → Enter → 결과
- 곡 목록: 행 높이 56px 유지, 휠 스크롤 시 가상 스크롤로 새 행 로드, 클릭 선택, ↓ 이동, Shift+↓ 다중 선택, hover 와 선택 배경 구분, 우클릭 메뉴
- 키보드: Tab 이동 시 포커스 표시 활성
- 사이드바(스니펫을 그 세션에서만 임시로 끈 상태): 마우스 드래그 크기 조절, 접기/펼치기, 창 드래그 영역에서 머리글 버튼 제외(`-webkit-app-region: no-drag`)
- 창 크기: 1280×720, 1920×1080 에서 상단 바·재생바 겹침과 가로 넘침 없음
- 커버 색조(2026-10-05): 콜드 스타트 직후 자동 적용, 다른 앨범의 곡으로 넘기면 색이 바뀌고 같은 앨범에서는 유지, 원래 곡으로 돌아오면 원래 색으로 복귀(`docs/screenshots/14-dark-cover-tint.png`)
- 유리 재생바(2026-10-05): 홈·설정에서 본문이 재생바 아래로 지나가고, 앨범·설정을 끝까지 스크롤하면 마지막 내용이 재생바 위(753px, 재생바 상단 777px)에서 끝남. 가사 화면과 ivLyrics 화면은 재생바 위에서 끝남. 재생바 버튼·진행바 클릭 대상 유지
- 선택자: `user.css` 의 클래스 162개·id 3개·data 속성 11개가 모두 이 Spotify 빌드에 실제로 존재(자동 대조)
- New Hover Panel 스니펫이 켜진 상태의 hover 패널: 테마의 사이드바색으로 표시됨(`docs/screenshots/11-dark-1280x720.png`)
- 앨범·플레이리스트 헤더 축소(2026-10-05 외부 리뷰 반영): 커버 232→192px, 헤더 276→240px, 재생 버튼 줄 104→88px, 첫 곡 위치 485→432px(창 1491×849 기준), 행 높이 56px 그대로. 좋아요 표시한 곡·팟캐스트 쇼·프로필 화면에서도 내용이 헤더 밖으로 나가지 않음. 1280×720·1000×700 에뮬레이션에서 세 줄 제목이 잘리지 않음. 글자 영역이 커버보다 길면 헤더가 따라 늘어남(`docs/screenshots/16-dark-album-compact-header.png`. `03-dark-album.png` 은 바꾸기 전 모습)
- 제목 크기(같은 날): 곡 제목과 카드 제목 14px, 아티스트·설명 등 보조 정보 13px
- 상단 바 색조(2026-10-07): 상단 바가 사이드바 머리 부분과 같은 색(실측 둘 다 `rgb(49,35,37)`)으로 칠해지고 아래쪽에 구분선이 생김. 창 버튼 자리의 어두운 상자(바꾸기 전 `rgb(11,11,12)`, 252×120 물리 픽셀)가 사라져 상단 바 끝까지 같은 색. 디버깅 포트 캡처에는 창 버튼이 찍히지 않아 실제 창을 `PrintWindow` 로 캡처해 확인(`docs/screenshots/17-dark-topbar-tint.png`)
- Apple Music 식 화면(2026-10-07): 같은 `user.css` 를 실행 중인 Spotify 에 주입해 홈(맨 위·스크롤)·플레이리스트(일반·라디오)·앨범·아티스트를 캡처(`docs/screenshots/18`~`21`). 재생 버튼 글자가 재생 상태에 따라 "재생"/"일시 정지" 로 바뀌고, 셔플이 꺼짐(일반 글자색)·켜짐(포인트색)으로 구분되며, 원형 카드의 이름·보조 글자 중심이 커버 중심과 일치(1175px), 사각 카드는 왼쪽 정렬 유지, 스크롤 시 필터 줄 활성 상태는 주입 전후 동일. `spicetify apply` 뒤에는 실제 창 캡처로 홈 화면만 확인(큰 제목·꺾쇠·창 버튼 자리). 18~21번 캡처의 오른쪽 위 밝은 상자는 디버깅 포트 캡처에 창 버튼 덮개가 안 찍혀 보정만 보이는 것으로, 실제 화면에는 없음
- 필터 칩 이름 정리(2026-10-09): `spicetify apply` 뒤 콜드 스타트에서 "신곡 레이더" 첫 칩이 "새로운 아티스트를 발견하세요"로 표시되고 화면 전체에 `<br/>` 글자가 남지 않음. 칩을 눌러 필터를 켰다 꺼도, 다른 화면에 갔다 돌아와도 유지. 칩 밖에 붙인 시험용 글자(`probe<br/>outside-chip`)는 바뀌지 않음. 커버 색조도 그대로 동작(`docs/screenshots/22-dark-chip-label-fixed.png`)
- 앱 전체 커버 배경(2026-10-10): `spicetify apply` 뒤 디버깅 포트 없이 새로 켠 실제 창을 `PrintWindow` 로 캡처. 홈 화면에 흐린 커버 배경이 깔리고 창 버튼 자리·재생바·오른쪽 패널이 정상(`docs/screenshots/23-applied-cold-start.png`)
- 지금 재생 중 화면(같은 날, 같은 방식): 적용 뒤 사용자가 연 ivLyrics 가사 화면을 실제 창으로 캡처. "지금 재생 중" 제목·원형 커버·둘레 막대·제목/아티스트/앨범이 왼쪽에, 가사와 번역이 오른쪽에 표시됨. 0.9초 간격 두 장에서 커버 주변이 달라져 회전·막대가 움직이는 중임을 확인(`docs/screenshots/26-applied-now-playing.png`)
- 창 버튼 높이(같은 날): 적용 뒤 디버깅 포트 없이 새로 켠 실제 창에서 버튼 중심이 60 → 49 물리 픽셀(상단 바 중심 48.75)로 올라와 알림·친구·프로필 아이콘과 같은 높이. 버튼 자리 경계에서 밝기가 튀지 않고(17.6 → 18.4, 배경의 완만한 변화) 바 아래에 띠가 남지 않음(`docs/screenshots/27-window-buttons-aligned-crop.png`)
- 캡슐 재생바와 커버 색(같은 날): 적용 뒤 디버깅 포트 없이 새로 켠 실제 창 캡처에서 캡슐이 12px 떠 있고 홈 내용·사이드바·오른쪽 패널이 그 뒤로 이어지며, 재생 버튼이 커버 색 원으로 표시됨(`docs/screenshots/28-applied-capsule-playbar.png`)

**격리 환경에서 확인 (실제 Spotify 에는 적용하지 않음)**

- `restore.ps1`: 설정 파일과 테마 폴더의 임시 사본(`SPICETIFY_CONFIG`)을 대상으로 `-NoApply` 로 실행. PowerShell 7 과 Windows PowerShell 5.1 양쪽에서
  목록, 기본 복구(Sleek 폴더 되살리기 포함), CupertinoMusic 백업 선택 시 파일 유지, `-RestoreFiles` 의 파일 교체와 이전 폴더 보관, 빈 테마 값 복원, `-RemoveTheme` 와 그 차단 조건이 기대대로 동작
- `theme.js`: 재주입으로 교체된 이전 인스턴스의 요청이 늦게 실패해도 새 인스턴스의 색조가 유지됨. 같은 인스턴스의 지난 요청 실패는 무시되고, 현재 요청이 실패하면 색조를 떼어 냄(Node 로 만든 모의 환경)

**미리보기 주입으로만 확인**

- Light 스킴: 같은 `color.ini`·`user.css` 를 실행 중인 Spotify 에 주입해 홈·플레이리스트·앨범·아티스트·검색·좋아요·설정·가사를 캡처하고 글자 대비를 자동 점검했습니다. `spicetify apply` 로 Light 를 적용한 상태는 확인하지 않았습니다.
- 지금 재생 중 화면(2026-10-10): 적용한 것과 같은 `theme.js`·`user.css` 를 실행 중인 Spotify 에 얹은 상태로 확인. `/ivLyrics` 에서 원형 커버·제목·가사 2단 배치, 재생 중 스펙트럼이 실제로 움직임(0.25초 간격 5회 표본이 모두 다름, 화면 갱신 초당 약 74회), 커버 회전 동작, 곡이 바뀌면 커버·제목·배경이 함께 바뀜, 문서 넘침 없음(`docs/screenshots/24-now-playing-preview.png`)
- 앱 전체 커버 배경(같은 날, 같은 방식): 홈·좋아요 표시한 곡·검색·설정에서 넓은 면을 불투명하게 덮는 요소가 남지 않음(`docs/screenshots/25-backdrop-settings-preview.png`). 앨범·아티스트 화면은 캡처 시점에 화면이 가사로 돌아가 있어 보지 못함
- 캡슐 재생바(같은 날, 같은 방식): 재생/이전/다음/셔플/반복/대기열 버튼과 진행바·커버가 가운데 지점에서 실제로 눌리는 요소로 잡힘(32×32px), 캡슐 아래·옆의 빈 곳은 아래 화면이 잡힘, 설정 화면·사이드바·오른쪽 패널을 끝까지 내리면 마지막 내용이 캡슐 위(737·733·729px, 캡슐 상단 764px)에서 끝남, 가사 화면의 싱크 조절·도구 모음·가사 제공자 표시가 캡슐 위(736·736·712px)에서 끝남, 재생 버튼 아이콘 대비 약 6.4:1

## 확인하지 못한 것

- Windows 배율 100% / 125% 실제 전환. 1280×720 에서 배율 1, 1.25, 1.5 를 Chromium 화면 에뮬레이션으로만 확인했습니다. 실제 창은 배율 1.875 한 가지입니다.
- 드래그 앤 드롭(곡을 플레이리스트로 끌기, 순서 바꾸기). `draggable` 속성이 유지되는 것만 확인했습니다.
- 사이드바 머리글 버튼의 실제 마우스 클릭. 드래그 영역 제외는 계산 스타일로만 확인했습니다(디버깅 포트 입력은 OS 창 히트 테스트를 거치지 않음).
- 재생 중 표시(이퀄라이저) 색 교체는 계산 스타일로만 확인했고 화면 캡처로는 보지 못했습니다.
- 커버 색조는 Dark 에서만 확인했습니다. Light 는 밝기 범위를 따로 잡아 두었지만 화면으로 보지 않았습니다. 팟캐스트·로컬 파일 재생 중의 동작도 확인하지 않았습니다.
- Apple Music 식 화면: 적용(apply) 뒤의 플레이리스트·앨범·아티스트 화면(주입 상태로만 확인), Light 스킴, 좁은 창에서 재생 버튼 줄이 넘칠 때의 모습, 팟캐스트 쇼·프로필·좋아요 표시한 곡의 재생 버튼 줄, 스마트 셔플이 켜진 상태, 영어 UI 의 문구, 재생 버튼 줄의 실제 마우스 클릭·Tab 이동.
- 창 버튼 자리 보정은 Dark · 확대/축소 100% 에서만 봤습니다. 다른 배율(폭을 `--zoom-level` 로 나누는 계산), 전체 화면(보정이 꺼지는지), Light 스킴은 확인하지 않았습니다.
- 팟캐스트·오디오북 화면, 기기 선택 패널, 친구 활동, 전체 화면 재생, 미니플레이어 창, 다운로드/오프라인 상태, 플레이리스트 편집 모달의 실제 모습.
- `install.ps1` 의 원본 백업 없음 / 버전 불일치 분기(`-RefreshBackup`), `-NoApply`.
- `restore.ps1` 로 실제 Spotify 를 되돌리는 것. 설정·파일 단계는 격리 환경에서 확인했지만 마지막 `spicetify apply` 단계와 그 뒤의 화면은 실행해 보지 않았습니다.
- 축소한 헤더에서 설명이 긴 플레이리스트의 실제 모습(헤더가 늘어나는 것은 시험용 블록으로만 확인), Light 스킴에서의 모습.
- 디버깅 포트 없이 다시 띄운 마지막 실행의 화면. 프로세스 실행, 창 제목, 적용된 `user.css` 해시 일치, 디버깅 포트 닫힘만 확인했습니다(같은 파일로 디버깅 포트 콜드 스타트는 확인).
- 지금 재생 중 화면: 일시정지·탐색(되감기) 때의 막대 동작, 가사가 없는 곡·비동기 가사·팟캐스트, 좁은 창에서 얹지 않는 분기, 모션 줄이기 설정, 영어 UI 의 제목.
- 앱 전체 커버 배경: 앨범·아티스트·플레이리스트 화면의 실제 모습, 보조 글자를 밝힌 뒤의 대비 수치, 아주 밝은(흰색) 커버, 곡이 바뀔 때 배경이 넘어가는 모습, 스크롤 중 프레임 저하 여부, Light 스킴.
- 캡슐 재생바: 대기열·기기 선택·친구 활동 패널의 스크롤 끝, 다른 기기에서 재생 중일 때 뜨는 초록 연결 띠, 사이드바를 펼친 상태와 New Hover Panel 의 hover 패널, 좁은 창(재생바 최소 폭 620px 근처), Spotify 기본 가사 화면과 Marketplace 화면의 끝, 실제 마우스 클릭(가운데 지점의 요소로만 확인), 적용 뒤의 가사 화면, Light 스킴.
- 창 버튼 높이: 확대/축소 100% 이외의 배율(높이에 배율을 곱하는 계산), 확대/축소를 바꾼 직후 다시 맞춰지는지, 창 위쪽 드래그 영역이 함께 줄었는지, 전체 화면을 오갔을 때.
- macOS, Linux, 한국어 이외의 UI 언어.

## 알려진 제한

- ivLyrics(사용자 정의 앱)의 패널과 버튼은 자체 스타일을 씁니다. 테마가 건드리지 않습니다.
- Spotify 기본 가사 화면의 배경색·글자색은 곡마다 Spotify 가 정한 값을 그대로 씁니다.
- 지금 재생 중 패널의 캔버스(움직이는 배경) 위에는 배경색 기준의 옅은 덮개를 씌웁니다. 밝은 캔버스에서는 Light 스킴의 제목 대비가 낮을 수 있습니다.
- 프롬프트/믹스 플레이리스트에서 재생 버튼을 감싸던 장식 링은 숨깁니다(재생 버튼이 긴 버튼이 되면서 맞지 않음).
- 재생·셔플 버튼의 글자는 한국어·영어 `aria-label` 에만 맞춰 두었습니다. 다른 언어에서는 재생은 아이콘만 든 긴 버튼, 셔플은 원래 아이콘 버튼으로 나옵니다. Spotify 가 문구를 바꿔도 같은 식으로 글자만 빠집니다.
- 선반의 "모두 표시" 는 제목 링크와 같은 곳으로 간다고 보고 숨깁니다. 둘의 목적지가 다른 선반이 있다면 그 링크는 화면에서 갈 수 없습니다(확인한 선반은 모두 같았습니다).
- Spotify 를 실행한 채 `-NoRestart` 로 적용한 직후 첫 실행에서 "문제가 발생했습니다 / 페이지 재로드하기" 화면이 한 번 나온 적이 있습니다. 이후에는 재현되지 않았습니다(같은 방식의 적용 2회, 적용 없는 재시작 2회 모두 정상). 원인은 확인하지 못했습니다. 나오면 재로드 버튼을 누르거나 Spotify 를 다시 실행하세요.
- 이 PC 의 Marketplace 는 현재 테마가 `marketplace` 가 아니면 시작할 때 알림을 띄우려다 콘솔 오류(`enqueueSnackbar called with invalid argument`)를 냅니다. 테마와 무관하게 이전(Sleek)부터 있던 동작이며 화면에는 영향이 없습니다.

## Spotify 업데이트 후 확인할 것

이 PC 에는 Spotify 가 업데이트되면 `spicetify restore backup apply` 를 다시 실행하는 자동 재적용(`%LOCALAPPDATA%\spicetify\auto-apply*.ps1`)이 이미 있습니다. 테마 설정은 그대로 유지됩니다. 업데이트 뒤에는:

1. `user.css` **21번 섹션**부터 확인합니다. Encore 클래스는 `e-10451-…` 처럼 버전 접두사가 붙어 업데이트마다 바뀝니다. 이 테마는 접두사를 피해 `[class*="form-input-icon__icon"]` 같은 부분 일치와 `data-encore-id` 만 씁니다.
2. 검색창 높이(36px)와 아이콘 정렬, 사이드바 크기 조절 손잡이(9px), 재생 진행바 색을 확인합니다. 각각 Spotify 가 노출한 변수(`--encore-control-size-base`, `--panel-gap`, `--bg-color`/`--fg-color`)에 기대고 있습니다.
3. 밝은 스킴에서 글자가 사라진 곳이 없는지 봅니다. Spotify 가 흰색을 고정값(`#ffffffb3` 등)으로 쓰는 곳은 `user.css` 에 따로 덮어썼습니다(메뉴, 필터 입력, 헤더 보조 글자, 진행바).
4. 창 오른쪽 위 버튼 자리가 주변보다 **밝게** 뜨면 `user.css` 5번 섹션의 "창 버튼 자리" 블록을 지웁니다. Spotify 가 그 자리를 반투명 검정으로 덮는다는 전제로 미리 밝혀 두는 보정이라, 덮는 방식이 바뀌면 반대로 어긋납니다.
5. 깨진 곳이 많으면 `.\scripts\restore.ps1` 로 먼저 되돌린 뒤 고치세요.

## 설계 메모

- 색·간격·모서리·그림자·전환 시간은 `user.css` 1번 섹션의 `--cm-*` 변수에 모여 있습니다.
- 전환 시간은 140 / 190 / 230ms 세 가지이며 `prefers-reduced-motion` 에서는 0 이 됩니다. `transition: all` 은 쓰지 않습니다.
- `backdrop-filter` 는 스크롤 시 나타나는 페이지 상단 바, 메뉴, 커버 위 재생 버튼, 유리 재생바, 창 버튼 자리 보정에만 쓰고 `@supports` 밖에 불투명 배경을 기본값으로 둡니다.
- `!important` 는 Spotify 가 인라인 스타일로 넣는 값을 덮는 10곳에만 있습니다.
- 곡 목록의 행 높이와 DOM 은 바꾸지 않습니다(가상 스크롤·다중 선택·드래그가 의존).
- 의미 색상(오류 빨강, 경고 주황, 성공 초록, 안내 파랑, 토글 켜짐 초록)은 포인트색과 분리된 키로 관리합니다.
