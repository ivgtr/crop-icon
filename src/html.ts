import s from './style'
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
      h('title', {}, 'icon.io'),
      h(
        'style',
        {},
        s('.container', { maxWidth: '724px', margin: '0 auto 0' }),
        s('.flex', { display: 'flex' }),
        s('.m-t', { marginTop: '30px' }),
        s('.align-center', { alignItems: 'center' }),
        s('.justify-center', { justifyContent: 'center' }),
        s('.wrap', { height: '150px', width: '150px' }),
        s('.wrap img', { height: '100%', width: '100%', objectFit: 'contain' }),
        s('.arrow', {
          display: 'inline-block',
          height: '18px',
          width: '18px',
          margin: '0 10px',
          borderTop: '4px solid #3e3e3e',
          borderRight: '4px solid #3e3e3e',
          transform: 'rotate(45deg)'
        })
      )
    ),
    h(
      'body',
      {},
      h(
        'div',
        { class: 'container' },
        h('h1', {}, 'This API will crop the icon in a nice way.'),
        h('div', { class: 'm-t' }),
        h(
          'p',
          {},
          'sample:) ',
          h(
            'a',
            {
              href: 'https://profile-icon.vercel.app/api?url=https://github.com/ivgtr.png',
              target: '_brank',
              rel: 'noopener noreferrer'
            },
            'https://profile-icon.vercel.app/api?url=https://github.com/ivgtr.png'
          )
        ),
        h(
          'div',
          { class: 'flex' },
          h('div', { class: 'wrap' }, h('img', { src: 'https://github.com/ivgtr.png' })),
          h(
            'div',
            { class: 'wrap flex align-center justify-center' },
            h('span', { class: 'arrow' })
          ),
          h(
            'div',
            { class: 'wrap' },
            h('img', {
              src: 'https://profile-icon.vercel.app/api?url=https://github.com/ivgtr.png'
            })
          )
        ),
        h('div', { class: 'm-t' }),
        h('h4', {}, 'You can copy-paste this into markdown content.'),
        h(
          'p',
          {},
          `[![icon](https://profile-icon.vercel.app/api?url=https://github.com/ivgtr.png)](https://github.com/ivgtr)`
        )
      )
    )
  )

  return head + element
}
