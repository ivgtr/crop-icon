import h from './tag'

export const html = () => {
  const head = '<!DOCTYPE html>'

  const element = h(
    'html',
    { lang: 'ja' },
    h(
      'head',
      {},
      h('meta', { charset: 'UTF-8' }),
      h('meta', {
        'http-equiv': 'X-UA-Compatible',
        content: 'IE=edge'
      }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
      h('title', {}, 'Profile Icon')
    ),
    h('body', {}, h('p', {}, 'アイコンをいい感じに切り抜いてくれるAPI'))
  )

  return head + element
}
