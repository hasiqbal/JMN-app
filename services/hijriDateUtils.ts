const ARABIC_MONTHS_MAP: Record<string, string> = {
  'ذو القعدة': "Dhul Qa'dah",
  'ذو الحجّة': 'Dhul Hijjah',
  'ربيع الأوّل': "Rabi' al-Awwal",
  'ربيع الآخر': "Rabi' al-Akhir",
  'جمادى الأولى': 'Jumada al-Ula',
  'جمادى الآخرة': 'Jumada al-Akhirah',
  'محرّم': 'Muharram',
  'رجب': 'Rajab',
  'شعبان': "Sha'ban",
  'رمضان': 'Ramadan',
  'شوّال': 'Shawwal',
  'صفر': 'Safar',
};

function getHijriMonthEnglish(hijri: string): string {
  const sorted = Object.entries(ARABIC_MONTHS_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [arabicMonth, englishMonth] of sorted) {
    if (hijri.includes(arabicMonth)) return englishMonth;
  }
  return '';
}

export function getHijriDayNumber(hijri: string): string {
  const match = hijri.match(/\b(\d{1,2})\b/);
  return match ? match[1] : '';
}

export function getHijriMonthFromAnyFormat(hijri: string): string {
  const arabicMonth = getHijriMonthEnglish(hijri);
  if (arabicMonth) return arabicMonth;

  const match = hijri.replace(/\bAH\b/gi, '').trim().match(/^\d{1,2}\s+(.+?)\s+\d{4}$/);
  return match?.[1]?.trim() ?? '';
}
