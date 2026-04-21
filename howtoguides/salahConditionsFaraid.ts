import { HowToGuide } from './types';

export const SALAH_CONDITIONS_FARAID_GUIDE: HowToGuide = {
  id: 'salah-conditions-faraid',
  parentGroup: 'Salah',
  title: 'Conditions and Pillars of Salah شروط و أركان الصلاة',
  subtitle: 'Salah Core · Hanafi (Nur al-Idah)',
  icon: 'rule-folder',
  color: '#3949AB',
  intro: 'In Hanafi fiqh, salah has conditions before it starts (shurut) and integral pillars inside it (arkan). Missing a fard invalidates the prayer.',
  sections: [
    {
      heading: 'Conditions Before Salah (Shurut)',
      steps: [
        { step: 1, title: 'Purity from hadath', detail: 'Have valid wudhu, ghusl when required, or valid tayammum where applicable.' },
        { step: 2, title: 'Purity from filth (najasah)', detail: 'Body, clothing, and place of prayer must be clean from invalidating impurity.' },
        { step: 3, title: 'Covering awrah', detail: 'Awrah must be covered according to Hanafi limits for men and women.' },
        { step: 4, title: 'Prayer time entered', detail: 'Salah is valid only after its time begins.' },
        { step: 5, title: 'Facing qiblah', detail: 'Face the qiblah unless there is a valid excuse.' },
        { step: 6, title: 'Intention (niyyah)', detail: 'Intend the specific prayer in the heart before beginning.' },
      ],
    },
    {
      heading: 'Pillars Inside Salah (Arkan)',
      steps: [
        { step: 1, title: 'Opening takbir (tahrimah)', detail: 'Begin with Allahu Akbar to enter the state of prayer.' },
        { step: 2, title: 'Qiyam (standing)', detail: 'Stand in fard prayer when physically able.' },
        { step: 3, title: 'Qiraah (recitation)', detail: 'Recite Qur an in the required rakahs according to Hanafi rules.' },
        { step: 4, title: 'Ruku', detail: 'Perform bowing correctly with stillness.' },
        { step: 5, title: 'Sujud', detail: 'Perform two prostrations in each rakah correctly.' },
        { step: 6, title: 'Final sitting (qa dah akhirah)', detail: 'Sit in the last sitting for the required duration of tashahhud.' },
      ],
    },
    {
      heading: 'Important Hanafi Clarifications',
      steps: [
        { step: 1, title: 'If a condition is missing', detail: 'If a pre-condition is missing, salah is not valid from the start.' },
        { step: 2, title: 'If a fard is omitted', detail: 'Missing a fard nullifies that rakah or prayer and it must be corrected or repeated.' },
        { step: 3, title: 'Different from wajib', detail: 'Wajib has a lower rank than fard in Hanafi fiqh; forgetful omission is handled with sajdat al-sahw when applicable.' },
      ],
    },
  ],
  notes: [
    'Primary reference: Nur al-Idah (Nur ul Idah), chapters on shurut and arkan of salah.',
    'For edge cases (travel, illness, severe fear), confirm ruling with a qualified Hanafi scholar.',
  ],
};
