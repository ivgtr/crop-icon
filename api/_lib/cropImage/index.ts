import { Options } from "../perser";
import h from "../utils/tag";
import { createImageElement } from "./create";
import { createFilter } from "./filter";

const svgID = "profile-icon";

export const cropImage = async ({ url, width, height, pattern }: Options): Promise<string> => {
  const { content, ofset_w, ofset_h } = await createImageElement(url);

  const mask = createFilter({
    pattern,
    width: Number(width || ofset_w),
    height: Number(height || ofset_h),
  });

  return h(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${width || ofset_w} ${height || ofset_h}`,
      id: svgID,
    },
    h(
      "svg",
      {
        width: width || ofset_w,
        height: height || ofset_h,
        x: 0,
        y: 0,
        class: "box",
      },
      content,
      mask ? mask : ""
    )
  );
};
