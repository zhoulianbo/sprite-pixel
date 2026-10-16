import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tools = {
  gif: 'gif-to-sprite-sheet',
  video: 'video-to-sprite-sheet',
  background: 'transparent-background-maker',
  gifBackground: 'gif-background-remover',
};
const keywords = {
  en: [
    'gif to sprite sheet',
    'video to sprite sheet',
    'transparent background maker',
    'gif background remover',
  ],
  zh: ['GIF 转精灵图', '视频转精灵图', '透明背景制作', 'GIF 去背景'],
  'zh-Hant': ['GIF 轉精靈圖', '影片轉精靈圖', '圖片去背', 'GIF 去背'],
  ja: [
    'GIF スプライトシート変換',
    '動画スプライトシート変換',
    '画像背景透過',
    'GIF 背景透過',
  ],
  ko: [
    'GIF 스프라이트 시트 변환',
    '동영상 스프라이트 시트 변환',
    '이미지 배경 제거',
    'GIF 배경 제거',
  ],
};
const freeLabels = {
  en: 'Free',
  zh: '免费',
  'zh-Hant': '免費',
  ja: '無料',
  ko: '무료',
};
const read = (locale, file) =>
  JSON.parse(
    readFileSync(`src/config/locale/messages/${locale}/${file}.json`, 'utf8')
  );
const leaves = (value, prefix = '') =>
  Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === 'object'
        ? Object.entries(leaves(child, `${prefix}${key}.`))
        : [[`${prefix}${key}`, child]]
    )
  );
const placeholders = (value) => value.match(/\{\w+\}/g)?.sort() || [];
function parity(source, translated, label) {
  const expected = leaves(source),
    actual = leaves(translated);
  assert.deepEqual(
    Object.keys(actual).sort(),
    Object.keys(expected).sort(),
    `${label}: keys`
  );
  for (const key of Object.keys(expected)) {
    assert.equal(typeof actual[key], 'string', `${label}.${key}: string`);
    assert.ok(actual[key].trim(), `${label}.${key}: empty`);
    assert.deepEqual(
      placeholders(actual[key]),
      placeholders(expected[key]),
      `${label}.${key}: placeholders`
    );
  }
}
const en = read('en', 'tools/sprites');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
  (match) => match[1]
);
for (const [locale, terms] of Object.entries(keywords)) {
  const data = read(locale, 'tools/sprites');
  parity(en.ui.freeTools, data.ui.freeTools, `${locale}.ui.freeTools`);
  const nav = read(locale, 'landing').header.nav.items.find((item) =>
    item.children?.some((child) => child.url === '/sprite-sheet-maker')
  );
  assert.equal(nav.children.length, 7, `${locale}: seven tools`);
  for (const item of nav.children) {
    assert.ok(item.title && item.description);
    if (item.url !== '/ai-game-icon-generator')
      assert.equal(item.badge, freeLabels[locale]);
  }
  for (const [index, [tool, path]] of Object.entries(tools).entries()) {
    const copy = data[tool],
      keyword = terms[index];
    parity(en[tool], copy, `${locale}.${tool}`);
    parity(
      read('en', 'common').moreTools.items[tool],
      read(locale, 'common').moreTools.items[tool],
      `${locale}.moreTools.${tool}`
    );
    assert.ok(
      copy.title.startsWith(freeLabels[locale]),
      `${locale}/${path}: free H1`
    );
    assert.ok(
      copy.title.toLowerCase().includes(keyword.toLowerCase()),
      `${locale}/${path}: keyword H1`
    );
    assert.ok(
      copy.metadata.title.toLowerCase().includes(keyword.toLowerCase())
    );
    assert.ok(
      copy.metadata.description.toLowerCase().includes(keyword.toLowerCase())
    );
    assert.ok(nav.children.some((child) => child.url === `/${path}`));
    const footerItem = read(locale, 'landing')
      .footer.nav.items.flatMap((group) => group.children)
      .find((item) => item.url === `/${path}`);
    assert.equal(
      footerItem?.title,
      nav.children.find((item) => item.url === `/${path}`).title,
      `${locale}/${path}: localized footer`
    );
    const url = (l) =>
      `https://spritepixel.com${l === 'en' ? '' : `/${l}`}/${path}`;
    const matches = entries.filter((entry) =>
      entry.includes(`<loc>${url(locale)}</loc>`)
    );
    assert.equal(matches.length, 1, `${locale}/${path}: unique sitemap entry`);
    for (const l of Object.keys(keywords))
      assert.ok(
        matches[0].includes(
          `hreflang="${l === 'zh' ? 'zh-Hans' : l}" href="${url(l)}"`
        ),
        `${locale}/${path}: alternate ${l}`
      );
    assert.ok(matches[0].includes(`hreflang="x-default" href="${url('en')}"`));
    // Visible editorial content, with FAQ expanded; excludes navigation,
    // workbench states, footer, metadata and unused design labels.
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
            ...new Intl.Segmenter(locale, { granularity: 'word' }).segment(
              text
            ),
          ].filter((word) => word.isWordLike).length;
    const count = text.toLowerCase().split(keyword.toLowerCase()).length - 1;
    const density = (100 * count) / total;
    assert.ok(
      density >= 1 && density <= 3,
      `${locale}/${path}: ${density.toFixed(2)}%`
    );
    console.log(
      `${locale}/${path}: ${total} words, ${count} phrases, ${density.toFixed(2)}%`
    );
  }
}
console.log(
  'Five-locale keys, placeholders, navigation, reciprocal sitemap alternates, titles and keyword density passed.'
);
