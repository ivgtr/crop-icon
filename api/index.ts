import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cropImage } from "./_lib/cropImage";
import { html } from "./_lib/html";
import { Options, parseRequest } from "./_lib/perser";

const CACHE_MAX_AGE = 60 * 60 * 24;

export default async (request: VercelRequest & { query: Options }, response: VercelResponse) => {
  if (!request.query?.url) {
    response.writeHead(200, {
      "Content-Type": "text/html",
    });
    return response.end(html());
  }
  try {
    const options: Options = parseRequest(request.query);

    const svg = await cropImage(options);

    response.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Content-Length": svg.length,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate`,
    });
    return response.end(svg);
  } catch {
    response.writeHead(404);
    return response.end();
  }
};
