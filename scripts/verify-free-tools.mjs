import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tools = {
  gif: ['gif to sprite sheet', 'GIF 转精灵图', 'gif-to-sprite-sheet'],
  video: ['video to sprite sheet', '视频转精灵图', 'video-to-sprite-sheet'],
  background: [
    'transparent background maker',
    '透明背景制作',
    'transparent-background-maker',
  ],
  gifBackground: [
    'gif background remover',
    'GIF 去背景',
    'gif-background-remover',
  ],
};
const read = (locale, file) =>
  JSON.parse(
    readFileSync(`src/config/locale/messages/${locale}/${file}.json`, 'utf8')
  );
const keys = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object'
      ? keys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
const en = read('en', 'tools/sprites'),
  zh = read('zh', 'tools/sprites');
assert.deepEqual(keys(en.ui.freeTools).sort(), keys(zh.ui.freeTools).sort());
function placeholders(value) {
  return (
    JSON.stringify(value)
      .match(/\{\w+\}/g)
      ?.sort() || []
  );
}
assert.deepEqual(placeholders(en.ui.freeTools), placeholders(zh.ui.freeTools));
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
for (const locale of ['en', 'zh']) {
  const data = locale === 'en' ? en : zh;
  const nav = read(locale, 'landing').header.nav.items.find((item) =>
    item.children?.some((child) => child.url === '/sprite-sheet-maker')
  );
  assert.equal(nav.children.length, 7);
  for (const [tool, words] of Object.entries(tools)) {
    const copy = data[tool],
      keyword = words[locale === 'en' ? 0 : 1],
      path = words[2];
    assert.deepEqual(keys(en[tool]).sort(), keys(zh[tool]).sort());
    assert.ok(copy.title.startsWith(locale === 'en' ? 'Free ' : '免费'));
    assert.ok(nav.children.some((child) => child.url === `/${path}`));
    assert.ok(
      sitemap.includes(
        `<loc>https://spritepixel.com${locale === 'zh' ? '/zh' : ''}/${path}</loc>`
      )
    );
    const text = [
      copy.title,
      copy.design.hero,
      copy.stepsTitle,
      copy.featuresTitle,
      copy.intro,
      copy.useCasesTitle,
      copy.guideTitle,
      copy.faqTitle,
      copy.faqText,
      copy.ctaTitle,
      copy.ctaText,
      ...['steps', 'features', 'useCases', 'guide', 'faq'].flatMap((key) =>
        copy[key].flatMap((item) => [item.title, item.text])
      ),
    ].join(' ');
    const total =
      locale === 'en'
        ? text.match(/\b[\w'-]+\b/g).length
        : [
            ...new Intl.Segmenter('zh', { granularity: 'word' }).segment(text),
          ].filter((word) => word.isWordLike).length;
    const count = text.toLowerCase().split(keyword.toLowerCase()).length - 1;
    const density = (100 * count) / total;
    assert.ok(density >= 1 && density <= 3, `${locale}/${path}: ${density}`);
    console.log(
      `${locale}/${path}: ${total} words, ${count} phrases, ${density.toFixed(2)}%`
    );
  }
}
console.log(
  'Locale keys, placeholders, navigation, sitemap, titles and keyword density passed.'
);
