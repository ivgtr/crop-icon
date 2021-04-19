import axios from 'axios'
import imageSize from 'image-size'
import { query } from './@types/Query'
import h from './tag'

export const createImageElement = async ({ url }: query) => {
  const { buffer, ofset } = await axios
    .get(url as string, { responseType: 'arraybuffer' })
    .then((response) => ({
      buffer: Buffer.from(response.data, 'binary').toString('base64'),
      ofset: imageSize(response.data)
    }))

  return {
    content: h('image', {
      href: `data:image/jpeg;base64,${buffer}`,
      x: '0',
      y: '0',
      height: '100%',
      width: '100%',
      mask: 'url(#mask)'
    }),
    ofset_w: ofset.width as number,
    ofset_h: ofset.height as number
  }
}
