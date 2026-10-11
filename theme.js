/*
 * CupertinoMusic - theme.js
 *
 * 하는 일은 넷이다. 칠하기와 배치는 전부 user.css 가 하고, 여기서는 값과 재료만 넘긴다.
 *
 * 1) 커버 색조: 재생 중인 곡의 커버에서 색을 받아 html.cm-tinted + --cm-tint 를 설정한다(user.css 22번).
 *    - 색은 Spotify 가 헤더 색에 쓰는 내부 GraphQL(fetchExtractedColors)에서 받는다.
 *      그 정의가 없는 버전에서는 Spicetify.colorExtractor 를 대신 쓴다. 외부 서비스·이미지 분석 없음.
 *      (확인: Spotify 1.2.96.518 에서 colorExtractor 는 503 으로 실패, GraphQL 은 정상)
 *
 * 2) 앱 전체 커버 배경: 같은 커버의 주소를 html.cm-cover + --cm-cover-url 로 넘긴다(user.css 24번이
 *    흐리게 깔고 표면을 반투명으로 바꾼다). 밝은 커버에서 글자가 묻히지 않게 어둡기(--cm-bd-dim)도 함께 정한다.
 *    - 이미지는 Spotify 가 원래 커버를 받아 오는 곳(i.scdn.co)의 것이다. 새 외부 의존성은 없다.
 *
 * 3) 지금 재생 중 화면: ivLyrics 가사 화면(/ivLyrics)에 있을 때만 메인 뷰 위에 원형 커버·제목·둘레 스펙트럼을
 *    얹는다(user.css 25번이 배치하고 가사를 오른쪽으로 민다). 가사 자체는 ivLyrics 가 그대로 그린다.
 *    - 스펙트럼은 실제 소리를 분석한 것이 아니다. Spotify 는 재생 중인 소리에 접근을 막는다.
 *      Spotify 의 곡 분석 자료(구간별 음높이 12개·음량·박자)를 재생 위치에 맞춰 읽어 막대로 옮긴 "흉내"다.
 *    - 화면이 보이고 재생 중일 때만 그린다. 가려지거나 멈추면 그리기를 멈춘다. 모션 줄이기 설정이면 그리지 않는다.
 *    - 얹는 요소는 pointer-events 가 없어 클릭을 가로채지 않는다.
 *
 * 4) 칩 이름 정리: Spotify 서버가 일부 필터 칩 이름을 "새로운 아티스트를<br/>발견하세요"처럼 HTML 태그가
 *    섞인 채로 내려보내고 클라이언트가 그것을 글자 그대로 찍는다(테마와 무관. 2026-10-09 "신곡 레이더"에서 확인).
 *    글자는 CSS 로 바꿀 수 없어서, 칩(data-encore-id="chip") 안의 텍스트에서만 그 태그를 공백으로 바꾼다.
 *
 * 5) 창 버튼 높이 맞추기(Windows): 최소화·최대화·닫기 버튼은 Spotify 가 직접 그리며 높이 64px 자리의
 *    가운데에 놓인다. 테마의 상단 바는 52px 라 버튼이 바 가운데보다 6px 아래로 내려가 보인다.
 *    Spotify 가 스스로 쓰는 ControlMessageAPI.setTitlebarHeight 로 그 자리 높이를 상단 바 높이에 맞춘다.
 *    맞춘 높이는 --cm-titlebar-height 로 넘겨 user.css 5번의 창 버튼 자리 보정도 같은 높이를 쓰게 한다.
 *
 * 실패하면 해당 클래스를 떼어 기본 모습으로 돌아간다. Spotify 기능에는 영향이 없다.
 * 끄는 법: 이 파일을 지우고 scripts\install.ps1 을 다시 실행. (2·3만 끄려면 아래 ENABLE_* 를 false 로)
 */
