import { HowToGuide } from './types';

export const ZAKAAT_CORE_GUIDE: HowToGuide = {
  id: 'zakaat-core-obligations',
  parentGroup: 'Zakaat',
  title: 'Zakaat Core Obligations',
  subtitle: 'Zakaat · Hanafi Method',
  icon: 'volunteer-activism',
  color: '#2E7D32',
  intro: 'This guide explains practical Hanafi zakaat duty: who is liable, when payment becomes due, what wealth is counted, and who can receive it.',
  sections: [
    {
      heading: 'When Zakaat Becomes Obligatory',
      steps: [
        { step: 1, title: 'Reach nisab threshold', detail: 'Liability begins when qualifying net wealth reaches nisab level by accepted calculation approach.' },
        { step: 2, title: 'Complete one lunar year', detail: 'In core Hanafi treatment, one lunar year over qualifying wealth is required before annual due payment.' },
        { step: 3, title: 'Ownership and control', detail: 'Wealth must be fully owned and accessible according to Hanafi rules.' },
      ],
    },
    {
      heading: 'What Is Typically Counted',
      steps: [
        { step: 1, title: 'Cash and savings', detail: 'Include cash, accounts, and liquid equivalents in net qualifying total.' },
        { step: 2, title: 'Gold, silver, and trade inventory', detail: 'Include zakatable jewelry and trade goods by applicable valuation approach.' },
        { step: 3, title: 'Deduct immediate payable liabilities', detail: 'Deduct valid near-term debts according to recognized Hanafi treatment.' },
      ],
    },
    {
      heading: 'Who Can Receive Zakaat',
      steps: [
        { step: 1, title: 'Eligible recipients only', detail: 'Distribute to valid categories and avoid ineligible channels.' },
        { step: 2, title: 'Transfer ownership properly', detail: 'Zakaat requires tamlik: real transfer of ownership to eligible recipients.' },
        { step: 3, title: 'Pay on time and with dignity', detail: 'Avoid unnecessary delay once due and preserve recipient dignity during delivery.' },
      ],
    },
  ],
  notes: [
    'Common mistake: counting gross assets without valid debt deductions or vice versa.',
    'Zakaat is both legal duty and purification of wealth.',
    'If unsure on assets or debts, use the calculation examples guide and verify edge cases.',
    'Do not substitute informal charity for obligatory zakaat unless conditions are fully met.',
  ],
};
