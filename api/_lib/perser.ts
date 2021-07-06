import { VercelRequestQuery } from "@vercel/node";

export type CropPattern = "circle" | "star" | "hart";

export type Options = {
  url: string;
  pattern: CropPattern;
  width?: string;
  height?: string;
};

export type RequestQueryOptions = {
  url: string;
  p?: CropPattern;
  width?: string;
  height?: string;
};

export const parseRequest = (query: VercelRequestQuery & RequestQueryOptions) => {
  const { url, p = "circle", width, height } = query;

  return { url, pattern: p, width, height };
};
