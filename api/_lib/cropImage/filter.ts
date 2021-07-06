import { CropPattern } from "../perser";
import h from "../utils/tag";

export const createFilter = ({
  pattern,
  width,
  height,
}: {
  pattern: CropPattern;
  width: number;
  height: number;
}) => {
  if (pattern === "circle") {
    return h(
      "mask",
      {
        id: "mask",
      },
      h("circle", { cx: "50%", cy: "50%", r: "50%", fill: "#fff" })
    );
  } else if (pattern === "star") {
    return h(
      "mask",
      {
        id: "mask",
      },
      h("polygon", {
        points: `${Math.round(width / 2)},0 ${Math.round(
          (3 * width) / 16
        )},${height} ${width},${Math.round(height / 3)} 0,${Math.round(height / 3)} ${Math.round(
          (13 * width) / 16
        )},${height}`,
        fill: "#fff",
      })
    );
  } else if (pattern === "hart") {
    return h(
      "mask",
      {
        id: "mask",
      },
      h("path", {
        d: `M${Math.round(width * 0.1)},${Math.round(width * 0.3)} 
            A${Math.round(width * 0.2)},${Math.round(width * 0.2)},0,0,1,${Math.round(
          width * 0.5
        )},${Math.round(width * 0.3)} 
            A${Math.round(width * 0.2)},${Math.round(width * 0.2)},0,0,1,${Math.round(
          width * 0.9
        )},${Math.round(width * 0.3)} 
            Q${Math.round(width * 0.9)},${Math.round(width * 0.6)},${Math.round(
          width * 0.5
        )},${Math.round(width * 0.9)} 
            Q${Math.round(width * 0.1)},${Math.round(width * 0.6)},${Math.round(
          width * 0.1
        )},${Math.round(width * 0.3)} Z`,
        fill: "#fff",
      })
    );
  }
  return null;
};
