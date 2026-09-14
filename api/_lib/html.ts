import s from "./utils/style.js";
import h, { text } from "./utils/tag.js";
import { MAX_ZOOM, MIN_ZOOM, PATTERNS, shapeMarkup } from "./core.js";
import { en, type MessageKey } from "./locales/en.js";
import { inlineScript } from "./generated/editor.js";

// The original h()/s() composition remains the source of the document and its styles.
// This exact string is also hashed by the HTTP handler; no style attributes are needed.
export const inlineStyles = [
  s(":root", { colorScheme: "light", fontFamily: "system-ui, -apple-system, sans-serif", color: "#25332e", backgroundColor: "#f6f5f0", lineHeight: "1.55", accentColor: "#b84c31" }),
  s("*", { boxSizing: "border-box" }),
  s("body, figure, h1, h2, p", { margin: "0" }),
  s("a", { color: "inherit", textUnderlineOffset: "4px" }),
  s("button, input, select, textarea", { font: "inherit" }),
  s("button, input, select, textarea, .drop-zone", { border: "1px solid #d5d9d0", borderRadius: "8px" }),
  s("button", { backgroundColor: "#fff", color: "inherit", padding: "8px 12px", cursor: "pointer" }),
  s("button:hover:not(:disabled), .drop-zone:hover", { borderColor: "#8d9c91", backgroundColor: "#f2f5ef" }),
  s("button:disabled", { opacity: ".45", cursor: "not-allowed" }),
  s(":focus-visible", { outline: "3px solid #b84c31", outlineOffset: "3px" }),
  s(".container", { maxWidth: "1160px", margin: "0 auto", padding: "0 24px" }),
  s(".flex", { display: "flex", gap: "12px" }),
  s(".align-center", { alignItems: "center" }),
  s(".justify-center", { justifyContent: "center" }),
  s(".topbar", { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px", padding: "22px 0", borderBottom: "1px solid #d5d9d0" }),
  s(".brand", { display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "750", textDecoration: "none" }),
  s(".brand svg", { width: "30px", height: "30px", fill: "none", stroke: "currentColor", strokeWidth: "3" }),
  s(".link", { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "18px", fontSize: "13px" }),
  s(".intro", { padding: "30px 0 26px", maxWidth: "700px" }),
  s("h1", { fontSize: "clamp(28px, 4vw, 42px)", lineHeight: "1.15", letterSpacing: "-.04em", marginBottom: "14px" }),
  s(".intro p:last-child", { color: "#56645b", maxWidth: "580px" }),
  s(".studio", { display: "grid", gridTemplateColumns: "330px minmax(0, 1fr)", gap: "18px", alignItems: "start" }),
  s(".controls", { gridColumn: "1", backgroundColor: "#fff", border: "1px solid #d5d9d0", borderRadius: "12px", minWidth: "0" }),
  s(".workspace", { display: "grid", gridColumn: "2", gap: "18px", minWidth: "0" }),
  s(".preview-panel, .export-panel, .api-note", { gridColumn: "1", minWidth: "0", backgroundColor: "#fff", border: "1px solid #d5d9d0", borderRadius: "12px", overflow: "hidden" }),
  s(".control-section", { padding: "20px" }),
  s(".control-section + .control-section", { borderTop: "1px solid #e5e7e0" }),
  s("h2", { fontSize: "16px", lineHeight: "1.4" }),
  s(".control-section h2", { marginBottom: "16px" }),
  s(".control-section h2 > span:first-child", { color: "#8a928a", fontSize: "12px", marginRight: "10px", fontWeight: "500" }),
  s("label", { display: "block", fontSize: "12px", fontWeight: "600" }),
  s("input:not([type=range]):not([type=checkbox]):not([type=file]):not([type=color]), select, textarea", { width: "100%", minWidth: "0", padding: "9px 10px", backgroundColor: "#fafbf7", color: "inherit", marginTop: "5px" }),
  s("select.language", { width: "auto", marginTop: "0", padding: "4px 8px" }),
  s(".input-action", { display: "flex", gap: "7px", alignItems: "end" }),
  s(".input-action input", { flex: "1", minWidth: "0" }),
  s(".input-action button", { flexShrink: "0" }),
  s(".drop-zone", { position: "relative", display: "grid", justifyItems: "center", gap: "6px", padding: "18px 8px", marginTop: "12px", borderStyle: "dashed", backgroundColor: "#fafbf7", cursor: "pointer", textAlign: "center" }),
  s(".drop-zone > span", { fontSize: "11px", color: "#627067" }),
  s(".drop-zone input", { position: "absolute", width: "1px", height: "1px", opacity: "0" }),
  s(".drop-zone:focus-within", { outline: "3px solid #b84c31", outlineOffset: "3px" }),
  s(".drop-zone.dragging", { backgroundColor: "#ecf2e6", borderColor: "#54714d" }),
  s(".hint", { color: "#627067", fontSize: "11px", fontWeight: "400", marginTop: "10px", overflowWrap: "anywhere" }),
  s(".shapes", { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }),
  s(".shape", { display: "grid", justifyItems: "center", gap: "6px", padding: "10px 2px", fontSize: "10px" }),
  s(".shape svg", { width: "28px", height: "28px", fill: "currentColor" }),
  s(".shape[aria-pressed=true]", { color: "#913c25", borderColor: "#b84c31", backgroundColor: "#fff0e8" }),
  s(".section-title, .range-label, .colors, .select-row", { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }),
  s(".section-title", { marginBottom: "16px" }),
  s(".section-title h2", { marginBottom: "0" }),
  s(".text-button", { fontSize: "11px", padding: "4px 8px" }),
  s(".two-columns", { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }),
  s(".select-row", { margin: "14px 0 18px" }),
  s(".select-row select", { width: "66%", fontSize: "11px", margin: "0" }),
  s(".range-label", { marginTop: "14px" }),
  s("output", { fontVariantNumeric: "tabular-nums", color: "#69756c", fontWeight: "400" }),
  s("input[type=range]", { width: "100%", margin: "10px 0 0" }),
  s(".colors", { marginTop: "14px" }),
  s(".colors label", { display: "flex", alignItems: "center", gap: "8px" }),
  s("input[type=color]", { width: "34px", height: "30px", padding: "2px", backgroundColor: "#fff" }),
  s(".checkbox", { display: "flex", alignItems: "center", gap: "7px", marginTop: "14px", fontWeight: "400" }),
  s(".preview-toolbar, .presets, .preview-footer", { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", padding: "18px 22px" }),
  s(".badge, .mark", { display: "inline-block", borderRadius: "5px", backgroundColor: "#eef2e9", padding: "3px 8px", fontSize: "11px", fontVariantNumeric: "tabular-nums" }),
  s(".presets", { justifyContent: "flex-start", paddingTop: "0", fontSize: "11px" }),
  s(".presets > span", { fontSize: "11px", color: "#627067" }),
  s(".presets button", { padding: "5px 9px" }),
  s(".preview-area", { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 20px minmax(0, 1fr)", gap: "16px", alignItems: "center", padding: "30px 22px", backgroundColor: "#edf0e8", minHeight: "280px" }),
  s(".preview-area[aria-busy=true]", { opacity: ".5" }),
  s(".image-stage", { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: "1", maxWidth: "260px", margin: "0 auto", borderRadius: "8px", overflow: "hidden" }),
  s(".checker", { backgroundColor: "#fff", backgroundImage: "conic-gradient(#e1e5dd 25%, transparent 0 50%, #e1e5dd 0 75%, transparent 0)", backgroundSize: "16px 16px" }),
  s(".image-stage img", { display: "block", width: "100%", height: "100%", objectFit: "contain" }),
  s("figcaption", { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "12px", color: "#61705f", fontSize: "12px" }),
  s("figcaption span", { color: "#25332e" }),
  s(".preview-arrow", { fontSize: "22px", color: "#7a8775", textAlign: "center" }),
  s(".preview-footer", { padding: "12px 22px", fontSize: "10px", color: "#627067", overflowWrap: "anywhere" }),
  s(".export-panel", { padding: "22px" }),
  s(".export-heading", { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "18px" }),
  s(".downloads, .copy-actions", { display: "flex", flexWrap: "wrap", gap: "7px", fontSize: "12px" }),
  s(".primary", { backgroundColor: "#253f31", color: "#fff", borderColor: "#253f31" }),
  s(".primary:hover:not(:disabled)", { backgroundColor: "#365744", borderColor: "#365744" }),
  s("textarea", { display: "block", resize: "vertical", fontSize: "11px", lineHeight: "1.6", minHeight: "82px", overflowWrap: "anywhere", marginBottom: "10px" }),
  s(".status", { gridColumn: "1", fontSize: "12px", padding: "0 4px", overflowWrap: "anywhere" }),
  s(".error", { color: "#ad3426" }),
  s(".api-note", { padding: "18px 22px", fontSize: "12px" }),
  s(".api-note summary", { cursor: "pointer", fontWeight: "650" }),
  s(".api-note p, .api-note pre", { marginTop: "12px" }),
  s("pre", { whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "12px", backgroundColor: "#f4f6ef", borderRadius: "6px", fontSize: "11px" }),
  s(".api-examples", { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }),
  s("footer", { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", fontSize: "11px", color: "#627067", padding: "28px 0", marginTop: "24px", borderTop: "1px solid #d5d9d0" }),
  s("noscript p", { padding: "18px", border: "1px solid #b84c31", marginBottom: "18px" }),
  s("@media (max-width: 760px)", {},
    s(".container", { padding: "0 16px" }),
    s(".studio", { gridTemplateColumns: "minmax(0, 1fr)" }),
    s(".workspace", { display: "contents" }),
    s(".controls, .preview-panel, .export-panel, .status, .api-note", { gridColumn: "1", gridRow: "auto" }),
    s(".preview-panel", { gridRow: "1" }),
    s(".controls", { gridRow: "2" }),
    s(".shapes", { gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }),
    s(".preview-area", { minHeight: "0", padding: "20px", gap: "12px" }),
    s(".image-stage", { maxWidth: "220px" }),
  ),
  s("@media (max-width: 380px)", {},
    s(".shapes", { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }),
    s(".topbar .link", { gap: "10px" }),
    s(".preview-area", { padding: "16px 12px", gap: "8px" }),
    s(".presets", { padding: "0 14px 14px", gap: "6px" }),
    s(".presets > span", { width: "100%" }),
  ),
].join("\n");

const message = (key: MessageKey, tag = "span", attributes: Parameters<typeof h>[1] = {}) =>
  h(tag, { ...attributes, "data-i18n": key }, text(en[key]));
const translatedAttribute = (attribute: string, key: MessageKey) => ({ [attribute]: en[key], [`data-i18n-${attribute}`]: key });
const button = (id: string, key: MessageKey, disabled = false, className = "") =>
  message(key, "button", { id, type: "button", disabled, class: className || undefined });
const heading = (number: string, key: MessageKey) => h("h2", {}, h("span", {}, number), message(key));
const range = (id: string, key: MessageKey, min: number, max: number, value: number, suffix: string, step = 1) =>
  h("label", { class: "range-label", for: id }, message(key), h("output", { id: `${id}-value`, for: id }, text(`${value}${suffix}`))) +
  h("input", { id, name: id, type: "range", min, max, value, step });
const field = (id: string, key: MessageKey) => h("label", { for: id }, message(key),
  h("input", { id, name: id, type: "number", min: 1, max: 4096, step: 1, value: 512, required: true }));
const defaultImageUrl = "https://github.com/ivgtr.png";

function controls(): string {
  return h("aside", { class: "controls", ...translatedAttribute("aria-label", "editor") },
    h("section", { class: "control-section" },
      heading("01", "image"),
      h("form", { id: "source-form" },
        message("publicUrl", "label", { for: "url" }),
        h("div", { class: "input-action" },
          h("input", { id: "url", name: "url", type: "url", value: defaultImageUrl, placeholder: "https://…/image.png", autocomplete: "off", spellcheck: "false" }),
          h("button", { id: "load", type: "submit" }, text(en.load)))),
      h("label", { id: "drop-zone", class: "drop-zone", for: "file" },
        message("chooseImage", "strong"), message("fileFormats"),
        h("input", { id: "file", type: "file", accept: "image/png,image/jpeg,image/gif,image/webp" })),
      h("p", { id: "privacy", class: "hint" })),
    h("section", { class: "control-section" }, heading("02", "shape"),
      h("div", { id: "shapes", class: "shapes", role: "group", ...translatedAttribute("aria-label", "cropShape") },
        ...PATTERNS.map(pattern => h("button", { type: "button", class: "shape", "data-pattern": pattern,
          ...translatedAttribute("aria-label", pattern), "aria-pressed": String(pattern === "circle") },
          h("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" }, shapeMarkup(pattern, 100, 100)), message(pattern))))),
    h("section", { class: "control-section" },
      h("div", { class: "section-title" }, heading("03", "sizePosition"), button("reset", "reset", false, "text-button")),
      h("form", { id: "options" },
        h("div", { class: "two-columns" }, field("width", "width"), field("height", "height")),
        h("label", { class: "select-row", for: "fit" }, message("fit"),
          h("select", { id: "fit", name: "fit" }, message("cover", "option", { value: "cover" }), message("contain", "option", { value: "contain" }))),
        range("zoom", "zoom", MIN_ZOOM, MAX_ZOOM, 1, "×", .05),
        range("x", "horizontal", 0, 100, 50, "%"),
        range("y", "vertical", 0, 100, 50, "%"),
        message("positionHint", "p", { class: "hint" }),
        range("border", "insideBorder", 0, 64, 0, " px"),
        h("div", { class: "colors" },
          h("label", { for: "color" }, message("border"), h("input", { id: "color", name: "color", type: "color", value: "#ffffff" })),
          h("label", { for: "bg" }, message("background"), h("input", { id: "bg", name: "bg", type: "color", value: "#f5e8cc" }))),
        h("label", { class: "checkbox" }, h("input", { id: "transparent", type: "checkbox", checked: true }), message("transparent")))));
}

function preview(): string {
  return h("section", { class: "preview-panel", "aria-labelledby": "preview-title" },
    h("div", { class: "preview-toolbar" }, message("preview", "h2", { id: "preview-title" }), h("span", { id: "dimensions", class: "badge" }, "512 × 512")),
    h("div", { class: "presets", role: "group", ...translatedAttribute("aria-label", "presets") }, message("presets"),
      ...(["avatar", "sticker", "token"] as const).map(preset => message(preset, "button", { type: "button", "data-preset": preset }))),
    h("div", { id: "preview-area", class: "preview-area", "aria-busy": "false" },
      h("figure", { class: "original" },
        h("div", { class: "image-stage" }, h("img", { id: "original", ...translatedAttribute("alt", "originalAlt"), draggable: "false" })),
        message("original", "figcaption")),
      h("div", { class: "preview-arrow", "aria-hidden": "true" }, "→"),
      h("figure", { class: "result" },
        h("div", { class: "image-stage checker" }, h("img", { id: "result", ...translatedAttribute("alt", "resultAlt"), draggable: "false" })),
        h("figcaption", {}, message("result"), h("span", { id: "shape-label" }, text(en.circle))))),
    h("div", { class: "preview-footer" }, h("span", { id: "source-info" })));
}

function exportsPanel(): string {
  return h("section", { class: "export-panel", "aria-labelledby": "export-title" },
    h("div", { class: "export-heading" }, message("export", "h2", { id: "export-title" }),
      h("div", { class: "downloads" }, button("download-svg", "downloadSvg", true), button("download-png", "downloadPng", true, "primary"))),
    message("liveUrl", "label", { for: "embed" }),
    h("textarea", { id: "embed", rows: 3, readonly: true, spellcheck: "false", "aria-describedby": "embed-hint", ...translatedAttribute("placeholder", "embedPlaceholder") }),
    h("div", { class: "copy-actions" }, button("copy-url", "copyUrl", true), button("copy-md", "markdown", true), button("copy-html", "html", true), button("copy-editor", "editLink", true)),
    message("embedHint", "p", { id: "embed-hint", class: "hint" }));
}

function usage(): string {
  const sample = `https://crop-icon.vercel.app/api?url=${defaultImageUrl}`;
  return h("details", { id: "usage", class: "api-note" },
    message("apiUsage", "summary"), message("markdownHint", "p"),
    h("pre", {}, h("code", {}, text(`[![icon](${sample})](https://github.com/ivgtr)`))),
    h("div", { class: "api-examples" }, ...(["circle", "heart", "star"] as const).map(pattern =>
      message(pattern, "a", { class: "mark", href: `/api?p=${pattern}&url=${defaultImageUrl}`, target: "_blank", rel: "noopener noreferrer" }))),
    message("apiParameters", "p"), message("exportWarning", "p"));
}

export const html = (): string => {
  const head = "<!DOCTYPE html>";
  const element = h("html", { lang: "en" },
    h("head", {},
      h("meta", { charset: "UTF-8" }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      h("meta", { name: "description", ...translatedAttribute("content", "description") }), message("title", "title"),
      h("link", { rel: "icon", href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M9 2v21h21M2 9h21v21' fill='none' stroke='%23253f31' stroke-width='3'/%3E%3C/svg%3E" }),
      h("style", { id: "studio-style" }, inlineStyles)),
    h("body", {}, h("div", { class: "container" },
      h("header", { class: "topbar" },
        h("a", { class: "brand", href: "/", ...translatedAttribute("aria-label", "home") },
          h("svg", { viewBox: "0 0 32 32", "aria-hidden": "true" }, h("path", { d: "M9 2v21h21M2 9h21v21" })), "crop-icon"),
        h("nav", { class: "link", ...translatedAttribute("aria-label", "projectLinks") }, message("usage", "a", { href: "#usage" }),
          h("a", { href: "https://github.com/ivgtr/crop-icon", target: "_blank", rel: "noopener noreferrer" }, "GitHub ↗"),
          h("select", { id: "language", class: "language", ...translatedAttribute("aria-label", "language") },
            h("option", { value: "en", lang: "en" }, "English"), h("option", { value: "ja", lang: "ja" }, "日本語")))),
      h("main", {}, h("section", { class: "intro" }, message("introTitle", "h1"), message("introDescription", "p")),
        h("noscript", {}, message("noScript", "p")),
        h("div", { class: "studio" }, controls(), h("div", { class: "workspace" }, preview(), exportsPanel(),
          h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" }, text(en.loadingSource)), usage()))),
      h("footer", {}, h("span", {}, "crop-icon / MIT © ", h("a", { href: "https://github.com/ivgtr" }, "ivgtr")),
        h("span", {}, h("a", { href: "https://github.com/ivgtr/crop-icon" }, "GitHub"), " · ", h("a", { href: "https://twitter.com/ivgtr" }, "X")))),
      h("script", { id: "studio-script" }, inlineScript)));
  return head + element;
};