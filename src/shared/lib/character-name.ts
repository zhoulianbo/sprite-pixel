/** Suggest a short editable name, independently of the interface language. */
export function characterNameFromPrompt(prompt: string) {
  const text = prompt.trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const letters = text.match(/\p{L}/gu) || [];
  if (
    letters.length &&
    letters.every((letter) => /\p{Script=Latin}/u.test(letter))
  )
    return text.split(' ').slice(0, 3).join(' ');

  let name = '';
  let width = 0;
  const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const { segment } of segments.segment(text)) {
    const units = /[^\u0000-\u00ff]/u.test(segment) ? 2 : 1;
    if (width + units > 12) break;
    name += segment;
    width += units;
  }
  return name.trimEnd();
}
