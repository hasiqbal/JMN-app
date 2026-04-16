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
  Fajr: ['rgba(34,58,122,0.64)', 'rgba(110,154,224,0.48)'],
  Sunrise: ['rgba(150,70,10,0.76)', 'rgba(215,140,40,0.70)'],
  Ishraq: ['rgba(166,86,16,0.74)', 'rgba(233,174,70,0.66)'],
  Zawaal: ['rgba(95,92,70,0.78)', 'rgba(136,130,102,0.72)'],
  Dhuhr: ['rgba(12,80,130,0.78)', 'rgba(20,138,178,0.70)'],
  Asr: ['rgba(130,66,18,0.78)', 'rgba(198,112,45,0.70)'],
  Maghrib: ['rgba(62,25,95,0.80)', 'rgba(135,54,96,0.72)'],
  Isha: ['rgba(12,22,58,0.84)', 'rgba(36,46,98,0.78)'],
  Jumuah: ['rgba(44,84,66,0.82)', 'rgba(92,136,116,0.74)'],
  Eid: ['rgba(150,114,28,0.84)', 'rgba(203,163,70,0.78)'],
  EidAdha: ['rgba(126,105,34,0.84)', 'rgba(182,156,74,0.78)'],
};

export const PRAYER_BG_IMAGES: Record<string, any> = {
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
