import { EID_GUIDE } from './eid';
import { FASTING_FOUNDATIONS_GUIDE } from './fastingFoundations';
import { FOLLOW_IMAM_GUIDE } from './followImam';
import { GHUSL_GUIDE } from './ghusl';
import { HAJJ_HANAFI_GUIDE } from './hajjHanafiGuide';
import { JANAZAH_GUIDE } from './janazah';
import { JUMUAH_GUIDE } from './jumuah';
import { MADHUR_GUIDE } from './madhur';
import { MASAH_INJURIES_WUDHU_GUIDE } from './masahInjuriesWudhu';
import { MASAH_LEATHER_SOCKS_GUIDE } from './masahLeatherSocks';
import { MENSTRUATION_NIFAS_GUIDE } from './menstruationNifas';
import { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
import { QADA_KAFFARAH_FASTING_GUIDE } from './qadaKaffarahFasting';
import { RAMADAN_ESSENTIALS_GUIDE } from './ramadanEssentials';
import { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
import { NORMAL_SALAH_GUIDE } from './normalSalah';
import { QADA_GUIDE } from './qada';
import { SAJDAH_SAHW_GUIDE } from './sajdahSahw';
import { SALAH_TRAVELLER_GUIDE } from './salahTraveller';
import { SALAT_TASBIH_GUIDE } from './salatTasbih';
import { SALAH_BREAKERS_GUIDE } from './salahBreakers';
import { SALAH_MAKRUH_GUIDE } from './salahMakruh';
import { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
import { TAYAMMUM_GUIDE } from './tayammum';
import { UMRAH_HANAFI_GUIDE } from './umrahHanafi';
import { WITR_ISHA_GUIDE } from './witrIsha';
import { WUDHU_GUIDE } from './wudhu';
import { ZAKAAT_AL_FITR_GUIDE } from './zakaatAlFitr';
import { ZAKAAT_CALCULATION_EXAMPLES_GUIDE } from './zakaatCalculationExamples';
import { ZAKAAT_CORE_GUIDE } from './zakaatCore';
import { ZIYARAH_MADINAH_GUIDE } from './ziyarahMadinahGuide';

export { EID_GUIDE } from './eid';
export { FASTING_FOUNDATIONS_GUIDE } from './fastingFoundations';
export { FOLLOW_IMAM_GUIDE } from './followImam';
export { GHUSL_GUIDE } from './ghusl';
export { HAJJ_HANAFI_GUIDE } from './hajjHanafiGuide';
export { JANAZAH_GUIDE } from './janazah';
export { JUMUAH_GUIDE } from './jumuah';
export { MADHUR_GUIDE } from './madhur';
export { MASAH_INJURIES_WUDHU_GUIDE } from './masahInjuriesWudhu';
export { MASAH_LEATHER_SOCKS_GUIDE } from './masahLeatherSocks';
export { MENSTRUATION_NIFAS_GUIDE } from './menstruationNifas';
export { MISSED_UNITS_RKAAT_GUIDE } from './missedUnitsRkaat';
export { QADA_KAFFARAH_FASTING_GUIDE } from './qadaKaffarahFasting';
export { RAMADAN_ESSENTIALS_GUIDE } from './ramadanEssentials';
export { SALAH_CONDITIONS_FARAID_GUIDE } from './salahConditionsFaraid';
export { NORMAL_SALAH_GUIDE } from './normalSalah';
export { QADA_GUIDE } from './qada';
export { SAJDAH_SAHW_GUIDE } from './sajdahSahw';
export { SALAH_TRAVELLER_GUIDE } from './salahTraveller';
export { SALAT_TASBIH_GUIDE } from './salatTasbih';
export { SALAH_BREAKERS_GUIDE } from './salahBreakers';
export { SALAH_MAKRUH_GUIDE } from './salahMakruh';
export { SALAH_WAJIBAT_GUIDE } from './salahWajibat';
export { TAYAMMUM_GUIDE } from './tayammum';
export { UMRAH_HANAFI_GUIDE } from './umrahHanafi';
export { WITR_ISHA_GUIDE } from './witrIsha';
export { WUDHU_GUIDE } from './wudhu';
export { ZAKAAT_AL_FITR_GUIDE } from './zakaatAlFitr';
export { ZAKAAT_CALCULATION_EXAMPLES_GUIDE } from './zakaatCalculationExamples';
export { ZAKAAT_CORE_GUIDE } from './zakaatCore';
export { ZIYARAH_MADINAH_GUIDE } from './ziyarahMadinahGuide';
export type { HowToGuide, HowToSection, HowToStep, HowToStepImage } from './types';

export const PURIFICATION_GUIDES = [
  WUDHU_GUIDE,
  GHUSL_GUIDE,
  MENSTRUATION_NIFAS_GUIDE,
  TAYAMMUM_GUIDE,
  MADHUR_GUIDE,
  MASAH_INJURIES_WUDHU_GUIDE,
  MASAH_LEATHER_SOCKS_GUIDE,
];

export const FASTING_GUIDES = [
  FASTING_FOUNDATIONS_GUIDE,
  RAMADAN_ESSENTIALS_GUIDE,
  QADA_KAFFARAH_FASTING_GUIDE,
];

export const ZAKAAT_GUIDES = [
  ZAKAAT_CORE_GUIDE,
  ZAKAAT_AL_FITR_GUIDE,
  ZAKAAT_CALCULATION_EXAMPLES_GUIDE,
];

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
  ...PURIFICATION_GUIDES,

  // Fasting
  ...FASTING_GUIDES,

  // Zakaat
  ...ZAKAAT_GUIDES,

  // Hajj and Umrah
  HAJJ_HANAFI_GUIDE,
  UMRAH_HANAFI_GUIDE,
  ZIYARAH_MADINAH_GUIDE,

  // Salah parent group
  ...SALAH_GUIDES,
];
