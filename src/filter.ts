import h from './tag'

export const createFilter = (pattern: string) => {
  if (pattern === 'circle') {
    return h(
      'mask',
      {
        id: 'mask'
      },
      h('circle', { cx: '50%', cy: '50%', r: '50%', fill: '#fff' })
    )
  }
  return null
}
