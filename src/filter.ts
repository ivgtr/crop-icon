import h from './tag'

export const createFilter = (pattern: string, width: number, height: number) => {
  if (pattern === 'circle') {
    return h(
      'mask',
      {
        id: 'mask'
      },
      h('circle', { cx: '50%', cy: '50%', r: '50%', fill: '#fff' })
    )
  } else if (pattern === 'star') {
    return h(
      'mask',
      {
        id: 'mask'
      },
      h('polygon', {
        points: `${Math.round(width / 2)},0 ${Math.round(
          (3 * width) / 16
        )},${height} ${width},${Math.round(height / 3)} 0,${Math.round(height / 3)} ${Math.round(
          (13 * width) / 16
        )},${height}`,
        fill: '#fff'
      })
    )
  }
  return null
}
