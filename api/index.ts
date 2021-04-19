import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { query } from '../src/@types/Query.d'
import { html } from '../src/html'
import { createSVG } from '../src/svg'

const CACHE_MAX_AGE = 60 * 60 * 2

export default async (req: VercelRequest & { query: query }, res: VercelResponse) => {
  const { url, pattern, width, height } = req.query

  if (!url) {
    res.writeHead(200, {
      'Content-Type': 'text/html'
      // 'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`
    })
    return res.end(html())
  }

  const svg = await createSVG({ url, pattern, width, height })

  res.writeHead(200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`
  })
  return res.end(svg)
}
