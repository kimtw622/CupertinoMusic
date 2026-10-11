// 미리보기용 시제품 (tools\cdp.mjs run). 적용된 파일은 건드리지 않고, 실행 중인 화면에만 얹는다.
// ARG = { layout: "square" | "disc", spectrum: "bars" | "radial" | "off", off: true(제거) }
const prev = window.__cmNP;
if (prev) prev.dispose();
if (ARG && ARG.off) return "removed";

const opts = Object.assign({ layout: "square", spectrum: "bars" }, ARG || {});
const html = document.documentElement;
const mainView = document.querySelector(".Root__main-view");
let disposed = false;

// ---------- 스타일 ----------
const style = document.createElement("style");
style.id = "cm-np-style";
style.textContent = `
#cm-np { position: absolute; inset: 0; z-index: 5; pointer-events: none; display: none; overflow: hidden; }
html.cm-np #cm-np { display: block; }
html.cm-np .lyrics-lyricsContainer-SyncedLyricsPage { margin-inline-start: 43%; }
html.cm-np .lyrics-lyricsContainer-LyricsLine { font-size: 30px; }
html.cm-np .lyrics-credit-footer { left: 71.5% !important; right: auto !important; transform: translateX(-50%) !important; }
.cm-np__head { position: absolute; left: 32px; top: 22px; font-size: 28px; font-weight: 700; letter-spacing: -0.022em; color: #fff; }
.cm-np__panel { position: absolute; left: 0; top: 0; bottom: 0; width: 43%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 72px; box-sizing: border-box; }
.cm-np__art { position: relative; width: min(300px, 62%); aspect-ratio: 1; }
.cm-np__cover { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 14px; box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08); }
.cm-np--disc .cm-np__art { width: min(250px, 52%); }
.cm-np--disc .cm-np__cover { border-radius: 50%; }
.cm-np__ring { position: absolute; left: -32%; top: -32%; width: 164%; height: 164%; }
.cm-np__title { margin-top: 26px; max-width: 82%; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; color: #fff; text-align: center; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cm-np--disc .cm-np__title { margin-top: 64px; }
.cm-np__artist { margin-top: 5px; max-width: 82%; font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.74); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-np__album { margin-top: 2px; max-width: 82%; font-size: 12px; color: rgba(255, 255, 255, 0.5); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-np__bars { position: absolute; left: 0; bottom: 0; width: 100%; height: 104px; }
`;
document.head.appendChild(style);

// ---------- 요소 ----------
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const root = el("div", "cm-np--" + opts.layout);
root.id = "cm-np";
const head = el("div", "cm-np__head", root);
head.textContent = "지금 재생 중";
const panel = el("div", "cm-np__panel", root);
const art = el("div", "cm-np__art", panel);
const ring = opts.spectrum === "radial" ? el("canvas", "cm-np__ring", art) : null;
const cover = el("img", "cm-np__cover", art);
cover.alt = "";
const title = el("div", "cm-np__title", panel);
const artist = el("div", "cm-np__artist", panel);
const album = el("div", "cm-np__album", panel);
const bars = opts.spectrum === "bars" ? el("canvas", "cm-np__bars", root) : null;
mainView.appendChild(root);

// ---------- 곡 정보 ----------
let analysis = null;
let analysisUri = null;
function coverUrl(meta) {
  const raw = meta.image_xlarge_url || meta.image_large_url || meta.image_url || "";
  const m = /^spotify:image:([0-9a-f]+)$/i.exec(raw);
  return m ? "https://i.scdn.co/image/" + m[1] : raw.startsWith("https://") ? raw : "";
}
async function refreshTrack() {
  const item = Spicetify.Player.data && Spicetify.Player.data.item;
  if (!item) return;
  const meta = item.metadata || {};
  cover.src = coverUrl(meta);
  title.textContent = item.name || "";
  artist.textContent = (item.artists || []).map((a) => a.name).join(", ") || meta.artist_name || "";
  album.textContent = meta.album_title || "";
  if (analysisUri !== item.uri) {
    analysisUri = item.uri;
    analysis = null;
    try {
      const data = await Spicetify.getAudioData(item.uri);
      if (analysisUri === item.uri && data && data.segments && data.segments.length) analysis = data;
    } catch (e) {
      analysis = null;
    }
  }
}

// ---------- 화면 조건: 가사 화면에서만 ----------
function refreshRoute() {
  html.classList.toggle("cm-np", /^\/ivLyrics/.test(Spicetify.Platform.History.location.pathname));
}
const unlisten = Spicetify.Platform.History.listen(refreshRoute);
Spicetify.Player.addEventListener("songchange", refreshTrack);

