// ARG: {sel, depth, maxKids, nav}
if (ARG.nav) {
  Spicetify.Platform.History.push(ARG.nav);
  await new Promise((r) => setTimeout(r, ARG.wait || 3500));
}
const root = document.querySelector(ARG.sel);
if (!root) return "NOT FOUND: " + ARG.sel;
const maxDepth = ARG.depth || 6, maxKids = ARG.maxKids || 4;
const out = [];
function cls(el) {
  return [...el.classList].filter((c) => /^(main|view|playlist|artist|album|x|search|Root|os|cover|encore-text|encore-.*-set|spotify)[-_]/.test(c) || /^e-\d+-/.test(c))
    .map((c) => c.replace(/^e-\d+-/, "e~")).slice(0, 5).join(".");
}
function walk(el, d) {
  const r = el.getBoundingClientRect();
  const a = [];
  for (const k of ["data-testid", "data-encore-id", "role", "aria-label", "aria-rowindex", "aria-colindex", "href", "draggable"]) {
    const v = el.getAttribute(k); if (v != null) a.push(`${k}="${v.slice(0, 40)}"`);
  }
  const st = el.getAttribute("style"); if (st) a.push(`style="${st.slice(0, 70)}"`);
  let text = "";
  if (!el.children.length) text = (el.textContent || "").trim().slice(0, 40);
  out.push(`${"  ".repeat(d)}<${el.tagName.toLowerCase()}${cls(el) ? "." + cls(el) : ""}${a.length ? " " + a.join(" ") : ""}> [${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}]${text ? ' "' + text + '"' : ""}`);
  if (d >= maxDepth) { if (el.children.length) out.push(`${"  ".repeat(d + 1)}… ${el.children.length} children`); return; }
  const kids = [...el.children];
  kids.slice(0, maxKids).forEach((k) => walk(k, d + 1));
  if (kids.length > maxKids) out.push(`${"  ".repeat(d + 1)}… +${kids.length - maxKids} more siblings`);
}
walk(root, 0);
return out.join("\n");
