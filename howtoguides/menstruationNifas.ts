import { HowToGuide } from './types';

export const MENSTRUATION_NIFAS_GUIDE: HowToGuide = {
  id: 'menstruation-nifas-istihadah',
  parentGroup: 'Purification',
  title: 'Menstruation and Nifas (Hayd/Nifas)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'calendar-month',
  color: '#00796B',
  intro: 'This guide gives a practical Hanafi framework for hayd, nifas, and istihadah, including durations, worship restrictions, and resuming rules in a clear format.',
  sections: [
    {
      heading: 'Menstruation (Hayd), Postnatal Bleeding (Nifas), and Dysfunctional Uterine Bleeding (Istihadah)',
      steps: [
        {
          step: 1,
          title: 'Hayd (menstruation) definition and limits',
          detail: `Hayd is menstrual blood from the uterus of a healthy, non-pregnant female after puberty.

Hanafi limits:
1. Minimum: 3 days (72 hours).
2. Maximum: 10 days (240 hours).
3. Common average mentioned in texts: about 5 days.

Bleeding less than 3 days or more than 10 days is treated as istihadah for the excess.

During the maximum hayd window (10 days), intermittent breaks and different colors seen within that valid span are treated as hayd.`,
        },
        {
          step: 2,
          title: 'Nifas (postnatal bleeding) limits',
          detail: `Nifas is bleeding after childbirth (or after most of the fetus exits in qualifying miscarriage discussions).

Hanafi limits:
1. Minimum: no fixed minimum.
2. Maximum: 40 days.

Its worship rulings follow hayd in core restrictions.`,
        },
        {
          step: 3,
          title: 'Istihadah (dysfunctional uterine bleeding)',
          detail: 'Istihadah is irregular non-menstrual bleeding. It does not carry hayd/nifas restrictions on prayer, fasting, intercourse, or tawaf.',
        },
      ],
    },
    {
      heading: 'When Worship Pauses and Resumes',
      steps: [
        {
          step: 1,
          title: 'During valid hayd or nifas',
          detail: `During valid hayd/nifas:
1. Salah is paused (no qada of missed prayers).
2. Fasting is paused, but Ramadan fasts are made up later.
3. Sexual intercourse is not permissible.
4. Tawaf is not permissible.
5. Entering a masjid is not permissible (including pass-through in many standard texts).
6. Reciting Quran and touching mushaf are not permissible except with valid fiqh exceptions/barrier discussions.`,
        },
        {
          step: 2,
          title: 'When bleeding stops',
          detail: `When valid hayd/nifas ends, perform ghusl and resume worship according to prayer-time rules.

If period ends within 10 days (after habitual duration), intercourse is delayed until one of these occurs:
1. Ghusl is performed.
2. Tayammum is performed due to valid excuse and a prayer is offered with it.
3. Enough time passed to perform ghusl and opening takbir in prayer time, but prayer was missed.

If bleeding exceeds 10 days, excess is istihadah and intercourse becomes permissible after the 10-day limit.`,
        },
        {
          step: 3,
          title: 'If bleeding is irregular',
          detail: 'Use established habit and max/min limits to classify blood correctly. For complex overlap cases, get a case-based Hanafi ruling.',
        },
      ],
    },
    {
      heading: 'Makeup (Qada) Rules',
      steps: [
        { step: 1, title: 'Salah during hayd/nifas', detail: 'Salah missed in valid hayd or nifas is not made up in Hanafi fiqh.' },
        { step: 2, title: 'Fasts during Ramadan', detail: 'Fasts missed due to hayd or nifas are made up later as qada fasts.' },
        { step: 3, title: 'Use accurate tracking for qada', detail: 'Track purity and bleeding windows carefully so qada count is exact and you do not overburden yourself or miss obligations.' },
      ],
    },
    {
      heading: 'What Counts as Istihadah',
      steps: [
        {
          step: 1,
          title: 'Common cases treated as istihadah',
          detail: `Examples include:
1. Bleeding in pregnancy.
2. Bleeding after the 40-day nifas maximum.
3. Bleeding beyond hayd/nifas maximum limits.
4. Bleeding of a pre-pubescent girl.

In istihadah, worship remains valid with ongoing purification management.`,
        },
        {
          step: 2,
          title: 'Wudhu during chronic bleeding',
          detail: 'If bleeding continues through an entire prayer time, perform wudhu at the start of each prayer time as a ma dhur pattern.',
        },
        {
          step: 3,
          title: 'Minimum tuhr between cycles',
          detail: 'Minimum tuhr (purity interval) is 15 complete days; it has no fixed maximum except in habit-establishment discussions under continuous bleeding.',
        },
      ],
    },
    {
      heading: 'Unlawful During Valid Hayd and Nifas',
      steps: [
        {
          step: 1,
          title: 'Worship and text restrictions',
          detail: `During valid hayd/nifas, the following are unlawful:
1. Sexual intercourse.
2. Tawaf.
3. Entering a masjid.
      4. Being touched between below the navel and below the knee (per cited fiqh wording).
        5. Reciting Quran.
        6. Touching mushaf without a valid barrier exception.`,
        },
        {
          step: 2,
          title: 'Prayer and fasting rule',
          detail: 'Salah is paused and not made up. Ramadan fasts are made up later.',
        },
      ],
    },
    {
      heading: 'Hajj and Umrah Practical Notes',
      steps: [
        { step: 1, title: 'General worship limits remain', detail: 'Hayd and nifas rulings still affect acts requiring ritual purity during travel and pilgrimage.' },
        { step: 2, title: 'Coordinate rites by validity rules', detail: 'Plan rites with group leaders early if purity-related timing issues arise so required acts are completed correctly.' },
        { step: 3, title: 'Seek case-specific guidance', detail: 'Because pilgrimage timelines are tight, personal situations should be reviewed with a qualified scholar before key rites.' },
      ],
    },
    {
      heading: 'Additional Nifas and Istihadah Details',
      steps: [
        {
          step: 1,
          title: 'Nifas definition note',
          detail: 'Nifas is blood after childbirth (or after most fetal exit in qualifying miscarriage discussions). It has no minimum and a 40-day maximum; its rulings follow hayd in core restrictions.',
        },
        {
          step: 2,
          title: 'If bleeding exceeds max limits',
          detail: 'If bleeding goes beyond hayd/nifas maximum durations, the excess is treated as istihadah according to habitual-pattern rules.',
        },
      ],
    },
  ],
  notes: [
    'Common mistake: treating every irregular spot as hayd. Verify pattern before pausing worship.',
    'Complex cycle cases should be reviewed once with a reliable local scholar and then followed consistently.',
    'For purification after valid end of bleeding, use the Ghusl guide steps.',
  ],
};