(function cupertinoMusicTheme() {
  "use strict";

  const ENABLE_BACKDROP = true; // 2) 앱 전체 커버 배경
  const ENABLE_NOW_PLAYING = true; // 3) 지금 재생 중 화면

  const STATE_KEY = "__cupertinoMusicTint";
  const CLASS_NAME = "cm-tinted";
  const VAR_NAME = "--cm-tint";
  const COVER_CLASS = "cm-cover";
  const COVER_VAR = "--cm-cover-url";
  const DIM_VAR = "--cm-bd-dim";
  const READY_RETRY_MS = 300;
  const READY_MAX_TRIES = 100; // 최대 30초만 기다린다
  const GRAPHQL_WAIT_TRIES = 30; // GraphQL 정의가 늦게 올라오는 경우를 위해 약 9초까지는 그쪽을 기다린다
  const ITEM_MAX_TRIES = 20; // 시작 직후 재생 정보가 아직 없을 때만, 최대 10초
  const ITEM_RETRY_MS = 500;
  const CACHE_LIMIT = 40;
  // 배경에 쓰기 좋은 순서. VIBRANT_NON_ALARMING 은 경고색(강한 빨강)을 피한 값이다.
  const PRESET_ORDER = ["VIBRANT_NON_ALARMING", "VIBRANT", "PROMINENT", "LIGHT_VIBRANT", "DARK_VIBRANT", "DESATURATED"];

  // 중복 실행 방지: 이미 떠 있으면 이전 인스턴스를 정리하고 새로 시작한다.
  const previous = window[STATE_KEY];
  if (previous && typeof previous.dispose === "function") {
    try {
      previous.dispose();
    } catch (e) {
      /* 이전 인스턴스 정리 실패는 무시 */
    }
  }

  const root = document.documentElement;
  const cache = new Map();
  let requestId = 0;
  let disposed = false;
  let retryTimer = null;
  let listening = false;

  function clearTint() {
    root.classList.remove(CLASS_NAME);
    root.style.removeProperty(VAR_NAME);
  }

  function clearBackdrop() {
    root.classList.remove(COVER_CLASS);
    root.style.removeProperty(COVER_VAR);
    root.style.removeProperty(DIM_VAR);
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  // 현재 스킴이 어두운지: color.ini 의 main 색 밝기로 판단한다.
  function isDarkScheme() {
    const rgb = hexToRgb(getComputedStyle(root).getPropertyValue("--spice-main"));
    if (!rgb) return true;
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 < 0.5;
  }

  // 커버색을 그대로 쓰지 않는다. 채도와 밝기를 스킴에 맞는 범위로 묶어
  // 어떤 커버가 와도 표면이 탁해지거나 글자 대비가 무너지지 않게 한다.
  function normalize(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const [h, s, l] = rgbToHsl(rgb);
    if (s < 0.08) return null; // 무채색 커버는 색조를 넣지 않는다
    const dark = isDarkScheme();
    const sat = Math.min(0.72, Math.max(0.3, s));
    const light = dark ? Math.min(0.58, Math.max(0.4, l)) : Math.min(0.74, Math.max(0.56, l));
    return `hsl(${h.toFixed(1)} ${(sat * 100).toFixed(1)}% ${(light * 100).toFixed(1)}%)`;
  }

  // 흐린 커버 배경의 어둡기(필터 brightness 값). 어두운 스킴에서는 커버가 밝을수록 더 누른다:
  // 흰 커버(밝기 1)는 0.32 까지 눌러 보조 글자 대비를 지킨다. 색을 모르면 CSS 의 기본값을 쓴다.
  function dimFor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    if (!isDarkScheme()) return 1.12;
    const luma = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    return Math.min(0.52, Math.max(0.32, 0.27 / Math.max(luma, 0.05)));
  }

  function pickPreset(palette) {
    if (!palette || typeof palette !== "object") return null;
    for (const key of PRESET_ORDER) {
      const color = normalize(palette[key]);
      if (color) return { tint: color, dim: dimFor(palette[key]) };
    }
    return null;
  }

  // spotify:image:<id> → https://i.scdn.co/image/<id>. 따옴표·괄호·공백이 든 주소는 CSS 에 넣지 않는다.
  function imageUrl(raw) {
    const m = /^spotify:image:([0-9a-f]+)$/i.exec(raw || "");
    if (m) return "https://i.scdn.co/image/" + m[1];
    return typeof raw === "string" && /^https:\/\/[^\s"'()\\]+$/.test(raw) ? raw : null;
  }

  // 재생 항목의 커버 주소. large 는 색 추출·원형 커버용, small 은 흐리게 깔 배경용(흐리면 해상도가 필요 없다).
  function coverUrls(item) {
    const meta = item.metadata || {};
    const first = item.images && item.images[0] && item.images[0].url;
    return {
      large: imageUrl(meta.image_xlarge_url || meta.image_large_url || meta.image_url || first),
      small: imageUrl(meta.image_url || meta.image_large_url || meta.image_xlarge_url || first),
    };
  }

  function hasGraphQL() {
    const g = Spicetify.GraphQL;
    return !!(g && typeof g.Request === "function" && g.Definitions && g.Definitions.fetchExtractedColors);
  }

  // { tint, dim } 을 돌려준다(색을 못 받으면 null). 실패는 예외로 올려 호출부가 기본 모습으로 되돌린다.
  async function extractColor(item) {
    if (hasGraphQL()) {
      const url = coverUrls(item).large;
      if (!url) return null;
      const res = await Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.fetchExtractedColors, { imageUris: [url] });
      const entry = res && res.data && res.data.extractedColors && res.data.extractedColors[0];
      const raw = entry && entry.colorRaw;
      if (!raw || raw.isFallback) return null; // 커버에서 색을 못 뽑았을 때 Spotify 가 주는 대체색은 쓰지 않는다
      return { tint: normalize(raw.hex), dim: dimFor(raw.hex) };
    }
    if (typeof Spicetify.colorExtractor === "function") {
      return pickPreset(await Spicetify.colorExtractor(item.uri));
    }
    return null;
  }

  function remember(uri, color) {
    cache.set(uri, color);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  }

  // 커버를 미리 받아 둔 뒤에 주소를 넘긴다: 받는 동안 배경이 비어 깜빡이지 않는다.
  function setBackdrop(url, id) {
    if (!ENABLE_BACKDROP) return;
    if (!url) {
      clearBackdrop();
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (disposed || id !== requestId) return;
      root.style.setProperty(COVER_VAR, `url("${url}")`);
      root.classList.add(COVER_CLASS);
    };
    img.onerror = () => {
      if (!disposed && id === requestId) clearBackdrop();
    };
    img.src = url;
  }

  function applyColor(color) {
    if (color && color.tint) {
      root.style.setProperty(VAR_NAME, color.tint);
      root.classList.add(CLASS_NAME);
    } else {
      clearTint();
    }
    if (color && color.dim) root.style.setProperty(DIM_VAR, String(color.dim));
    else root.style.removeProperty(DIM_VAR);
  }

  async function update(itemTries) {
    if (disposed) return;
    const id = ++requestId;
    try {
      const item = Spicetify.Player && Spicetify.Player.data && Spicetify.Player.data.item;
      const uri = item && item.uri;
      if (!uri) {
        // 앱이 막 켜져 재생 정보가 아직 없는 경우에만 몇 번 다시 본다(상한 있음).
        const tries = typeof itemTries === "number" ? itemTries : ITEM_MAX_TRIES;
        if (tries < ITEM_MAX_TRIES) {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => update(tries + 1), ITEM_RETRY_MS);
        }
        clearTint();
        clearBackdrop();
        return;
      }
      // 로컬 파일·광고 등 커버 색을 받을 수 없는 항목
      if (/^spotify:(local|ad):/.test(uri)) {
        clearTint();
        clearBackdrop();
        return;
      }
      setBackdrop(coverUrls(item).small, id);
      let color = cache.get(uri);
      if (color === undefined) {
        color = await extractColor(item); // 실패하면 예외 → 캐시에 남기지 않아 다음 기회에 다시 시도한다
        if (disposed || id !== requestId) return;
        remember(uri, color);
      }
      if (disposed || id !== requestId) return; // 그 사이 곡이 또 바뀌었으면 버린다
      applyColor(color);
    } catch (error) {
      // 정리된(재주입으로 교체된) 인스턴스의 늦은 실패가 새 인스턴스의 색조를 지우지 않게 한다
      if (!disposed && id === requestId) applyColor(null);
      console.debug("[CupertinoMusic] tint skipped:", error && error.message ? error.message : error);
    }
  }

  // --- 지금 재생 중 화면 ---------------------------------------------------
  const NP_CLASS = "cm-np";
  const NP_PLAYING_CLASS = "cm-np-playing";
  const NP_ROUTE = /^\/ivLyrics(\/|$)/i;
  const NP_MIN_WIDTH = 880; // 메인 뷰가 이보다 좁으면 얹지 않고 원래 가사 화면 그대로 둔다
  const NP_BARS = 72;
  const NP_ANALYSIS_LIMIT = 12;
  const npLevel = new Float32Array(NP_BARS);
  const npWant = new Float32Array(NP_BARS);
  const npAnalysisCache = new Map();
  let np = null; // { root, cover, title, artist, album, ring, probe }
  let npUnlisten = null;
  let npResize = null;
  let npMotion = null;
  let npRaf = 0;
  let npLast = 0;
  let npWide = true;
  let npAnalysis = null;
  let npTrackUri = null;
  let npSeg = 0;
  let npBeat = 0;
  let npListening = false;

  function npElement(tag, cls, parent) {
    const e = document.createElement(tag);
    e.className = cls;
    parent.appendChild(e);
    return e;
  }

  // 메인 뷰가 다시 만들어졌으면 새로 붙인다. 붙일 곳이 없으면 null.
  function npEnsure() {
    if (np && np.root.isConnected) return np;
    const mainView = document.querySelector(".Root__main-view");
    if (!mainView) return null;
    if (np) np.root.remove();
    const el = document.createElement("div");
    el.id = "cm-np";
    el.setAttribute("aria-hidden", "true"); // 같은 정보가 재생바와 오른쪽 패널에 있다
    const locale = (Spicetify.Locale && typeof Spicetify.Locale.getLocale === "function" && Spicetify.Locale.getLocale()) || navigator.language || "";
    npElement("div", "cm-np__head", el).textContent = /^ko/i.test(locale) ? "지금 재생 중" : "Now Playing";
    const panel = npElement("div", "cm-np__panel", el);
    const art = npElement("div", "cm-np__art", panel);
    const ring = npElement("canvas", "cm-np__ring", art);
    const cover = npElement("img", "cm-np__cover", art);
    cover.alt = "";
    cover.draggable = false;
    np = {
      root: el,
      ring,
      cover,
      title: npElement("div", "cm-np__title", panel),
      artist: npElement("div", "cm-np__artist", panel),
      album: npElement("div", "cm-np__album", panel),
      probe: npElement("span", "cm-np__probe", el),
    };
    mainView.appendChild(el);
    if (npResize) npResize.disconnect();
    if (typeof ResizeObserver === "function") {
      npResize = new ResizeObserver((entries) => {
        const wide = entries[0].contentRect.width >= NP_MIN_WIDTH;
        if (wide !== npWide) {
          npWide = wide;
          npRefresh();
        }
      });
      npResize.observe(mainView);
    }
    npWide = mainView.getBoundingClientRect().width >= NP_MIN_WIDTH;
    return np;
  }

  function npOnRoute() {
    const loc = Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.location;
    return !!(loc && NP_ROUTE.test(loc.pathname || ""));
  }

  function npVisible() {
    return !disposed && root.classList.contains(NP_CLASS) && !document.hidden;
  }

  function npReducedMotion() {
    return !!(npMotion && npMotion.matches);
  }

  // 곡 분석 자료. 한 곡에 한 번만 받고, 못 받으면(팟캐스트·로컬 파일 등) 스펙트럼 없이 둔다.
  async function npLoadAnalysis(uri) {
    if (npAnalysisCache.has(uri)) return npAnalysisCache.get(uri);
    let data = null;
    try {
      const res = typeof Spicetify.getAudioData === "function" ? await Spicetify.getAudioData(uri) : null;
      if (res && Array.isArray(res.segments) && res.segments.length) data = { segments: res.segments, beats: Array.isArray(res.beats) ? res.beats : [] };
    } catch (e) {
      data = null;
    }
    npAnalysisCache.set(uri, data);
    if (npAnalysisCache.size > NP_ANALYSIS_LIMIT) npAnalysisCache.delete(npAnalysisCache.keys().next().value);
    return data;
  }

  async function npSyncTrack() {
    const item = Spicetify.Player && Spicetify.Player.data && Spicetify.Player.data.item;
    if (!np || !item) return;
    const meta = item.metadata || {};
    const url = coverUrls(item).large;
    if (url) {
      if (np.cover.getAttribute("src") !== url) np.cover.src = url;
    } else {
      np.cover.removeAttribute("src");
    }
    np.title.textContent = item.name || "";
    np.artist.textContent = (item.artists || []).map((a) => a.name).filter(Boolean).join(", ") || meta.artist_name || "";
    np.album.textContent = meta.album_title || "";
    if (npTrackUri === item.uri) return;
    npTrackUri = item.uri;
    npAnalysis = null;
    npSeg = 0;
    npBeat = 0;
    const uri = item.uri;
    const data = /^spotify:track:/.test(uri) ? await npLoadAnalysis(uri) : null;
    if (disposed || npTrackUri !== uri) return;
    npAnalysis = data;
    npKick();
  }

  // 목록에서 t 초가 속한 항목의 위치. 재생은 대개 앞으로만 가므로 지난 위치에서 이어 찾는다.
  function npSeek(list, t, from) {
    let i = from;
    if (i >= list.length || list[i].start > t) i = 0;
    while (i + 1 < list.length && list[i + 1].start <= t) i++;
    return i;
  }

  function npTargets(t) {
    const segs = npAnalysis.segments;
    npSeg = npSeek(segs, t, npSeg);
    const s = segs[npSeg];
    const next = segs[Math.min(npSeg + 1, segs.length - 1)];
    const dt = Math.max(0, t - s.start);
    const peakAt = Math.max(0.01, s.loudness_max_time || 0);
    const db =
      dt < peakAt
        ? s.loudness_start + (s.loudness_max - s.loudness_start) * (dt / peakAt)
        : s.loudness_max + (next.loudness_start - s.loudness_max) * Math.min(1, (dt - peakAt) / Math.max(0.01, s.duration - peakAt));
    const loud = Math.pow(Math.min(1, Math.max(0, (db + 42) / 42)), 1.6);
    const pitches = s.pitches || [];
    const bright = Math.min(1, Math.max(-1, (s.timbre ? s.timbre[1] : 0) / 140));
    const center = 0.28 + 0.18 * bright;
    const beats = npAnalysis.beats;
    let pulse = 0;
    if (beats.length) {
      npBeat = npSeek(beats, t, npBeat);
      const b = beats[npBeat];
      if (b.start <= t) pulse = Math.exp(-(t - b.start) * 7) * (0.35 + 0.65 * (b.confidence || 0));
    }
    for (let i = 0; i < NP_BARS; i++) {
      const x = i / (NP_BARS - 1);
      const env = Math.exp(-((x - center) * (x - center)) / 0.16);
      const wobble = 0.82 + 0.18 * Math.sin(i * 12.9898 + npSeg * 1.7);
      npWant[i] = Math.min(1, loud * (0.3 + 0.7 * (pitches[(i * 7) % 12] || 0)) * env * wobble + pulse * 0.42 * Math.exp(-x * 7));
    }
  }

  // 막대 색: 커버 색조(--cm-tint)를 조금 밝힌 색. 색조가 없으면 흰색. 색조가 바뀔 때만 다시 계산한다.
  let npTintKey = null;
  let npRgb = [255, 255, 255];
  function npColor() {
    const tint = root.style.getPropertyValue(VAR_NAME);
    if (tint === npTintKey) return npRgb;
    npTintKey = tint;
    npRgb = [255, 255, 255];
    if (tint) {
      np.probe.style.color = tint;
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(np.probe).color);
      if (m) npRgb = [m[1], m[2], m[3]].map((v) => Math.round(+v + (255 - +v) * 0.35));
    }
    return npRgb;
  }

  function npDraw() {
    const canvas = np.ring;
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(box.width * dpr);
    const h = Math.round(box.height * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, w, h);
    const [r, g, b] = npColor();
    const cx = w / 2;
    const cy = h / 2;
    const inner = w / 1.64 / 2 + w * 0.012; // 캔버스는 커버의 1.64배(user.css 25번). 커버 가장자리 바로 바깥에서 시작한다.
    const maxLen = w / 2 - inner - 2;
    c.lineCap = "round";
    c.lineWidth = Math.max(2, ((2 * Math.PI * inner) / NP_BARS) * 0.5);
    const halfCount = NP_BARS / 2;
    for (let i = 0; i < NP_BARS; i++) {
      // 좌우 대칭: 아래에서 시작해 양쪽으로 퍼진다(낮은 음이 아래, 높은 음이 위)
      const half = i < halfCount ? i : NP_BARS - 1 - i;
      const v = npLevel[Math.round((half / (halfCount - 1)) * (NP_BARS - 1))] || 0;
      const a = (i / NP_BARS) * Math.PI * 2 + Math.PI / 2;
      const len = 3 + v * maxLen;
      c.strokeStyle = `rgba(${r},${g},${b},${(0.4 + 0.55 * v).toFixed(3)})`;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      c.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
      c.stroke();
    }
  }

  function npFrame(now) {
    npRaf = 0;
    if (!np || !npVisible()) return;
    const dt = Math.min(0.1, Math.max(0, (now - npLast) / 1000));
    npLast = now;
    const playing = Spicetify.Player.isPlaying();
    if (npAnalysis && playing && !npReducedMotion()) npTargets(Spicetify.Player.getProgress() / 1000);
    else npWant.fill(0);
    let peak = 0;
    for (let i = 0; i < NP_BARS; i++) {
      const k = npWant[i] > npLevel[i] ? 1 - Math.exp(-dt * 26) : 1 - Math.exp(-dt * 7);
      npLevel[i] += (npWant[i] - npLevel[i]) * k;
      if (npLevel[i] > peak) peak = npLevel[i];
    }
    npDraw();
    // 재생 중이거나 막대가 아직 내려오는 중일 때만 다음 장을 예약한다.
    if ((playing && npAnalysis && !npReducedMotion()) || peak > 0.004) npRaf = requestAnimationFrame(npFrame);
  }

  function npKick() {
    if (npRaf || !np || !npVisible()) return;
    npLast = performance.now();
    npRaf = requestAnimationFrame(npFrame);
  }

  function npRefresh() {
    if (disposed) return;
    const on = npOnRoute() && !!npEnsure() && npWide;
    root.classList.toggle(NP_CLASS, on);
    root.classList.toggle(NP_PLAYING_CLASS, on && Spicetify.Player.isPlaying());
    if (!on) return;
    npSyncTrack();
    npKick();
  }

  function npStart() {
    if (!ENABLE_NOW_PLAYING || disposed || npListening) return;
    npListening = true;
    npMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    npUnlisten = Spicetify.Platform.History.listen(npRefresh);
    Spicetify.Player.addEventListener("onplaypause", npRefresh);
    document.addEventListener("visibilitychange", npKick);
    npRefresh();
  }

  function npDispose() {
    if (npRaf) cancelAnimationFrame(npRaf);
    npRaf = 0;
    if (typeof npUnlisten === "function") npUnlisten();
    if (npResize) npResize.disconnect();
    if (npListening) {
      try {
        Spicetify.Player.removeEventListener("onplaypause", npRefresh);
      } catch (e) {
        /* 무시 */
      }
      document.removeEventListener("visibilitychange", npKick);
      npListening = false;
    }
    root.classList.remove(NP_CLASS, NP_PLAYING_CLASS);
    if (np) np.root.remove();
    np = null;
  }

  // --- 창 버튼 높이 맞추기 (Windows) ----------------------------------------
  const TITLEBAR_VAR = "--cm-titlebar-height";
  const TITLEBAR_DEFAULT = 64; // Spotify 가 스스로 넣는 값(확대/축소 100% 기준)
  const TITLEBAR_RETRY_MS = [0, 1500, 5000]; // Spotify 가 시작 직후 기본값을 다시 넣으므로 몇 번 더 맞춘다
  let titlebarTimers = [];
  let titlebarResizeTimer = null;
  let titlebarListening = false;

  function titlebarApi() {
    const api = Spicetify.Platform && Spicetify.Platform.ControlMessageAPI;
    return api && typeof api.setTitlebarHeight === "function" ? api : null;
  }

  // Spotify 는 "기본 높이 × 확대/축소 배율" 을 넘긴다. 배율은 .Root 의 --zoom-level(퍼센트)에서 읽는다.
  function zoomFactor() {
    const el = document.querySelector(".Root");
    const value = el ? parseFloat(getComputedStyle(el).getPropertyValue("--zoom-level")) : NaN;
    return value > 0 ? value / 100 : 1;
  }

  function applyTitlebar() {
    if (disposed || !root.classList.contains("spotify__os--is-windows")) return;
    const api = titlebarApi();
    const nav = document.querySelector("#global-nav-bar");
    if (!api || !nav) return;
    const height = Math.round(nav.getBoundingClientRect().height);
    if (!(height >= 32 && height <= TITLEBAR_DEFAULT)) return; // 예상 밖의 값이면 건드리지 않는다
    Promise.resolve(api.setTitlebarHeight(Math.round(height * zoomFactor())))
      .then(() => {
        if (!disposed) root.style.setProperty(TITLEBAR_VAR, height + "px");
      })
      .catch(() => {
        /* 실패하면 Spotify 기본 높이 그대로 */
      });
  }

  function onTitlebarResize() {
    // 확대/축소를 바꾸면 Spotify 가 기본값을 다시 넣는다. 크기 변화가 멎은 뒤 한 번 다시 맞춘다.
    if (titlebarResizeTimer) clearTimeout(titlebarResizeTimer);
    titlebarResizeTimer = setTimeout(applyTitlebar, 400);
  }

  function titlebarStart() {
    if (disposed || titlebarListening || !titlebarApi()) return;
    titlebarListening = true;
    titlebarTimers = TITLEBAR_RETRY_MS.map((ms) => setTimeout(applyTitlebar, ms));
    window.addEventListener("resize", onTitlebarResize);
  }

  function titlebarDispose() {
    titlebarTimers.forEach(clearTimeout);
    titlebarTimers = [];
    if (titlebarResizeTimer) clearTimeout(titlebarResizeTimer);
    if (titlebarListening) {
      window.removeEventListener("resize", onTitlebarResize);
      titlebarListening = false;
    }
    if (root.style.getPropertyValue(TITLEBAR_VAR)) {
      root.style.removeProperty(TITLEBAR_VAR);
      const api = titlebarApi();
      if (api) Promise.resolve(api.setTitlebarHeight(Math.round(TITLEBAR_DEFAULT * zoomFactor()))).catch(() => {});
    }
  }

  function onSongChange() {
    update();
    if (root.classList.contains(NP_CLASS)) npSyncTrack();
  }

  function start() {
    if (disposed || listening) return;
    Spicetify.Player.addEventListener("songchange", onSongChange);
    listening = true;
    update(0); // 0 = 재생 정보가 없으면 상한까지 다시 확인
    if (Spicetify.Platform && Spicetify.Platform.History && typeof Spicetify.Platform.History.listen === "function") npStart();
    titlebarStart();
  }

  function waitUntilReady(tries) {
    if (disposed) return;
    const playerReady =
      typeof Spicetify !== "undefined" && Spicetify.Player && typeof Spicetify.Player.addEventListener === "function";
    // GraphQL 경로를 우선한다. 일정 시간 안에 정의가 안 보이면 예전 API 로 시작한다.
    const ready =
      playerReady && (hasGraphQL() || (tries >= GRAPHQL_WAIT_TRIES && typeof Spicetify.colorExtractor === "function"));
    if (ready) {
      start();
      return;
    }
    if (tries >= READY_MAX_TRIES) return; // API 가 없으면 조용히 포기(기본 모습 유지)
    retryTimer = setTimeout(() => waitUntilReady(tries + 1), READY_RETRY_MS);
  }

  // --- 칩 이름에 글자 그대로 찍힌 <br/> 정리 ---------------------------------
  const CHIP_SELECTOR = '[data-encore-id="chip"]';
  const BR_TEST = /<br\s*\/?>/i;
  const BR_REPLACE = /\s*<br\s*\/?>\s*/gi;
  let chipObserver = null;
  let chipTimer = null;

  function fixChip(chip) {
    if (chip.textContent.indexOf("<") === -1) return;
    const walker = document.createTreeWalker(chip, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (BR_TEST.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(BR_REPLACE, " ");
    }
  }

  // 바뀐 노드가 칩 안이면 그 칩을, 칩을 품은 덩어리면 그 안의 칩들을 본다.
  function fixChipsAround(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return;
    const chip = el.closest(CHIP_SELECTOR);
    if (chip) fixChip(chip);
    else if (node.nodeType === 1) el.querySelectorAll(CHIP_SELECTOR).forEach(fixChip);
  }

  function onChipMutations(records) {
    for (const record of records) {
      if (record.type === "characterData") fixChipsAround(record.target);
      else record.addedNodes.forEach(fixChipsAround);
    }
  }

  function watchChips(tries) {
    if (disposed || typeof MutationObserver !== "function") return;
    if (!document.body) {
      if (tries < READY_MAX_TRIES) chipTimer = setTimeout(() => watchChips(tries + 1), READY_RETRY_MS);
      return;
    }
    fixChipsAround(document.body);
    chipObserver = new MutationObserver(onChipMutations);
    chipObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window[STATE_KEY] = {
    refresh: () => update(),
    dispose() {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (chipTimer) clearTimeout(chipTimer);
      if (chipObserver) chipObserver.disconnect();
      if (listening) {
        try {
          Spicetify.Player.removeEventListener("songchange", onSongChange);
        } catch (e) {
          /* 무시 */
        }
        listening = false;
      }
      npDispose();
      titlebarDispose();
      clearTint();
      clearBackdrop();
    },
  };

  waitUntilReady(0);
  watchChips(0);
})();
