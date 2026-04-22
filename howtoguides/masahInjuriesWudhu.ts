import { HowToGuide } from './types';

export const MASAH_INJURIES_WUDHU_GUIDE: HowToGuide = {
  id: 'masah-over-injuries-wudhu',
  parentGroup: 'Purification',
  title: 'Masah Over Injuries in Wudhu',
  subtitle: 'Purification · Hanafi Method',
  icon: 'healing',
  color: '#546E7A',
  intro: 'When injury treatment prevents normal washing, Hanafi fiqh allows adjusted purification through safe washing, masah over dressings, and hardship-aware substitutions.',
  sections: [
    {
      heading: 'Assess the Injury Zone',
      steps: [
        { step: 1, title: 'Identify what can be safely washed', detail: 'Wash normal healthy skin where water is safe and does not delay healing.' },
        { step: 2, title: 'Identify what cannot be washed', detail: 'If direct washing is likely harmful, avoid it and apply permitted alternatives.' },
        { step: 3, title: 'Keep treatment dressing secure', detail: 'Bandages, casts, or medical coverings should remain as needed for treatment.' },
      ],
    },
    {
      heading: 'Apply Masah Correctly',
      steps: [
        { step: 1, title: 'Perform standard wudhu for safe areas', detail: 'Complete all possible required washing acts on unaffected body parts.' },
        { step: 2, title: 'Wipe over dressing where required', detail: 'Use wet hand to wipe over the dressing that covers injured area when direct washing is not possible.' },
        { step: 3, title: 'Do not remove dressing if harmful', detail: 'If removing bandage causes pain, bleeding, or delayed healing, keep it and continue with valid masah method.' },
      ],
    },
    {
      heading: 'If Even Wiping Is Harmful',
      steps: [
        { step: 1, title: 'Skip harmful wiping', detail: 'If even light wiping causes harm, omit wiping that spot and proceed with what is safely possible.' },
        { step: 2, title: 'Reassess regularly during healing', detail: 'As injury improves, return gradually to standard washing when safe.' },
        { step: 3, title: 'Use tayammum when needed', detail: 'If harm is broader and water use is not feasible, tayammum rules may apply.' },
      ],
    },
  ],
  notes: [
    'Common mistake: skipping safe washable areas because one area is injured.',
    'Medical advice helps establish realistic harm assessment.',
    'For complex multi-site injuries, get a personal fiqh ruling.',
  ],
};
