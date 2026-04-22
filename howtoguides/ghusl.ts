import { HowToGuide } from './types';

export const GHUSL_GUIDE: HowToGuide = {
  id: 'ghusl',
  parentGroup: 'Purification',
  title: 'Ghusl الغسل (Ghusl)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'shower',
  color: '#00695C',
  intro: 'Ghusl removes major ritual impurity. This guide keeps the Hanafi essentials and your requested breakdown of sunnah flow, types of ghusl, and key practical rulings.',
  sections: [
    {
      heading: 'Types of Ghusl',
      steps: [
        {
          step: 1,
          title: 'Obligatory (fard) ghusl',
          detail: `Ghusl is fard when any of the following occur:
      1. Emission of mani from its normal place with pleasure (even if it exits later without pleasure), such as wet dream or looking with lust.
      2. Disappearance of the head of the penis into the vagina or anus of a living human being, even without emission.
3. End of menstruation (hayd).
4. End of postnatal bleeding (nifas).`,
        },
        {
          step: 2,
          title: 'Mandatory (wajib) mention in some texts',
          detail: 'For a person who becomes Muslim while in major ritual impurity, some texts mention this under wajib wording; many Hanafi discussions state the stronger position as obligatory in effect.',
        },
        {
          step: 3,
          title: 'Recommended (nafl) ghusl',
          detail: `Recommended occasions include:
1. Jumuah.
2. The two Eid prayers.
      3. Entering into ihram.
4. Day of Arafah.
5. Entering Makkah.
      6. Entering Madinah al-Munawwarah.
      7. Visiting the Prophet صلى الله عليه وسلم.`,
        },
      ],
    },
    {
      heading: 'Fard (Obligatory) Acts of Ghusl',
      steps: [
        { step: 1, title: 'Rinse mouth', detail: 'Ensure water reaches all parts of the mouth at least once.' },
        { step: 2, title: 'Rinse nose', detail: 'Draw water into soft part of nose and rinse at least once.' },
        { step: 3, title: 'Wash entire body', detail: 'Let water flow over every part of the body once, with no dry area left.' },
      ],
    },
    {
      heading: 'Sunnah of Ghusl',
      steps: [
        {
          step: 1,
          title: 'Intention (niyyah)',
          detail: 'Make intention (niyyah) to remove major ritual impurity.',
        },
        {
          step: 2,
          title: 'Wash hands to wrists',
          detail: 'Wash both hands until the wrists.',
        },
        {
          step: 3,
          title: 'Wash private parts',
          detail: 'Wash private parts (front and rear).',
        },
        {
          step: 4,
          title: 'Remove visible impurity',
          detail: 'Wash off any filth from the body.',
        },
        {
          step: 5,
          title: 'Perform wudhu first',
          detail: 'Perform wudhu first, then pour water over the entire body, starting with the head (commonly three times).',
        },
      ],
    },
    {
      heading: 'When Ghusl Is Required Before Intimacy After Hayd',
      steps: [
        {
          step: 1,
          title: 'If period ends within ten days',
          detail: `After hayd ends within ten days, intimacy is delayed until one of these occurs:
1. Ghusl is performed.
2. Tayammum is done due to valid excuse and at least one prayer is offered.
3. A prayer time exits such that she had enough time for ghusl and takbir tahrimah but did not pray.`,
        },
        {
          step: 2,
          title: 'If bleeding exceeds ten days',
          detail: 'If bleeding goes past ten days, excess is treated as istihadah, and intimacy becomes permissible after the tenth day limit.',
        },
      ],
    },
  ],
  notes: [
    'Remove barriers like thick paint or polish that prevent water reaching skin.',
    'For braided hair, women do not need to undo braids if roots are fully wet.',
    'Avoid wasting water; complete ghusl with care and modesty.',
  ],
};
