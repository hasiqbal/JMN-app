export type MushafLayout = '15line' | '16line';

export const MUSHAF_TOTAL_PAGES: Record<MushafLayout, number> = {
  '15line': 604,
  '16line': 557,
};

const JUZ_START_PAGE_15LINE: Record<number, number> = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
  11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
  21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582,
};

const JUZ_START_PAGE_16LINE: Record<number, number> = {
  1: 1, 2: 21, 3: 38, 4: 57, 5: 76, 6: 94, 7: 113, 8: 131, 9: 149, 10: 168,
  11: 186, 12: 205, 13: 223, 14: 242, 15: 260, 16: 279, 17: 297, 18: 315, 19: 334, 20: 352,
  21: 371, 22: 389, 23: 408, 24: 426, 25: 445, 26: 463, 27: 481, 28: 500, 29: 518, 30: 537,
};

export function getMushafTotalPages(layout: MushafLayout): number {
  return MUSHAF_TOTAL_PAGES[layout];
}

export function getJuzStartPage(layout: MushafLayout, juz: number): number {
  if (layout === '16line') {
    return JUZ_START_PAGE_16LINE[juz] ?? 1;
  }
  return JUZ_START_PAGE_15LINE[juz] ?? 1;
}

export function getJuzEndPage(layout: MushafLayout, juz: number): number {
  const totalPages = getMushafTotalPages(layout);
  if (juz >= 30) return totalPages;
  return (getJuzStartPage(layout, juz + 1) ?? (totalPages + 1)) - 1;
}
