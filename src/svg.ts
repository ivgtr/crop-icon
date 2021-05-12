import type { query } from './@types/Query'
import { createImageElement } from './create'
import { createFilter } from './filter'
import h from './tag'

const svgID = 'profile-icon'

export const createSVG = async ({ url, width, height, p = 'circle' }: query): Promise<string> => {
  const { content, ofset_w, ofset_h } = await createImageElement({ url })

  const mask = createFilter(p, Number(width || ofset_w), Number(height || ofset_h))

  const element = h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${width || ofset_w} ${height || ofset_h}`,
      id: svgID
    },
    h(
      'svg',
      {
        width: width || ofset_w,
        height: height || ofset_h,
        x: 0,
        y: 0,
        class: 'box'
      },
      content,
      mask ? mask : ''
    )
  )

  return element
}
