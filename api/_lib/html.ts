import s from "./utils/style";
import h from "./utils/tag";

export const html = () => {
  const head = "<!DOCTYPE html>";

  const element = h(
    "html",
    { lang: "ja" },
    h(
      "head",
      {},
      h("meta", { charset: "UTF-8" }),
      h("meta", {
        "http-equiv": "X-UA-Compatible",
        content: "IE=edge",
      }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      h("title", {}, "icon.io"),
      h(
        "style",
        {},
        s(".container", { maxWidth: "724px", margin: "0 auto 0" }),
        s(".flex", { display: "flex" }),
        s(".mt", { marginTop: "30px" }),
        s(".mb0", { marginBottom: "0" }),
        s(".align-center", { alignItems: "center" }),
        s(".justify-center", { justifyContent: "center" }),
        s(".mark", {
          display: "inline-block",
          backgroundColor: "#4f5964",
          color: "#cdd9e5",
          padding: "0 5px",
          fontSize: "0.9em",
        }),
        s(".link a:not(:first-child)", { marginLeft: "5px" }),
        s(".wrap", { height: "150px", width: "150px" }),
        s(".wrap img", { height: "100%", width: "100%", objectFit: "contain" }),
        s(".arrow", {
          display: "inline-block",
          height: "18px",
          width: "18px",
          margin: "0 10px",
          borderTop: "4px solid #3e3e3e",
          borderRight: "4px solid #3e3e3e",
          transform: "rotate(45deg)",
        })
      )
    ),
    h(
      "body",
      {},
      h(
        "div",
        { class: "container" },
        h("h1", {}, "This API will crop the icon in a nice way."),
        h(
          "div",
          { class: "link" },
          h(
            "a",
            {
              href: "https://github.com/ivgtr/crop-icon",
              target: "_brank",
              rel: "noopener noreferrer",
            },
            "GitHub"
          )
        ),
        h("h2", { class: "mb0" }, "Usage"),
        h(
          "p",
          {},
          "sample:) ",
          h(
            "a",
            {
              href: "https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png",
              target: "_brank",
              rel: "noopener noreferrer",
            },
            "https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png"
          )
        ),
        h(
          "div",
          { class: "flex" },
          h("div", { class: "wrap" }, h("img", { src: "https://github.com/ivgtr.png" })),
          h(
            "div",
            { class: "wrap flex align-center justify-center" },
            h("span", { class: "arrow" })
          ),
          h(
            "div",
            { class: "wrap" },
            h("img", {
              src: "/api?url=https://github.com/ivgtr.png",
            })
          )
        ),
        h("div", { class: "mt" }),
        h("p", {}, "You can copy-paste this into markdown content."),
        h(
          "p",
          {},
          `[![icon](https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png)](https://github.com/ivgtr)`
        ),
        h("div", { class: "mt" }),
        h("h3", {}, "Cut the icon into various shapes."),
        h(
          "div",
          { class: "wrap" },
          h("img", {
            src: "/api?p=star&url=https://github.com/ivgtr.png",
          })
        ),
        h(
          "p",
          {},
          "Support: ",
          h("span", { class: "mark" }, "circle"),
          " | ",
          h("span", { class: "mark" }, "star")
        ),
        h(
          "p",
          {},
          `[![icon](https://crop-icon.vercel.app/api?p=star&url=https://github.com/ivgtr.png)](https://github.com/ivgtr)`
        ),
        h("div", { class: "mt" }),
        h("h2", { class: "mb0" }, "Supported"),
        h(
          "p",
          {},
          "Please contanct ",
          h(
            "a",
            {
              href: "https://github.com/ivgtr/crop-icon",
              target: "_brank",
              rel: "noopener noreferrer",
            },
            "GitHub"
          ),
          " or ",
          h(
            "a",
            {
              href: "https://twitter.com/ivgtr",
              target: "_brank",
              rel: "noopener noreferrer",
            },
            "Twitter"
          ),
          "."
        )
      )
    )
  );

  return head + element;
};
