import { EID_GUIDE } from './eid';
import { FOLLOW_IMAM_GUIDE } from './followImam';
import { GHUSL_GUIDE } from './ghusl';
import { HAJJ_HANAFI_GUIDE } from './hajjHanafiGuide';
import { JANAZAH_GUIDE } from './janazah';
import { JUMUAH_GUIDE } from './jumuah';
import { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
import { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
import { NORMAL_SALAH_GUIDE } from './normalSalah';
import { QADA_GUIDE } from './qada';
import { SAJDAH_SAHW_GUIDE } from './sajdahSahw';
import { SALAH_TRAVELLER_GUIDE } from './salahTraveller';
import { SALAT_TASBIH_GUIDE } from './salatTasbih';
import { SALAH_BREAKERS_GUIDE } from './salahBreakers';
import { SALAH_MAKRUH_GUIDE } from './salahMakruh';
import { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
import { UMRAH_HANAFI_GUIDE } from './umrahHanafi';
import { WITR_ISHA_GUIDE } from './witrIsha';
import { WUDHU_GUIDE } from './wudhu';
import { ZIYARAH_MADINAH_GUIDE } from './ziyarahMadinahGuide';

export { EID_GUIDE } from './eid';
export { FOLLOW_IMAM_GUIDE } from './followImam';
export { GHUSL_GUIDE } from './ghusl';
export { HAJJ_HANAFI_GUIDE } from './hajjHanafiGuide';
export { JANAZAH_GUIDE } from './janazah';
export { JUMUAH_GUIDE } from './jumuah';
export { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
export { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
export { NORMAL_SALAH_GUIDE } from './normalSalah';
export { QADA_GUIDE } from './qada';
export { SAJDAH_SAHW_GUIDE } from './sajdahSahw';
export { SALAH_TRAVELLER_GUIDE } from './salahTraveller';
export { SALAT_TASBIH_GUIDE } from './salatTasbih';
export { SALAH_BREAKERS_GUIDE } from './salahBreakers';
export { SALAH_MAKRUH_GUIDE } from './salahMakruh';
export { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
export { UMRAH_HANAFI_GUIDE } from './umrahHanafi';
export { WITR_ISHA_GUIDE } from './witrIsha';
export { WUDHU_GUIDE } from './wudhu';
export { ZIYARAH_MADINAH_GUIDE } from './ziyarahMadinahGuide';
export type { HowToGuide, HowToSection, HowToStep, HowToStepImage } from './types';

export const SALAH_GUIDES = [
  // Requested order
  SALAH_CONDITIONS_FARAID_GUIDE,
  NORMAL_SALAH_GUIDE,
  SALAH_WAJIBAT_GUIDE,
  SALAH_BREAKERS_GUIDE,
  SALAH_MAKRUH_GUIDE,
  MISSED_UNITS_RKAAT_GUIDE,
  FOLLOW_IMAM_GUIDE,
  WITR_ISHA_GUIDE,

  // Remaining guides: Janazah and Eid first
  JANAZAH_GUIDE,
  EID_GUIDE,
  JUMUAH_GUIDE,
  SAJDAH_SAHW_GUIDE,
  QADA_GUIDE,
  SALAH_TRAVELLER_GUIDE,
  SALAT_TASBIH_GUIDE,
];

export const HOW_TO_GUIDES = [
  // Purification
  WUDHU_GUIDE,
  GHUSL_GUIDE,

  // Hajj and Umrah
  HAJJ_HANAFI_GUIDE,
  UMRAH_HANAFI_GUIDE,
  ZIYARAH_MADINAH_GUIDE,

  // Salah parent group
  ...SALAH_GUIDES,
];
