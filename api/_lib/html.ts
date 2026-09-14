import s from "./utils/style.js";
import h, { text } from "./utils/tag.js";
import { MAX_ZOOM, MIN_ZOOM, PATTERNS } from "./model.js";
import { shapeMarkup } from "./renderer.js";
import { en, type MessageKey } from "./locales/en.js";
import { inlineScript } from "./generated/editor.js";

// The document, styles and browser bundle still use the original inline h()/s() pipeline.
// Surface colors are neutral so that only the source image determines the crop's color.
export const inlineStyles = [
  s(":root", { "--page": "#f6f6f7", "--surface": "#ffffff", "--text": "#232428", "--muted": "#62646c", "--line": "#dddde1", "--soft": "#ededf0", "--action": "#27282d", "--focus": "#405fbd", "--error": "#aa2e36", colorScheme: "light", fontFamily: "system-ui, -apple-system, sans-serif", color: "var(--text)", backgroundColor: "var(--page)", fontSize: "14px", lineHeight: "1.5", accentColor: "var(--action)" }),
  s("*", { boxSizing: "border-box" }),
  s("body, figure, h1, h2, p", { margin: "0" }),
  s("[hidden]", { display: "none !important" }),
  s("a", { color: "inherit", textUnderlineOffset: "4px" }),
  s("button, input, select, textarea", { font: "inherit" }),
  s("button, input, select, textarea, .drop-zone", { border: "1px solid var(--line)", borderRadius: "6px" }),
  s("button", { minHeight: "36px", padding: "7px 12px", backgroundColor: "var(--surface)", color: "inherit", cursor: "pointer" }),
  s("button:hover:not(:disabled), .drop-zone:hover", { borderColor: "#92949d", backgroundColor: "#f4f4f6" }),
  s("button:disabled", { opacity: ".45", cursor: "not-allowed" }),
  s(":focus-visible", { outline: "3px solid var(--focus)", outlineOffset: "3px" }),
  s(".container", { maxWidth: "1160px", margin: "0 auto", padding: "0 28px" }),
  s(".sr-only", { position: "absolute", width: "1px", height: "1px", padding: "0", margin: "-1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: "0" }),
  s(".topbar, .identity, .link, .section-title, .preview-toolbar, .download-row, .copy-actions", { display: "flex", alignItems: "center", gap: "12px" }),
  s(".topbar", { justifyContent: "space-between", gap: "20px", padding: "22px 0" }),
  s(".identity", { flexWrap: "wrap", gap: "6px 18px" }),
  s(".brand", { display: "flex", alignItems: "center", gap: "9px", fontSize: "21px", fontWeight: "750", textDecoration: "none", letterSpacing: "-.04em" }),
  s(".brand svg", { width: "27px", height: "27px", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }),
  s("h1", { fontSize: "14px", fontWeight: "400", color: "var(--muted)" }),
  s(".link", { flexWrap: "wrap", justifyContent: "flex-end", gap: "16px", fontSize: "12px" }),
  s(".link a", { textDecoration: "none" }),
  s(".link a:hover", { textDecoration: "underline" }),
  s("select.language", { width: "auto", margin: "0", padding: "6px 8px", backgroundColor: "transparent" }),
  s("main", { backgroundColor: "var(--surface)", border: "1px solid var(--line)" }),
  s("h2", { fontSize: "14px", fontWeight: "650", lineHeight: "1.5" }),
  s("label", { display: "block", fontSize: "12px", fontWeight: "550" }),
  s("input:not([type=range]):not([type=checkbox]):not([type=file]):not([type=color]), select, textarea", { width: "100%", minWidth: "0", padding: "8px 10px", backgroundColor: "var(--surface)", color: "inherit", marginTop: "6px" }),
  s(".source-panel", { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, .55fr)", alignItems: "start", gap: "16px 24px", padding: "20px 24px", borderBottom: "1px solid var(--line)" }),
  s(".source-panel form", { minWidth: "0" }),
  s(".input-action", { display: "flex", alignItems: "end", gap: "8px" }),
  s(".input-action input", { flex: "1", minWidth: "0" }),
  s(".input-action button", { flexShrink: "0" }),
  s(".drop-zone", { position: "relative", display: "grid", alignContent: "center", gap: "3px", minHeight: "67px", padding: "10px 14px", borderStyle: "dashed", backgroundColor: "var(--page)", cursor: "pointer" }),
  s(".drop-zone > span", { fontSize: "11px", color: "var(--muted)", fontWeight: "400" }),
  s(".drop-zone input", { position: "absolute", width: "1px", height: "1px", opacity: "0" }),
  s(".drop-zone:focus-within", { outline: "3px solid var(--focus)", outlineOffset: "3px" }),
  s(".drop-zone.dragging", { borderColor: "var(--focus)", borderStyle: "solid" }),
  s(".hint", { color: "var(--muted)", fontSize: "12px", fontWeight: "400", marginTop: "8px", overflowWrap: "anywhere" }),
  s("#privacy", { minHeight: "18px" }),
  s(".studio", { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 304px", gridTemplateAreas: "'preview controls' 'downloads controls' 'shapes controls' 'embed embed'", alignItems: "start" }),
  s(".preview-panel", { gridArea: "preview", minWidth: "0", padding: "20px 24px 0" }),
  s(".preview-toolbar", { justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }),
  s(".preview-toolbar h2", { color: "var(--text)" }),
  s("#dimensions, output", { fontVariantNumeric: "tabular-nums" }),
  s(".preview-area", { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: "24px", alignItems: "center", padding: "20px 0 16px", minHeight: "304px" }),
  s(".preview-area[aria-busy=true]", { opacity: ".45" }),
  s(".image-stage", { display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", width: "100%", overflow: "hidden", backgroundColor: "var(--surface)" }),
  s(".checker", { backgroundColor: "#fff", backgroundImage: "conic-gradient(#ececee 25%, transparent 0 50%, #ececee 0 75%, transparent 0)", backgroundSize: "16px 16px" }),
  s(".result .image-stage", { maxWidth: "280px", margin: "0 auto" }),
  s(".image-stage img", { display: "block", width: "100%", height: "100%", objectFit: "contain" }),
  s(".image-stage img:not([src])", { visibility: "hidden" }),
  s("figcaption", { marginTop: "8px", color: "var(--muted)", fontSize: "12px", textAlign: "center" }),
  s(".preview-footer", { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "6px 16px", color: "var(--muted)", fontSize: "11px" }),
  s(".download-panel", { gridArea: "downloads", minWidth: "0", padding: "0 24px" }),
  s(".download-row", { flexWrap: "wrap", padding: "16px 0 10px" }),
  s(".download-row .hint", { flexBasis: "100%", margin: "0" }),
  s(".primary", { backgroundColor: "var(--action)", color: "#fff", borderColor: "var(--action)" }),
  s(".primary:hover:not(:disabled)", { backgroundColor: "#43454d", borderColor: "#43454d" }),
  s(".status", { minHeight: "18px", marginBottom: "4px", color: "var(--muted)", fontSize: "12px", overflowWrap: "anywhere" }),
  s(".error", { color: "var(--error)" }),
  s(".shape-panel", { gridArea: "shapes", minWidth: "0", padding: "16px 24px 22px" }),
  s(".shape-panel h2", { marginBottom: "10px" }),
  s(".shapes", { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "8px" }),
  s(".shape", { display: "grid", justifyItems: "center", gap: "5px", padding: "7px 2px 5px", minWidth: "0", fontSize: "11px", borderColor: "transparent", backgroundColor: "var(--page)" }),
  s(".shape svg, .shape img", { display: "block", width: "42px", height: "42px", objectFit: "contain", fill: "#92949d" }),
  s(".shape[aria-pressed=true]", { borderColor: "var(--action)", boxShadow: "inset 0 0 0 1px var(--action)", backgroundColor: "var(--surface)", fontWeight: "650" }),
  s(".controls", { gridArea: "controls", minWidth: "0", alignSelf: "stretch", padding: "20px", borderLeft: "1px solid var(--line)" }),
  s(".section-title", { justifyContent: "space-between", marginBottom: "16px" }),
  s(".text-button", { minHeight: "30px", padding: "4px 8px", fontSize: "12px" }),
  s(".two-columns", { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }),
  s(".select-row", { display: "block", marginTop: "14px" }),
  s(".select-row select", { fontSize: "12px" }),
  s(".range-label", { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "14px" }),
  s("output", { color: "var(--muted)", fontWeight: "400" }),
  s("input[type=range]", { display: "block", width: "100%", height: "24px", margin: "4px 0 0", cursor: "pointer" }),
  s(".appearance", { marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--line)" }),
  s(".appearance .range-label", { marginTop: "0" }),
  s(".colors", { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", marginTop: "12px" }),
  s(".colors label", { display: "flex", alignItems: "center", gap: "8px" }),
  s("input[type=color]", { width: "32px", height: "30px", padding: "2px", backgroundColor: "var(--surface)" }),
  s(".checkbox", { display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontWeight: "400" }),
  s(".presets", { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--line)" }),
  s(".presets > span", { flexBasis: "100%", marginBottom: "4px", fontSize: "12px", color: "var(--muted)" }),
  s(".presets button", { fontSize: "11px", padding: "5px 8px", minHeight: "30px" }),
  s(".export-panel", { gridArea: "embed", minWidth: "0", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end", gap: "10px 16px", padding: "20px 24px", borderTop: "1px solid var(--line)" }),
  s(".embed-field", { minWidth: "0" }),
  s("textarea", { display: "block", resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: "12px", lineHeight: "1.5", minHeight: "56px", overflowWrap: "anywhere" }),
  s(".copy-actions", { flexWrap: "wrap", maxWidth: "300px", gap: "6px", fontSize: "12px" }),
  s("#embed-hint", { gridColumn: "1 / -1", margin: "0" }),
  s(".api-note", { minWidth: "0", borderTop: "1px solid var(--line)", padding: "16px 24px", fontSize: "12px" }),
  s("summary", { cursor: "pointer", fontWeight: "600" }),
  s(".api-note p, .api-note pre", { marginTop: "12px" }),
  s("pre", { whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "14px", backgroundColor: "var(--page)", fontSize: "12px" }),
  s(".api-examples", { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", marginTop: "14px" }),
  s("footer", { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", fontSize: "11px", color: "var(--muted)", padding: "18px 0 28px" }),
  s("noscript p", { padding: "18px", borderBottom: "1px solid var(--line)" }),
  s("@media (max-width: 900px)", {},
    s(".container", { padding: "0 20px" }),
    s(".identity", { display: "block" }),
    s(".identity h1", { marginTop: "4px" }),
    s(".studio", { gridTemplateColumns: "minmax(0, 1fr) 280px" }),
    s(".preview-area", { gridTemplateColumns: "72px minmax(0, 1fr)", gap: "16px" }),
    s(".shapes", { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }),
    s(".export-panel", { gridTemplateColumns: "minmax(0, 1fr)" }),
    s(".copy-actions", { maxWidth: "none" }),
  ),
  s("@media (max-width: 760px)", {},
    s(":root", { scrollPaddingTop: "280px" }),
    s(".container", { padding: "0 12px" }),
    s(".topbar", { alignItems: "start", padding: "16px 0", gap: "12px" }),
    s(".brand", { fontSize: "19px" }),
    s(".identity h1", { fontSize: "12px" }),
    s(".link", { gap: "8px 12px", maxWidth: "160px" }),
    s(".source-panel", { gridTemplateColumns: "minmax(0, 1fr)", padding: "16px", gap: "10px" }),
    s(".drop-zone", { minHeight: "0", padding: "10px 12px" }),
    s(".studio", { display: "block" }),
    s(".preview-panel", { position: "sticky", top: "0", zIndex: "2", padding: "12px 16px 0", backgroundColor: "var(--surface)", borderBottom: "1px solid var(--line)" }),
    s(".download-panel", { padding: "12px 16px 0" }),
    s(".preview-area", { minHeight: "0", padding: "10px 0 12px", gridTemplateColumns: "64px minmax(0, 1fr)", gap: "16px" }),
    s(".result .image-stage", { maxWidth: "180px" }),
    s(".preview-footer", { fontSize: "11px" }),
    s(".download-row", { paddingTop: "12px", gap: "8px" }),
    s(".shape-panel", { padding: "14px 16px 18px" }),
    s(".shapes", { gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "5px" }),
    s(".shape", { fontSize: "10px", gap: "4px", padding: "7px 1px 5px" }),
    s(".shape svg, .shape img", { width: "32px", height: "32px" }),
    s(".controls", { borderLeft: "0", borderTop: "1px solid var(--line)", padding: "18px 16px" }),
    s(".export-panel, .api-note", { padding: "16px" }),
    s("button", { minHeight: "40px" }),
  ),
  s("@media (max-width: 760px) and (max-height: 600px)", {},
    s(":root", { scrollPaddingTop: "0" }),
    s(".preview-panel", { position: "static" }),
  ),
  s("@media (max-width: 380px)", {},
    s(".shapes", { gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }),
    s(".topbar .link", { gap: "8px", maxWidth: "135px" }),
    s(".preview-area", { gridTemplateColumns: "48px minmax(0, 1fr)", gap: "12px" }),
  ),
].join("\n");

const message = (key: MessageKey, tag = "span", attributes: Parameters<typeof h>[1] = {}) =>
  h(tag, { ...attributes, "data-i18n": key }, text(en[key]));
const translatedAttribute = (attribute: string, key: MessageKey) => ({ [attribute]: en[key], [`data-i18n-${attribute}`]: key });
const button = (id: string, key: MessageKey, disabled = false, className = "") =>
  message(key, "button", { id, type: "button", disabled, class: className || undefined });
const range = (id: string, key: MessageKey, min: number, max: number, value: number, suffix: string, step = 1) =>
  h("label", { class: "range-label", for: id }, message(key), h("output", { id: `${id}-value`, for: id }, text(`${value}${suffix}`))) +
  h("input", { id, name: id, type: "range", min, max, value, step });
const field = (id: string, key: MessageKey) => h("label", { for: id }, message(key),
  h("input", { id, name: id, type: "number", min: 1, max: 4096, step: 1, value: 512, required: true }));
const defaultImageUrl = "https://github.com/ivgtr.png";

function sourcePanel(): string {
  return h("section", { class: "source-panel", ...translatedAttribute("aria-label", "image") },
    h("form", { id: "source-form" },
      message("publicUrl", "label", { for: "url" }),
      h("div", { class: "input-action" },
        h("input", { id: "url", name: "url", type: "url", value: defaultImageUrl, placeholder: "https://…/image.png", autocomplete: "off", spellcheck: "false" }),
        h("button", { id: "load", type: "submit" }, text(en.load))),
      h("p", { id: "privacy", class: "hint" })),
    h("label", { id: "drop-zone", class: "drop-zone", for: "file" },
      message("chooseImage", "strong"), message("fileFormats"),
      h("input", { id: "file", type: "file", accept: "image/png,image/jpeg,image/gif,image/webp" })));
}

function controls(): string {
  return h("aside", { class: "controls", ...translatedAttribute("aria-label", "editor") },
    h("div", { class: "section-title" }, message("sizePosition", "h2"), button("reset", "reset", false, "text-button")),
    h("form", { id: "options" },
      h("div", { class: "two-columns" }, field("width", "width"), field("height", "height")),
      h("label", { class: "select-row", for: "fit" }, message("fit"),
        h("select", { id: "fit", name: "fit" }, message("cover", "option", { value: "cover" }), message("contain", "option", { value: "contain" }))),
      range("zoom", "zoom", MIN_ZOOM, MAX_ZOOM, 1, "×", .05),
      range("x", "horizontal", 0, 100, 50, "%"),
      range("y", "vertical", 0, 100, 50, "%"),
      message("positionHint", "p", { class: "hint" }),
      h("div", { class: "appearance" },
        range("border", "insideBorder", 0, 64, 0, " px"),
        h("div", { class: "colors" },
          h("label", { for: "color" }, message("border"), h("input", { id: "color", name: "color", type: "color", value: "#ffffff" })),
          h("label", { for: "bg" }, message("background"), h("input", { id: "bg", name: "bg", type: "color", value: "#f5e8cc" }))),
        h("label", { class: "checkbox" }, h("input", { id: "transparent", type: "checkbox", checked: true }), message("transparent")))),
    h("div", { class: "presets", role: "group", ...translatedAttribute("aria-label", "presets") }, message("presets"),
      ...(["avatar", "sticker", "token"] as const).map(preset => message(preset, "button", { type: "button", "data-preset": preset }))));
}

function shapes(): string {
  return h("section", { class: "shape-panel", "aria-labelledby": "shape-title" }, message("shape", "h2", { id: "shape-title" }),
    h("div", { id: "shapes", class: "shapes", role: "group", ...translatedAttribute("aria-label", "cropShape") },
      ...PATTERNS.map(pattern => h("button", { type: "button", class: "shape", "data-pattern": pattern,
        ...translatedAttribute("aria-label", pattern), "aria-pressed": String(pattern === "circle") },
        h("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" }, shapeMarkup(pattern, 100, 100)),
        h("img", { "data-shape-preview": pattern, alt: "", hidden: true, draggable: "false" }), message(pattern)))));
}

function preview(): string {
  return h("section", { class: "preview-panel", "aria-labelledby": "preview-title" },
    h("div", { class: "preview-toolbar" }, message("preview", "h2", { id: "preview-title" }), h("span", { id: "dimensions" }, "512 × 512")),
    h("div", { id: "preview-area", class: "preview-area", "aria-busy": "false" },
      h("figure", { class: "original" },
        h("div", { class: "image-stage" }, h("img", { id: "original", ...translatedAttribute("alt", "originalAlt"), draggable: "false" })),
        message("original", "figcaption")),
      h("figure", { class: "result" },
        h("div", { class: "image-stage checker" }, h("img", { id: "result", ...translatedAttribute("alt", "resultAlt"), draggable: "false" })),
        h("figcaption", {}, message("result"), " · ", h("span", { id: "shape-label" }, text(en.circle)))))) +
    h("div", { class: "download-panel" },
    h("div", { class: "preview-footer" }, h("span", { id: "source-info" })),
    h("div", { class: "download-row", ...translatedAttribute("aria-label", "export") },
      button("download-png", "downloadPng", true, "primary"), button("download-svg", "downloadSvg", true),
      message("svgWarning", "p", { class: "hint" })),
    h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" }, text(en.loadingSource)));
}

function exportsPanel(): string {
  return h("section", { class: "export-panel", ...translatedAttribute("aria-label", "liveUrl") },
    h("div", { class: "embed-field" }, message("liveUrl", "label", { for: "embed" }),
      h("textarea", { id: "embed", rows: 2, readonly: true, spellcheck: "false", "aria-describedby": "embed-hint", ...translatedAttribute("placeholder", "embedPlaceholder") })),
    h("div", { class: "copy-actions" }, button("copy-url", "copyUrl", true), button("copy-md", "markdown", true), button("copy-html", "html", true), button("copy-editor", "editLink", true)),
    message("embedHint", "p", { id: "embed-hint", class: "hint" }));
}

function usage(): string {
  const sample = `https://crop-icon.vercel.app/api?url=${defaultImageUrl}`;
  return h("details", { id: "usage", class: "api-note" },
    message("apiUsage", "summary"),
    h("pre", {}, h("code", {}, text(`[![icon](${sample})](https://github.com/ivgtr)`))),
    h("div", { class: "api-examples" }, ...(["circle", "heart", "star"] as const).map(pattern =>
      message(pattern, "a", { href: `/api?p=${pattern}&url=${defaultImageUrl}`, target: "_blank", rel: "noopener noreferrer" })),
      message("apiReference", "a", { href: "https://github.com/ivgtr/crop-icon#api", target: "_blank", rel: "noopener noreferrer" })),
    message("apiParameters", "p"), message("exportWarning", "p"));
}

export const html = (): string => {
  const head = "<!DOCTYPE html>";
  const element = h("html", { lang: "en" },
    h("head", {},
      h("meta", { charset: "UTF-8" }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      h("meta", { name: "description", ...translatedAttribute("content", "description") }), message("title", "title"),
      h("link", { rel: "icon", href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M9 2v21h21M2 9h21v21' fill='none' stroke='%2327282d' stroke-width='3'/%3E%3C/svg%3E" }),
      h("style", { id: "studio-style" }, inlineStyles)),
    h("body", {}, h("div", { class: "container" },
      h("header", { class: "topbar" },
        h("div", { class: "identity" },
          h("a", { class: "brand", href: "/", ...translatedAttribute("aria-label", "home") },
            h("svg", { viewBox: "0 0 32 32", "aria-hidden": "true" }, h("path", { d: "M9 2v21h21M2 9h21v21" })), "crop-icon"),
          message("introTitle", "h1")),
        h("nav", { class: "link", ...translatedAttribute("aria-label", "projectLinks") }, message("apiUsage", "a", { href: "#usage" }),
          h("a", { href: "https://github.com/ivgtr/crop-icon", target: "_blank", rel: "noopener noreferrer" }, "GitHub ↗"),
          h("select", { id: "language", class: "language", ...translatedAttribute("aria-label", "language") },
            h("option", { value: "en", lang: "en" }, "English"), h("option", { value: "ja", lang: "ja" }, "日本語")))),
      h("main", {}, h("noscript", {}, message("noScript", "p")), sourcePanel(),
        h("div", { class: "studio" }, preview(), shapes(), controls(), exportsPanel()), usage()),
      h("footer", {}, h("span", {}, "crop-icon / MIT © ", h("a", { href: "https://github.com/ivgtr" }, "ivgtr")),
        h("a", { href: "https://twitter.com/ivgtr" }, "X ↗"))),
      h("script", { id: "studio-script" }, inlineScript)));
  return head + element;
};
