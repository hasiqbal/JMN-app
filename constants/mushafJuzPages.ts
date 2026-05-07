export type MushafLayout = '15line' | '16line';

export const MUSHAF_TOTAL_PAGES: Record<MushafLayout, number> = {
  '15line': 611,
  '16line': 557,
};

const JUZ_START_PAGE_15LINE: Record<number, number> = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
  11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
  21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 586,
};

const JUZ_START_PAGE_16LINE: Record<number, number> = {
  1: 1, 2: 20, 3: 38, 4: 56, 5: 74, 6: 92, 7: 110, 8: 128, 9: 146, 10: 164,
  11: 182, 12: 200, 13: 218, 14: 236, 15: 254, 16: 272, 17: 290, 18: 308, 19: 326, 20: 344,
  21: 362, 22: 380, 23: 398, 24: 416, 25: 434, 26: 452, 27: 470, 28: 488, 29: 508, 30: 528,
};

const QUARTER_OVERRIDES_15LINE: Record<number, Partial<Record<2 | 3 | 4, number>>> = {
  1: { 2: 7, 3: 12, 4: 17 },
  2: { 2: 26, 3: 32, 4: 36 },
  3: { 2: 46, 3: 52, 4: 57 },
  4: { 2: 66, 3: 71, 4: 76 },
  5: { 2: 87, 3: 91, 4: 96 },
  6: { 2: 106, 3: 112, 4: 117 },
  7: { 2: 126, 3: 132, 4: 136 },
  8: { 2: 146, 3: 150, 4: 155 },
  9: { 2: 166, 3: 161, 4: 166 },
  10: { 2: 186, 3: 192, 4: 197 },
  11: { 2: 207, 3: 212, 4: 216 },
  12: { 2: 226, 3: 231, 4: 237 },
  13: { 2: 246, 3: 252, 4: 256 },
  14: { 2: 267, 3: 272, 4: 276 },
  15: { 2: 286, 3: 291, 4: 296 },
  16: { 2: 306, 3: 312, 4: 316 },
  17: { 2: 326, 3: 331, 4: 337 },
  18: { 2: 346, 3: 352, 4: 356 },
  19: { 2: 366, 3: 372, 4: 377 },
  20: { 2: 386, 3: 392, 4: 396 },
  21: { 2: 407, 3: 412, 4: 417 },
  22: { 2: 426, 3: 431, 4: 436 },
  23: { 2: 446, 3: 451, 4: 456 },
  24: { 2: 467, 3: 472, 4: 477 },
  25: { 2: 486, 3: 491, 4: 496 },
  26: { 2: 506, 3: 513, 4: 516 },
  27: { 2: 527, 3: 532, 4: 536 },
  28: { 2: 547, 3: 551, 4: 557 },
  29: { 2: 567, 3: 573, 4: 580 },
  30: { 2: 592, 3: 598, 4: 604 },
};

const QUARTER_OVERRIDES_16LINE: Record<number, Partial<Record<2 | 3 | 4, number>>> = {
  1: { 2: 7, 3: 11, 4: 15 },
  2: { 3: 29, 4: 34 },
  3: { 3: 47, 4: 51 },
  4: { 3: 65, 4: 69 },
  5: { 3: 83, 4: 87 },
  6: { 3: 101, 4: 105 },
  7: { 3: 119, 4: 123 },
  8: { 2: 131, 3: 135, 4: 140 },
  9: { 3: 154 },
  10: { 3: 173, 4: 177 },
  11: { 3: 191, 4: 195 },
  12: { 3: 208 },
  13: { 3: 208 },
  14: { 3: 244 },
  15: { 2: 258, 3: 263, 4: 267 },
  16: { 3: 281, 4: 285 },
  17: { 3: 299, 4: 303 },
  18: { 3: 317, 4: 321 },
  19: { 3: 335, 4: 339 },
  20: { 3: 353, 4: 357 },
  21: { 3: 371, 4: 376 },
  22: { 3: 388, 4: 393 },
  23: { 3: 406, 4: 411 },
  24: { 3: 424, 4: 429 },
  25: { 3: 442, 4: 447 },
  26: { 3: 462, 4: 465 },
  27: { 3: 479, 4: 483 },
  28: { 3: 497, 4: 503 },
  29: { 2: 512, 3: 518, 4: 523 },
  30: { 2: 533, 3: 538, 4: 543 },
};

export function getMushafTotalPages(layout: MushafLayout): number {
  return MUSHAF_TOTAL_PAGES[layout];
}

export function getJuzStartPage(layout: MushafLayout, juz: number): number {
  if (layout === '16line') {
    return Math.max(0, (JUZ_START_PAGE_16LINE[juz] ?? 1) - 1);
  }
  return JUZ_START_PAGE_15LINE[juz] ?? 1;
}

export function getJuzEndPage(layout: MushafLayout, juz: number): number {
  const totalPages = getMushafTotalPages(layout);
  if (layout === '16line') {
    if (juz >= 30) return Math.max(0, totalPages - 1);
    const nextStart = getJuzStartPage(layout, juz + 1);
    return Math.max(
      getJuzStartPage(layout, juz),
      nextStart > 0 ? (nextStart - 1) : (totalPages - 1)
    );
  }

  if (juz >= 30) return totalPages;
  return (getJuzStartPage(layout, juz + 1) ?? (totalPages + 1)) - 1;
}

export function getQuarterStartsInJuz(layout: MushafLayout, juz: number): Array<{ quarter: number; page: number }> {
  const startPage = getJuzStartPage(layout, juz);
  const endPage = getJuzEndPage(layout, juz);
  const totalPages = endPage - startPage + 1;

  const quarterStarts = [1, 2, 3, 4].map((quarter) => {
    const offset = Math.floor(((quarter - 1) * totalPages) / 4);
    return { quarter, page: startPage + offset };
  });

  if (layout === '16line') {
    const overrides = QUARTER_OVERRIDES_16LINE[juz];
    if (!overrides) return quarterStarts;

    return quarterStarts.map((item) => {
      const page = overrides[item.quarter as 2 | 3 | 4];
      return page ? { ...item, page: Math.max(0, page - 1) } : item;
    });
  }

  const overrides = QUARTER_OVERRIDES_15LINE[juz];
  if (!overrides) return quarterStarts;

  return quarterStarts.map((item) => {
    const page = overrides[item.quarter as 2 | 3 | 4];
    return page ? { ...item, page } : item;
  });
}
