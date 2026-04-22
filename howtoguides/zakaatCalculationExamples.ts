import { HowToGuide } from './types';

export const ZAKAAT_CALCULATION_EXAMPLES_GUIDE: HowToGuide = {
  id: 'zakaat-calculation-examples',
  parentGroup: 'Zakaat',
  title: 'Zakaat Calculation Examples',
  subtitle: 'Zakaat · Hanafi Method',
  icon: 'calculate',
  color: '#1B5E20',
  intro: 'This guide gives practical examples using both gold-nisab and silver-nisab approaches so households can choose a principled policy and apply it consistently.',
  sections: [
    {
      heading: 'Step-by-Step Calculation Framework',
      steps: [
        { step: 1, title: 'List zakatable assets', detail: 'List cash, savings, zakatable gold/silver, trade goods, and reliably collectible receivables.' },
        { step: 2, title: 'Subtract valid short-term liabilities', detail: 'Deduct only valid deductible liabilities due in near term under your chosen Hanafi method.' },
        { step: 3, title: 'Compare net total to nisab', detail: 'Check if net total reaches chosen reference threshold and then apply 2.5% to due amount where required.' },
      ],
    },
    {
      heading: 'Gold vs Silver Nisab Approach',
      steps: [
        { step: 1, title: 'Gold reference', detail: 'Using gold nisab typically results in a higher threshold, so fewer people become liable.' },
        { step: 2, title: 'Silver reference', detail: 'Using silver nisab generally produces a lower threshold and can increase support for poorer recipients.' },
        { step: 3, title: 'Choose a consistent policy', detail: 'Families should choose a principled policy and stay consistent year to year unless advised otherwise.' },
      ],
    },
    {
      heading: 'Practical Family Examples',
      steps: [
        { step: 1, title: 'Example A: Salary saver household', detail: 'Net savings and tradable assets exceed both thresholds; zakaat due at 2.5% on qualifying net wealth.' },
        { step: 2, title: 'Example B: Borderline assets', detail: 'Net assets exceed silver threshold but not gold threshold; explain policy decision before final payment.' },
        { step: 3, title: 'Example C: Debt-heavy case', detail: 'After valid deductions, net amount falls below threshold, so no zakaat due for that cycle.' },
      ],
    },
  ],
  notes: [
    'Common mistake: switching between gold and silver policy year-to-year for convenience.',
    'Examples are illustrative and should be calibrated with current local market values.',
    'If asset categories are complex, get a reviewed worksheet from a trusted scholar or finance advisor.',
    'Record your method each year to reduce future confusion.',
  ],
};
