import { HowToGuide } from './types';

export const MADHUR_GUIDE: HowToGuide = {
  id: 'madhur-person-rulings',
  parentGroup: 'Purification',
  title: "Ma'dhur Person (Chronic Excuse)",
  subtitle: 'Purification · Hanafi Method',
  icon: 'shield',
  color: '#455A64',
  intro: 'A Ma\'dhur person has a chronic excuse that repeatedly affects purity. This guide presents the Hanafi criteria to start, maintain, and end Ma\'dhur status in a practical step-by-step format.',
  sections: [
    {
      heading: "When Ma'dhur Status Applies",
      steps: [
        {
          step: 1,
          title: 'Excuse spans a full prayer time',
          detail: 'If no complete clean interval exists in an entire prayer window sufficient for wudhu and salah, Ma\'dhur status can begin.',
        },
        {
          step: 2,
          title: 'Typical qualifying patterns',
          detail: 'Examples include chronic drops, continuous discharge, or persistent wound flow when continuity criteria are met.',
        },
        {
          step: 3,
          title: 'Track by prayer windows',
          detail: 'Use a simple time-based log instead of guesswork. This avoids over-applying or under-applying Ma\'dhur rulings.',
        },
      ],
    },
    {
      heading: "How Ma'dhur Worship Is Managed",
      steps: [
        {
          step: 1,
          title: 'Fresh wudhu per prayer time',
          detail: 'After each prayer time enters, perform fresh wudhu once, then pray obligations/sunnah for that window as permitted.',
        },
        {
          step: 2,
          title: 'Only the chronic excuse is excused',
          detail: 'Within that prayer window, the qualifying chronic excuse is overlooked, but other nullifiers still break wudhu normally.',
        },
        {
          step: 3,
          title: 'Use practical hygiene measures',
          detail: 'Take reasonable steps (padding, cleaning, clothing protection) to reduce spread of impurity while preserving dignity.',
        },
      ],
    },
    {
      heading: "When Ma'dhur Status Ends",
      steps: [
        {
          step: 1,
          title: 'One full clean prayer window passes',
          detail: 'If an entire prayer time passes without the qualifying excuse, Ma\'dhur status ends.',
        },
        {
          step: 2,
          title: 'Resume normal nullification rules',
          detail: 'After status ends, standard wudhu rulings apply fully again.',
        },
        {
          step: 3,
          title: 'Reassess if chronic pattern returns',
          detail: 'If symptoms return persistently, reassess using the same Hanafi criteria from the beginning.',
        },
      ],
    },
    {
      heading: 'Common Mistakes to Avoid',
      steps: [
        {
          step: 1,
          title: 'Assuming status too early',
          detail: 'One or two incidents do not automatically establish Ma\'dhur status without continuity through a full prayer window.',
        },
        {
          step: 2,
          title: 'Treating all nullifiers as excused',
          detail: 'Only the qualifying chronic excuse is excused; other nullifiers still invalidate wudhu.',
        },
      ],
    },
  ],
  notes: [
    'Common mistake: assuming one or two incidents automatically create Ma\'dhur status.',
    'Common mistake: treating all nullifiers as excused; only the qualifying excuse is excused.',
    'Combine this with the Wudhu and Tayammum guides where relevant.',
  ],
};
