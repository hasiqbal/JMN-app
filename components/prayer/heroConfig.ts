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
};

export const PRAYER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  Fajr: ['rgba(20,20,80,0.82)', 'rgba(40,40,120,0.75)'],
  Sunrise: ['rgba(180,80,0,0.78)', 'rgba(220,140,0,0.72)'],
  Ishraq: ['rgba(200,100,0,0.75)', 'rgba(240,190,0,0.68)'],
  Zawaal: ['rgba(112,95,62,0.80)', 'rgba(154,134,94,0.74)'],
  Dhuhr: ['rgba(10,70,160,0.78)', 'rgba(20,130,220,0.72)'],
  Asr: ['rgba(150,40,0,0.78)', 'rgba(220,90,30,0.72)'],
  Maghrib: ['rgba(80,10,120,0.80)', 'rgba(180,20,80,0.74)'],
  Isha: ['rgba(8,14,50,0.85)', 'rgba(20,30,100,0.80)'],
  Jumuah: ['rgba(100,60,0,0.82)', 'rgba(160,100,0,0.78)'],
};

export const PRAYER_BG_IMAGES: Record<string, any> = {
  Fajr: require('@/assets/images/fajr.jpg'),
  Sunrise: require('@/assets/images/sunrise.jpg'),
  Ishraq: require('@/assets/images/sunrise.jpg'),
  Zawaal: require('@/assets/images/zuhr.jpg'),
  Dhuhr: require('@/assets/images/zuhr.jpg'),
  Asr: require('@/assets/images/asr.jpg'),
  Maghrib: require('@/assets/images/maghrib.jpg'),
  Isha: require('@/assets/images/fajr.jpg'),
  Jumuah: require('@/assets/images/zuhr.jpg'),
};
