type PrayerMood = {
    pageBg: string;
    heroImageOpacity: number;
    heroGradient: [string, string, string];
    showStars: boolean;
    starOpacity: number;
    showClouds: boolean;
    cloudOpacity: number;
    cloudTint: string;
};

type PrayerTimeId =
    | 'before-fajr'
    | 'after-fajr'
    | 'after-zuhr'
    | 'after-jumuah'
    | 'after-asr'
    | 'after-maghrib'
    | 'after-isha';

export const PRAYER_MOODS: Record<PrayerTimeId, PrayerMood> = {
    'before-fajr': {
        pageBg: '#080E1F',
        heroImageOpacity: 0.3,
        heroGradient: ['rgba(2,6,24,0.98)', 'rgba(9,19,46,0.94)', 'rgba(12,19,41,0.98)'],
        showStars: true,
        starOpacity: 0.9,
        showClouds: true,
        cloudOpacity: 0.2,
        cloudTint: 'rgba(120,150,220,0.25)',
    },
    'after-fajr': {
        pageBg: '#F2E8D8',
        heroImageOpacity: 0.64,
        heroGradient: ['rgba(243,146,58,0.68)', 'rgba(255,196,122,0.56)', 'rgba(255,228,168,0.64)'],
        showStars: false,
        starOpacity: 0,
        showClouds: true,
        cloudOpacity: 0.3,
        cloudTint: 'rgba(255,233,186,0.4)',
    },
    'after-zuhr': {
        pageBg: '#F4ECDE',
        heroImageOpacity: 0.68,
        heroGradient: ['rgba(222,164,72,0.62)', 'rgba(245,208,137,0.5)', 'rgba(247,232,187,0.58)'],
        showStars: false,
        starOpacity: 0,
        showClouds: true,
        cloudOpacity: 0.34,
        cloudTint: 'rgba(255,244,220,0.42)',
    },
    'after-jumuah': {
        pageBg: '#EFE4CC',
        heroImageOpacity: 0.66,
        heroGradient: ['rgba(168,129,39,0.72)', 'rgba(214,175,92,0.6)', 'rgba(236,214,155,0.62)'],
        showStars: false,
        starOpacity: 0,
        showClouds: true,
        cloudOpacity: 0.28,
        cloudTint: 'rgba(248,231,182,0.38)',
    },
    'after-asr': {
        pageBg: '#F0E0CC',
        heroImageOpacity: 0.64,
        heroGradient: ['rgba(186,96,24,0.74)', 'rgba(232,146,65,0.62)', 'rgba(245,196,132,0.64)'],
        showStars: false,
        starOpacity: 0,
        showClouds: true,
        cloudOpacity: 0.26,
        cloudTint: 'rgba(255,206,145,0.35)',
    },
    'after-maghrib': {
        pageBg: '#140C1D',
        heroImageOpacity: 0.3,
        heroGradient: ['rgba(43,14,72,0.93)', 'rgba(112,36,89,0.86)', 'rgba(238,119,56,0.76)'],
        showStars: true,
        starOpacity: 0.72,
        showClouds: true,
        cloudOpacity: 0.22,
        cloudTint: 'rgba(196,132,182,0.26)',
    },
    'after-isha': {
        pageBg: '#060B19',
        heroImageOpacity: 0.22,
        heroGradient: ['rgba(2,8,24,0.98)', 'rgba(9,23,52,0.94)', 'rgba(11,17,38,0.98)'],
        showStars: true,
        starOpacity: 1,
        showClouds: false,
        cloudOpacity: 0,
        cloudTint: 'rgba(120,160,255,0.2)',
    },
};