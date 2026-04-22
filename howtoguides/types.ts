export interface HowToStepImage {
  uri: string;
  caption: string;
  source?: string;
}

export interface HowToStep {
  step: number;
  title: string;
  detail: string;
  note?: string;
  images?: HowToStepImage[];
}

export interface HowToSection {
  heading: string;
  steps: HowToStep[];
}

export interface HowToGuide {
  id: string;
  language?: 'en' | 'ur';
  parentGroup?: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  intro: string;
  sections: HowToSection[];
  notes?: string[];
}
