export const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'bedtime',
  Sunrise: 'wb-sunny',
  Ishraq: 'flare',
  Zawaal: 'blur-on',
  Dhuhr: 'wb-sunny',
  Asr: 'wb-cloudy',
  Maghrib: 'nights-stay',
  Isha: 'nightlight-round',
  Jumuah: 'star',
  Eid: 'celebration',
  EidAdha: 'celebration',
};

export const PRAYER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  Fajr: ['rgba(34,58,122,0.32)', 'rgba(110,154,224,0.24)'],
  Sunrise: ['rgba(150,70,10,0.38)', 'rgba(215,140,40,0.35)'],
  Ishraq: ['rgba(166,86,16,0.37)', 'rgba(233,174,70,0.33)'],
  Zawaal: ['rgba(95,92,70,0.39)', 'rgba(136,130,102,0.36)'],
  Dhuhr: ['rgba(12,80,130,0.39)', 'rgba(20,138,178,0.35)'],
  Asr: ['rgba(130,66,18,0.39)', 'rgba(198,112,45,0.35)'],
  Maghrib: ['rgba(62,25,95,0.40)', 'rgba(135,54,96,0.36)'],
  Isha: ['rgba(12,22,58,0.42)', 'rgba(36,46,98,0.39)'],
  Jumuah: ['rgba(44,84,66,0.41)', 'rgba(92,136,116,0.37)'],
  Eid: ['rgba(150,114,28,0.42)', 'rgba(203,163,70,0.39)'],
  EidAdha: ['rgba(126,105,34,0.42)', 'rgba(182,156,74,0.39)'],
};

export const PRAYER_BG_IMAGES: Record<string, any> = {
  Tahjjud: require('@/assets/images/sky/tahjjud.jpg'),
  Fajr: require('@/assets/images/sky/fajr.jpg'),
  Sunrise: require('@/assets/images/sky/sunrise.jpg'),
  Ishraq: require('@/assets/images/sky/ishraq.jpg'),
  Zawaal: require('@/assets/images/sky/zawaal.jpg'),
  Dhuhr: require('@/assets/images/sky/zuhr.jpg'),
  Asr: require('@/assets/images/sky/asr.jpg'),
  Maghrib: require('@/assets/images/sky/maghrib.jpg'),
  Isha: require('@/assets/images/sky/isha.jpg'),
  Jumuah: require('@/assets/images/sky/nabwi.jpg'),
  Eid: require('@/assets/images/sky/nabwi.jpg'),
  EidAdha: require('@/assets/images/sky/arafat.jpeg'),
};

// Equal day segments that cycle through every image in assets/images/sky once per day.
export const SKY_DAY_CYCLE_KEYS = [
  'Tahjjud',
  'Fajr',
  'Sunrise',
  'Ishraq',
  'Dhuhr',
  'Zawaal',
  'Asr',
  'Maghrib',
  'Isha',
  'Jumuah',
  'EidAdha',
] as const;

export const SKY_CROSS_FADE_DURATION_MS = 8000;
export const SKY_CYCLE_CHECK_MS = 30000;
