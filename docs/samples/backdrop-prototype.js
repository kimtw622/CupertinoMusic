// 미리보기용 시제품 (tools\cdp.mjs run): 앱 전체에 흐린 커버 배경. ARG = { off: true } 로 제거, { path } 로 화면 이동
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const html = document.documentElement;
document.getElementById("cm-bd-style")?.remove();
html.classList.remove("cm-bd");
html.style.removeProperty("--cm-cover-url");
if (ARG && ARG.off) return "removed";

const meta = Spicetify.Player.data.item.metadata || {};
const raw = meta.image_xlarge_url || meta.image_large_url || meta.image_url || "";
const m = /^spotify:image:([0-9a-f]+)$/i.exec(raw);
const url = m ? "https://i.scdn.co/image/" + m[1] : raw;
html.style.setProperty("--cm-cover-url", `url("${url}")`);
html.classList.add("cm-bd");

const style = document.createElement("style");
style.id = "cm-bd-style";
style.textContent = `
html.cm-bd .Root__top-container { isolation: isolate; overflow: clip; background-color: #0c0c0e; }
html.cm-bd .Root__top-container::before {
  content: ""; position: absolute; inset: -110px; z-index: -1; pointer-events: none;
  background: var(--cm-cover-url) center / cover no-repeat;
  filter: blur(76px) saturate(1.45) brightness(0.62);
}
html.cm-bd.cm-bd {
  --cm-surface-sidebar: rgba(14, 14, 16, 0.34);
  --cm-surface-panel: rgba(14, 14, 16, 0.30);
  --cm-surface-player: rgba(14, 14, 16, 0.46);
}
html.cm-bd .Root__main-view { background-color: rgba(14, 14, 16, 0.46); }
html.cm-bd .Root__right-sidebar-peek, html.cm-bd .Root__right-sidebar { background-color: rgba(14, 14, 16, 0.30); }
html.cm-bd .main-topBar-background { background-color: rgba(14, 14, 16, 0.55) !important; }
html.cm-bd .main-entityHeader-container .main-entityHeader-backgroundColor { opacity: 0.10; }
`;
document.head.appendChild(style);
if (ARG && ARG.path && Spicetify.Platform.History.location.pathname !== ARG.path) { Spicetify.Platform.History.push(ARG.path); await sleep(3500); }
const cs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
return { url, path: Spicetify.Platform.History.location.pathname, nav: cs(".Root__nav-bar"), global: cs("#global-nav-bar"), bar: cs(".Root__now-playing-bar"), right: cs(".Root__right-sidebar"), main: cs(".Root__main-view") };
