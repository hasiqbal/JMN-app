import { EID_GUIDE } from './eid';
import { GHUSL_GUIDE } from './ghusl';
import { JANAZAH_GUIDE } from './janazah';
import { JUMUAH_GUIDE } from './jumuah';
import { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
import { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
import { NORMAL_SALAH_GUIDE } from './normalSalah';
import { QADA_GUIDE } from './qada';
import { SALAH_BREAKERS_GUIDE } from './salahBreakers';
import { SALAH_MAKRUH_GUIDE } from './salahMakruh';
import { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
import { WITR_ISHA_GUIDE } from './witrIsha';
import { WUDHU_GUIDE } from './wudhu';

export { EID_GUIDE } from './eid';
export { GHUSL_GUIDE } from './ghusl';
export { JANAZAH_GUIDE } from './janazah';
export { JUMUAH_GUIDE } from './jumuah';
export { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
export { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
export { NORMAL_SALAH_GUIDE } from './normalSalah';
export { QADA_GUIDE } from './qada';
export { SALAH_BREAKERS_GUIDE } from './salahBreakers';
export { SALAH_MAKRUH_GUIDE } from './salahMakruh';
export { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
export { WITR_ISHA_GUIDE } from './witrIsha';
export { WUDHU_GUIDE } from './wudhu';
export type { HowToGuide, HowToSection, HowToStep } from './types';

export const SALAH_GUIDES = [
  NORMAL_SALAH_GUIDE,
  MISSED_UNITS_RKAAT_GUIDE,
  SALAH_CONDITIONS_FARAID_GUIDE,
  SALAH_WAJIBAT_GUIDE,
  SALAH_BREAKERS_GUIDE,
  SALAH_MAKRUH_GUIDE,
  WITR_ISHA_GUIDE,
  JUMUAH_GUIDE,
];

export const HOW_TO_GUIDES = [
  // Purification
  WUDHU_GUIDE,
  GHUSL_GUIDE,

  // Salah parent group
  ...SALAH_GUIDES,

  // Existing detailed guides
  EID_GUIDE,
  QADA_GUIDE,
  JANAZAH_GUIDE,
];
