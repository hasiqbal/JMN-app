// App Configuration
export const APP_CONFIG = {
  masjidName: "Jami' Masjid Noorani",
  masjidSubtitle: 'Your Local Islamic Centre',
  masjidAddress: '27 Gibraltar Road, Halifax, UK',
  masjidPhone: '+1 (555) 000-0000',
  masjidEmail: 'info@noorani-masjid.org',

  // Prayer times API — Aladhan (https://aladhan.com/prayer-times-api)
  // Configured for Jami' Masjid Noorani, Halifax, UK
  aladhanCity: 'Halifax',
  aladhanCountry: 'GB',
  aladhanMethod: 1, // Muslim World League — standard for UK mosques

  // Live Stream
  youtubeChannelId: '@jamimasjidnoorani',
  youtubeChannelUrl: 'https://youtube.com/@jamimasjidnoorani',
  youtubeStreamUrl: 'https://www.youtube.com/@jamimasjidnoorani/live',
  // Primary masjid live stream
  audioStreamUrl: 'https://lb.mymasjid.stream/nooranihalifax',
  // Additional radio streams
  radioStreams: [
    {
      id: 'masjid',
      label: 'JMN Live Radio',
      sublabel: 'Live prayers & lectures',
      url: 'https://lb.mymasjid.stream/nooranihalifax',
      icon: 'mosque',
      isRandom: false,
    },
    {
      id: 'qiraat',
      label: 'Live 24/7 Quran',
      sublabel: '24/7 Quran recitation',
      url: 'https://lb.mymasjid.stream/qiraat',
      icon: 'menu-book',
      isRandom: false,
    },
    {
      id: 'basit',
      label: 'Qari Abdul Basit — Mujawwad',
      sublabel: 'Mujawwad recitation',
      url: 'https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/{SURAH}.mp3',
      icon: 'music-note',
      isRandom: true,
    },
  ] as Array<{ id: string; label: string; sublabel: string; url: string; icon: string; isRandom: boolean }>,


  // Social / Website
  website: 'https://noorani-masjid.org',
};

export const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Fajr',
  Sunrise: 'Sunrise',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Sunset: 'Sunset',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
  Imsak: 'Imsak',
  Midnight: 'Midnight',
};

export const DISPLAY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Jamaat (Iqamah) times — minutes after Athan
// Sourced from masjidbox.com/prayer-times/jmn — update seasonally
export const JAMAAT_OFFSETS: Record<string, number> = {
  Fajr: 29,     // Fajr Jamaat ~29 mins after Athan
  Dhuhr: 40,    // Dhuhr Jamaat ~40 mins after Athan
  Asr: 26,      // Asr Jamaat ~26 mins after Athan
  Maghrib: 10,  // Maghrib Jamaat ~10 mins after Athan
  Isha: 20,     // Isha Jamaat ~20 mins after Athan
};

// Jumuah (Friday) prayer time — fixed
export const JUMUAH_TIME = '12:45';