// ---------- 스펙트럼 흉내 ----------
// 실제 소리를 분석하지 않는다. Spotify 의 곡 분석 자료(구간별 음높이 12개·음량·박자)를 재생 위치에 맞춰 읽어 막대로 옮긴다.
const N = opts.spectrum === "radial" ? 72 : 64;
const level = new Float32Array(N);
let segIndex = 0;
let beatIndex = 0;
function seek(list, t, from) {
  let i = from;
  if (!list.length) return 0;
  if (i >= list.length || list[i].start > t) i = 0;
  while (i + 1 < list.length && list[i + 1].start <= t) i++;
  return i;
}
function targets(t, out) {
  const segs = analysis.segments;
  segIndex = seek(segs, t, segIndex);
  const s = segs[segIndex];
  const next = segs[Math.min(segIndex + 1, segs.length - 1)];
  const dt = Math.max(0, t - s.start);
  const peakAt = Math.max(0.01, s.loudness_max_time);
  const db = dt < peakAt ? s.loudness_start + (s.loudness_max - s.loudness_start) * (dt / peakAt)
    : s.loudness_max + (next.loudness_start - s.loudness_max) * Math.min(1, (dt - peakAt) / Math.max(0.01, s.duration - peakAt));
  const loud = Math.pow(Math.min(1, Math.max(0, (db + 42) / 42)), 1.6);
  const bright = Math.min(1, Math.max(-1, (s.timbre ? s.timbre[1] : 0) / 140));
  const center = 0.28 + 0.18 * bright;
  const beats = analysis.beats || [];
  beatIndex = seek(beats, t, beatIndex);
  const b = beats[beatIndex];
  const pulse = b ? Math.exp(-Math.max(0, t - b.start) * 7) * (0.35 + 0.65 * (b.confidence || 0)) : 0;
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    const pc = (i * 7) % 12;
    const env = Math.exp(-((x - center) * (x - center)) / 0.16);
    const wobble = 0.82 + 0.18 * Math.sin(i * 12.9898 + segIndex * 1.7);
    out[i] = Math.min(1, loud * (0.3 + 0.7 * s.pitches[pc]) * env * wobble + pulse * 0.42 * Math.exp(-x * 7));
  }
}
function tintRgb() {
  const probe = tintRgb.probe || (tintRgb.probe = el("span", "", root));
  probe.style.cssText = "display:none;color:" + (html.style.getPropertyValue("--cm-tint") || "#FA2D48");
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(probe).color);
  return m ? [+m[1], +m[2], +m[3]] : [250, 45, 72];
}
function fit(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}
const want = new Float32Array(N);
let last = performance.now();
let raf = 0;
function frame(now, force) {
  if (disposed) return;
  if (!force) raf = requestAnimationFrame(frame);
  if (!html.classList.contains("cm-np") || (document.hidden && !force)) return;
  const dtFrame = Math.min(0.1, (now - last) / 1000);
  last = now;
  const playing = Spicetify.Player.isPlaying();
  if (analysis && (playing || opts.still)) targets(Spicetify.Player.getProgress() / 1000, want);
  else want.fill(0);
  for (let i = 0; i < N; i++) {
    const k = want[i] > level[i] ? 1 - Math.exp(-dtFrame * 26) : 1 - Math.exp(-dtFrame * 7);
    level[i] += (want[i] - level[i]) * k;
  }
  const [r, g, b] = tintRgb().map((v) => Math.round(v + (255 - v) * 0.35));
  if (bars) {
    const { w, h } = fit(bars);
    const c = bars.getContext("2d");
    c.clearRect(0, 0, w, h);
    const gap = w / N;
    const bw = gap * 0.62;
    for (let i = 0; i < N; i++) {
      const bh = Math.max(2, level[i] * h * 0.94);
      c.fillStyle = `rgba(${r},${g},${b},${(0.2 + 0.7 * (1 - i / N)).toFixed(3)})`;
      c.beginPath();
      c.roundRect(i * gap + (gap - bw) / 2, h - bh, bw, bh, [bw / 2, bw / 2, 0, 0]);
      c.fill();
    }
  }
  if (ring) {
    const { w, h } = fit(ring);
    const c = ring.getContext("2d");
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const inner = (w / 1.64) / 2 + w * 0.012;
    const maxLen = w / 2 - inner - 2;
    c.lineCap = "round";
    c.lineWidth = Math.max(2, (2 * Math.PI * inner) / N * 0.5);
    for (let i = 0; i < N; i++) {
      // 좌우 대칭: 아래쪽에서 시작해 양쪽으로 퍼진다
      const half = i < N / 2 ? i : N - 1 - i;
      const v = level[Math.round((half / (N / 2 - 1)) * (N - 1))] || 0;
      const a = (i / N) * Math.PI * 2 + Math.PI / 2;
      const len = 3 + v * maxLen;
      c.strokeStyle = `rgba(${r},${g},${b},${(0.45 + 0.5 * v).toFixed(3)})`;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      c.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
      c.stroke();
    }
  }
}
raf = requestAnimationFrame(frame);

window.__cmNP = {
  opts,
  // 창이 가려져 화면 갱신이 멈춘 상태에서도 한 장을 그린다(샘플 캡처용)
  drawNow() { for (let k = 0; k < 30; k++) { last = performance.now() - 16; frame(performance.now(), true); } },
  state: () => ({ on: html.classList.contains("cm-np"), analysis: !!analysis, segs: analysis ? analysis.segments.length : 0, max: Math.max(...level).toFixed(2) }),
  dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    unlisten();
    Spicetify.Player.removeEventListener("songchange", refreshTrack);
    html.classList.remove("cm-np");
    root.remove();
    style.remove();
    delete window.__cmNP;
  },
};
refreshRoute();
await refreshTrack();
if (opts.still) window.__cmNP.drawNow();
return { installed: opts, on: html.classList.contains("cm-np"), analysis: !!analysis };
