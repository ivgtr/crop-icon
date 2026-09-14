/** Escape plain text before passing it as a child. Child markup stays composable. */
export const text = (value: string | number): string => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Keep the original h(tag, attributes, ...children) API. Children are trusted markup.
export default function (
  tagName: string,
  attributes: { [attr: string]: string | number | boolean | undefined },
  ...children: string[]
): string {
  const isVoidTag = [
    "area", "base", "br", "col", "embed", "hr", "img", "input", "keygen",
    "link", "meta", "param", "source", "track", "wbr",
  ].includes(tagName);
  const attrs = Object.entries(attributes).map(([key, value]) => {
    if (value === undefined || value === false) return "";
    return value === true ? ` ${key}` : ` ${key}="${text(value)}"`;
  }).join("");
  const close = isVoidTag ? "" : `${children.join("")}</${tagName}>`;
  return `<${tagName}${attrs}>${close}`;
}
