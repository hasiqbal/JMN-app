export interface MasjidEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: 'lecture' | 'class' | 'community' | 'special';
  speaker?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  important: boolean;
}

// Mocked events — replace with real API/backend
export const MOCK_EVENTS: MasjidEvent[] = [
  {
    id: '1',
    title: 'Friday Jumuah Khutbah',
    description: 'Weekly Friday prayer and sermon. Brothers and sisters welcome.',
    date: 'Every Friday',
    time: '1:15 PM',
    category: 'special',
    speaker: 'Sheikh Abdullah',
  },
  {
    id: '2',
    title: 'Quran Tafseer Circle',
    description: 'In-depth explanation of Surah Al-Baqarah, open to all levels.',
    date: 'Every Sunday',
    time: '10:00 AM',
    category: 'class',
    speaker: 'Ustadh Ibrahim',
  },
  {
    id: '3',
    title: 'Islamic Parenting Workshop',
    description: 'Practical guidance on raising children with Islamic values.',
    date: 'Sat, 12 Apr 2026',
    time: '2:00 PM',
    category: 'lecture',
    speaker: 'Dr. Fatima Hassan',
  },
  {
    id: '4',
    title: 'Community Iftar Dinner',
    description: 'Monthly community gathering. All families welcome. Bring a dish!',
    date: 'Sat, 19 Apr 2026',
    time: '7:00 PM',
    category: 'community',
  },
  {
    id: '5',
    title: "Arabic Language for Beginner's",
    description: 'Learn to read and understand the Quran in its original language.',
    date: 'Every Tue & Thu',
    time: '7:30 PM',
    category: 'class',
    speaker: 'Ustadh Yusuf',
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Masjid Renovation Update',
    body: 'Alhamdulillah, the new wudu area is now open. Jazakallah khair to all donors.',
    date: '1 Apr 2026',
    important: true,
  },
  {
    id: 'a2',
    title: 'Volunteer Drivers Needed',
    body: 'We are looking for volunteers to assist elderly community members with transportation to Jumuah.',
    date: '28 Mar 2026',
    important: false,
  },
  {
    id: 'a3',
    title: 'Sisters Halaqa Resumes',
    body: 'The Sisters weekly halaqa resumes this Sunday after a two-week break. Topic: Gratitude in Islam.',
    date: '26 Mar 2026',
    important: false,
  },
];

export function getEventCategoryColor(category: MasjidEvent['category']): string {
  const map = {
    lecture: '#2D6A4F',
    class: '#4FE948',
    community: '#B7935A',
    special: '#C0392B',
  };
  return map[category];
}

export function getEventCategoryLabel(category: MasjidEvent['category']): string {
  const map = {
    lecture: 'Lecture',
    class: 'Class',
    community: 'Community',
    special: 'Special',
  };
  return map[category];
}
