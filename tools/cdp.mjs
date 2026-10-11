// 사용법:
//   node cdp.mjs run <script.js> [arg-json]   스크립트 본문을 async 함수로 실행하고 결과(JSON)를 출력. 본문에서 ARG 로 인자 사용
//   node cdp.mjs shot <out.png> [x y w h]     화면 캡처(선택: CSS px 영역)
//   node cdp.mjs css <file.css> [id]          <style id> 로 CSS 주입/교체 (빈 파일이면 제거)
import fs from "node:fs";

const PORT = 9222;
const [, , cmd, a1, ...rest] = process.argv;

async function target() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const t = list.find((x) => x.type === "page" && /xpui\.app\.spotify\.com\/index\.html/.test(x.url)) || list.find((x) => x.type === "page");
  if (!t) throw new Error("page target not found: " + JSON.stringify(list.map((x) => [x.type, x.url])));
  return t;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.addEventListener("open", () =>
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const i = ++id;
            pending.set(i, { res, rej });
            ws.send(JSON.stringify({ id: i, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
      }
    });
    ws.addEventListener("error", (e) => reject(new Error("ws error: " + (e.message || e.type))));
  });
}

async function evaluate(c, body, arg) {
  const expression = `(async (ARG) => { ${body}\n})(${JSON.stringify(arg ?? null)})`;
  const r = await c.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

const t = await target();
const c = await connect(t.webSocketDebuggerUrl);
try {
  if (cmd === "run") {
    const body = fs.readFileSync(a1, "utf8");
    const arg = rest[0] ? JSON.parse(rest[0]) : null;
    const v = await evaluate(c, body, arg);
    console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
  } else if (cmd === "shot") {
    const params = { format: "png" };
    if (rest.length === 4) {
      const [x, y, width, height] = rest.map(Number);
      params.clip = { x, y, width, height, scale: 1 };
    }
    const r = await c.send("Page.captureScreenshot", params);
    fs.writeFileSync(a1, Buffer.from(r.data, "base64"));
    console.log("saved " + a1);
  } else if (cmd === "css") {
    const css = fs.readFileSync(a1, "utf8");
    const id = rest[0] || "cm-preview";
    const v = await evaluate(
      c,
      `let s = document.getElementById(ARG.id); if (!ARG.css.trim()) { if (s) s.remove(); return "removed"; }
       if (!s) { s = document.createElement("style"); s.id = ARG.id; document.head.appendChild(s); }
       s.textContent = ARG.css; return "injected " + ARG.css.length;`,
      { id, css }
    );
    console.log(v);
  } else if (cmd === "visit") {
    // node cdp.mjs visit <path> <out.png> [waitMs] [scrollTop] [extra.js]
    // 잠깐 그 화면으로 갔다가 캡처(+선택 스크립트 실행)하고 원래 화면·스크롤로 되돌린다.
    const [out, waitMs = "2600", top = "0", extra] = rest;
    const state = await evaluate(
      c,
      `const vp = () => document.querySelector(".Root__main-view [data-overlayscrollbars-viewport]");
       const prev = { path: Spicetify.Platform.History.location.pathname, top: vp() ? vp().scrollTop : 0 };
       const same = prev.path === ARG.path;
       if (!same) Spicetify.Platform.History.push(ARG.path);
       await new Promise((r) => setTimeout(r, same ? 300 : ARG.wait));
       if (vp()) vp().scrollTop = ARG.top;
       await new Promise((r) => setTimeout(r, 1300));
       return { ...prev, same };`,
      { path: a1, wait: Number(waitMs), top: Number(top) }
    );
    try {
      if (extra) {
        const v = await evaluate(c, fs.readFileSync(extra, "utf8"), null);
        console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
      }
      const r = await c.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(out, Buffer.from(r.data, "base64"));
    } finally {
      await evaluate(
        c,
        `if (!ARG.same) { Spicetify.Platform.History.goBack(); await new Promise((r) => setTimeout(r, 1200)); }
         const vp = document.querySelector(".Root__main-view [data-overlayscrollbars-viewport]"); if (vp) vp.scrollTop = ARG.top; return 1;`,
        state
      );
    }
    console.log("visited " + a1 + " -> " + out + " (back to " + state.path + ")");
  } else {
    throw new Error("unknown command");
  }
} finally {
  c.close();
}
