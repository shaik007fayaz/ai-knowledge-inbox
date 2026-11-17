const STOPWORDS = new Set(
  'a an and are as at be but by for from has have how i if in is it its of on or that the their this to was what when where which who why will with you your title can do does about tell me'.split(
    ' ',
  ),
);

/** Lowercased word tokens without stopwords. Shared by the mock embedder and mock LLM. */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}
