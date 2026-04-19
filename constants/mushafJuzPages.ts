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
  1: 1, 2: 20, 3: 38, 4: 56, 5: 74, 6: 92, 7: 110, 8: 128, 9: 146, 10: 164,
  11: 182, 12: 200, 13: 218, 14: 236, 15: 254, 16: 272, 17: 290, 18: 308, 19: 326, 20: 344,
  21: 362, 22: 380, 23: 398, 24: 416, 25: 434, 26: 452, 27: 470, 28: 488, 29: 508, 30: 528,
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
  if (layout === '16line') {
    if (juz >= 30) return totalPages;
    return Math.max(
      getJuzStartPage(layout, juz),
      (getJuzStartPage(layout, juz + 1) ?? (totalPages + 1)) - 1
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

  if (layout === '16line' && juz === 2) {
    return quarterStarts.map((item) =>
      item.quarter === 3
        ? { ...item, page: 29 }
        : item.quarter === 4
          ? { ...item, page: 34 }
          : item
    );
  }

  if (layout === '16line' && juz === 8) {
    return quarterStarts.map((item) =>
      item.quarter === 2
        ? { ...item, page: 131 }
        : item.quarter === 3
          ? { ...item, page: 135 }
          : item.quarter === 4
            ? { ...item, page: 140 }
            : item
    );
  }

  if (layout === '16line' && juz === 9) {
    return quarterStarts.map((item) =>
      item.quarter === 3
        ? { ...item, page: 153 }
        : item.quarter === 4
          ? { ...item, page: 159 }
          : item
    );
  }

  if (layout === '16line' && juz === 12) {
    return quarterStarts.map((item) =>
      item.quarter === 3
        ? { ...item, page: 208 }
        : item
    );
  }

  if (layout === '16line' && juz === 13) {
    return quarterStarts.map((item) =>
      item.quarter === 3
        ? { ...item, page: 206 }
        : item
    );
  }

  if (layout === '16line' && juz === 14) {
    return quarterStarts.map((item) =>
      item.quarter === 3
        ? { ...item, page: 244 }
        : item.quarter === 4
          ? { ...item, page: 249 }
          : item
    );
  }

  if (layout === '16line' && juz !== 2) {
    return quarterStarts.map((item) =>
      item.quarter === 3 || item.quarter === 4
        ? { ...item, page: item.page + 1 }
        : item
    );
  }

  return quarterStarts;
}
