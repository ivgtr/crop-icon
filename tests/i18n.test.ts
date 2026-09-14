import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { en } from '../api/_lib/locales/en.js';
import { ja } from '../api/_lib/locales/ja.js';
import { isLocale, isMessageKey, translate } from '../api/_lib/i18n.js';
import { html } from '../api/_lib/html.js';
import { PATTERNS } from '../api/_lib/core.js';

const markup = () => html().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test('Japanese has exactly the English keys and interpolation fields', () => {
  assert.deepEqual(Object.keys(ja).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.ok(isMessageKey(key));
    assert.ok(ja[key].length > 0, key);
    assert.deepEqual(placeholders(ja[key]), placeholders(en[key]), key);
  }
  for (const pattern of PATTERNS) {
    assert.ok(en[pattern]);
    assert.ok(ja[pattern]);
  }
});
test('only en/ja are accepted and message lookup excludes inherited keys', () => {
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('ja'), true);
  for (const value of ['fr', 'ja-JP', undefined, null, {}, 1]) assert.equal(isLocale(value), false);
  assert.equal(isMessageKey('introTitle'), true);
  assert.equal(isMessageKey('toString'), false);
  assert.equal(isMessageKey('__proto__'), false);
});
test('interpolation is one pass and does not interpret filename contents', () => {
  const name = '<img src=x> {kind} $&';
  assert.equal(translate('en', 'localSource', { name }), `${name} · on-device, never uploaded`);
  assert.equal(translate('ja', 'localSource', { name }), `${name} ／ 端末内で編集・アップロードなし`);
  assert.equal(translate('ja', 'sourceInfo', { width: 32, height: 16, kind: '公開URL' }), '元画像 32 × 16 ／ 公開URL');
});
test('server markup starts in English, with the public GitHub image prefilled', () => {
  const page = markup();
  assert.match(page, /<html lang="en">/);
  assert.match(page, /<input[^>]*id="url"[^>]*value="https:\/\/github.com\/ivgtr.png"/);
  assert.match(page, /id="language"/);
  assert.match(page, /<option value="en" lang="en">English<\/option>/);
  assert.match(page, /<option value="ja" lang="ja">日本語<\/option>/);
  assert.match(page, /Crop an image/);
});
test('all rendered translation markers use known message keys', () => {
  const keys = [...markup().matchAll(/data-i18n(?:-(?:aria-label|alt|placeholder|content))?="([^"]+)"/g)].map(match => match[1]);
  assert.ok(keys.length > 60);
  for (const key of keys) assert.ok(isMessageKey(key), key);
});
test('abstract demo copy and the generated sample image are removed', () => {
  assert.doesNotMatch(markup(), /One image\.|One source\.|The cutting room|TAKE IT ANYWHERE|Make the cut|Find the fit|ready to play/);
  const editor = readFileSync('api/_lib/editor/index.ts', 'utf8');
  assert.doesNotMatch(editor, /canvas\.toDataURL|ctx\.fillRect|ctx\.arc/);
  assert.match(editor, /loadUrl\(\$\('url'\)\.value\)/);
});
