export type MushafPageAyatMap = Record<number, [number, number]>;

// Manual page-to-ayah ranges for locally bundled surah image viewers.
// Update these maps page by page as you verify each surah against the Mushaf images.

export const KAHF_PAGE_AYAT: MushafPageAyatMap = {
  293: [1, 8],
  294: [9, 16],
  295: [17, 24],
  296: [25, 32],
  297: [33, 41],
  298: [42, 50],
  299: [51, 59],
  300: [60, 69],
  301: [70, 78],
  302: [79, 88],
  303: [89, 98],
  304: [99, 110],
};

export const MULK_PAGE_AYAT: MushafPageAyatMap = {
  562: [1, 12],
  563: [13, 22],
  564: [23, 30],
};

export const LUQMAN_PAGE_AYAT: MushafPageAyatMap = {
  411: [1, 11],
  412: [12, 19],
  413: [20, 28],
  414: [29, 34],
};

export const IMRAN_PAGE_AYAT: MushafPageAyatMap = {
  75: [190, 194],
  76: [195, 200],
};

export const SAJDAH_PAGE_AYAT: MushafPageAyatMap = {
  415: [1, 12],
  416: [13, 22],
  417: [23, 30],
};