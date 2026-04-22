import { HowToGuide } from './types';

export const SALAH_BREAKERS_GUIDE: HowToGuide = {
  id: 'salah-breakers',
  parentGroup: 'Salah',
  title: 'What Breaks Salah مفسدات الصلاة (Mufsidat)',
  subtitle: 'Salah Core · Hanafi (Nur al-Idah)',
  icon: 'block',
  color: '#D84315',
  intro: 'These are core mufsidat (invalidators) of salah in Hanafi fiqh, presented in a practical checklist style with key details and exceptions.',
  sections: [
    {
      heading: 'Purity-Related Invalidators',
      steps: [
        { step: 1, title: 'Losing wudhu during prayer', detail: 'If wudhu breaks at any point, salah breaks immediately because purity is a condition.' },
        { step: 2, title: 'Deliberately breaking wudhu', detail: 'Intentionally passing wind, urinating, or any deliberate nullification of wudhu invalidates salah.' },
        { step: 3, title: 'End of a valid excuse (ma`dhur)', detail: 'If the excuse that allowed special ruling ends during prayer, the prayer is invalidated.' },
        { step: 4, title: 'Finding water after starting with tayammum', detail: 'If one prayed on tayammum then becomes aware of available water, the prayer is invalidated.' },
        { step: 5, title: 'Expiry of masah period over khuffs', detail: 'If the permitted wiping period ends during prayer, purification is no longer valid.' },
        { step: 6, title: 'Cast/bandage invalidation after healing', detail: 'If wiping over a plaster was based on injury then healing occurs (or bandage falls from healed area that was fard to wash), prayer is invalidated.' },
        { step: 7, title: 'States removing legal competence', detail: 'Insanity, unconsciousness, or other states that remove valid awareness during prayer invalidate salah.' },
      ],
    },
    {
      heading: 'Speech and Sound Invalidators',
      steps: [
        { step: 1, title: 'Human speech', detail: 'Normal speech invalidates salah whether deliberate or accidental, little or much.' },
        { step: 2, title: 'Speech in legal sense (hukmi)', detail: 'Supplication wording that asks for something normally requested from people (for example money) takes ruling of speech and invalidates.' },
        { step: 3, title: 'Replying to people verbally', detail: 'Returning salam by words, answering someone, or engaging in conversation invalidates prayer.' },
        { step: 4, title: 'Speech-like utterances', detail: 'Unnecessary utterances like "ah", "oh", "uff", or similar sounds may invalidate when they resemble speech.' },
        { step: 5, title: 'Throat-clearing/coughing/blowing without need', detail: 'If done unnecessarily and in a speech-like audible way, it can invalidate; genuine need is excused.' },
        { step: 6, title: 'Worldly crying out', detail: 'Crying out due to worldly pain/distress in a speech-like manner can invalidate; weeping from khushu and fear of Allah does not take this ruling.' },
      ],
    },
    {
      heading: 'Movement, Form, and Direction',
      steps: [
        { step: 1, title: 'Eating or drinking', detail: 'Any eating or drinking during prayer invalidates salah.' },
        { step: 2, title: 'Excessive movement (amal kathir)', detail: 'Movement invalidates when an observer would think the person is no longer praying; jurists also describe this as repeated unnecessary movement. Three small movements in one rukn can be treated as excessive movement. Using both hands for a non-prayer action, or doing with one hand what normally needs two, may also be treated as excessive.' },
        { step: 3, title: 'Action destroying form of salah', detail: 'Any foreign act that breaks the outward form of prayer invalidates it.' },
        { step: 4, title: 'Turning chest away from qiblah', detail: 'Turning the chest away invalidates prayer; turning only the face is makruh but does not itself invalidate.' },
        { step: 5, title: 'Exposure of awrah', detail: 'If required awrah remains uncovered for the duration of prayer of one rukn, prayer is invalidated.' },
      ],
    },
    {
      heading: 'Leaving Obligatory Acts and not Rectifying Them',
      steps: [
        { step: 1, title: 'Leaving a fard/rukn', detail: 'Omitting a pillar (such as qiyam, qira`ah, ruku`, sujud) invalidates prayer unless made up in the prayer.' },
        { step: 2, title: 'Deliberately leaving a wajib', detail: 'Intentional omission of wajib invalidates the prayer.' },
        { step: 3, title: 'Forgetting a wajib and not correcting', detail: 'If a wajib is omitted forgetfully but sajdat al-sahw is not performed correctly before ending, prayer is invalid.' },
        { step: 4, title: 'Missed sajdah handled incorrectly in final sitting', detail: 'If one recalls a missed sajdah in final qa`dah, performs it, and ends immediately without re-establishing final sitting, prayer is not valid.' },
        { step: 5, title: 'Change from weaker basis to stronger ability', detail: 'If one began with a concession (such as sitting) and then becomes able to stand during the prayer, the prayer must be restarted.' },
      ],
    },
    {
      heading: 'Recitation, Intention, and Text Cases',
      steps: [
        { step: 1, title: 'Grave recitation error', detail: 'Major recitational errors of the type discussed by jurists may invalidate the prayer.' },
        { step: 2, title: 'Reciting from a mushaf', detail: 'In Hanafi fiqh, reading while looking into a mushaf invalidates salah.' },
        { step: 3, title: 'Takbir for another prayer', detail: 'If one utters takbir intending another salah while in current prayer, the current prayer is invalidated.' },
        { step: 4, title: 'Corrupting opening takbir meaning', detail: 'Pronunciation that changes "Allahu Akbar" into a question or corrupted meaning invalidates.' },
        { step: 5, title: 'Firm intention to exit prayer', detail: 'Resolving in the heart to end the prayer invalidates it.' },
         { step: 6, title: 'Intending a different prayer', detail: 'If one starts with the intention of one prayer but then firmly intends a different prayer, the first prayer is invalidated.' },
            { step: 7, title: 'Sajdah of tilawah in fard prayer', detail: 'If one does not perform Sajdah of tilawah in a prayer, the prayer is invalidated.' },
      ],
    },
    {
      heading: 'Congregation and Time-Linked Cases',
      steps: [
        { step: 1, title: 'Accepting correction from outside same prayer', detail: 'Taking recitation correction from someone not in the same prayer invalidates according to the cited ruling set.' },
        { step: 2, title: 'Going ahead of imam by a full action', detail: 'If follower precedes imam in a complete rukn and exits before imam, this is listed among invalidators in your provided rulings.' },
        { step: 3, title: 'Invalidating laughter levels', detail: 'Audible laughter invalidates salah; loud laughter with known Hanafi conditions can invalidate both salah and wudhu, while simple smile does not invalidate.' },
        { step: 4, title: 'Woman directly beside/in front in jama`ah case', detail: 'Under known Hanafi conditions in same congregational prayer and no separator, this can invalidate the man’s prayer.' },
        { step: 5, title: 'Sahib al-tartib remembering prior missed fard', detail: 'If one is sahib al-tartib and realizes an earlier fard is still due, the current prayer is invalidated unless he already owes six or more prayers, or enough time has elapsed that tartib no longer applies.' },
        { step: 6, title: 'Time expiry during prayer', detail: 'Examples include sunrise during Fajr; your notes also include timing-related Jumu`ah/`Asr transition cases.' },
      ],
    },
    {
      heading: 'When It Is Wajib to Break Salah',
      steps: [
        { step: 1, title: 'Saving life from immediate danger', detail: 'It is wajib to break salah when immediate action is needed to save a life or prevent severe harm (for example, a child in danger or a person about to fall).' },
        { step: 2, title: 'Stopping serious emergency harm', detail: 'If there is an urgent fire, attack, or similar emergency requiring immediate action, one must break salah and respond.' },
        { step: 3, title: 'Urgent call where real harm is feared', detail: 'If a person calls for urgent help and delaying response is likely to cause serious harm, breaking salah becomes wajib.' },
      ],
    },
  ],
  notes: [
    'Primary reference: Nur al-Idah (Nur ul Idah), chapter on mufsidat al-salah.',
    'When unsure whether prayer broke, verify with a qualified Hanafi scholar.',
  ],
};
