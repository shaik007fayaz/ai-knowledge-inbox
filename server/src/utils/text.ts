export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
