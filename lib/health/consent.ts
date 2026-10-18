// lib/health/consent.ts
// The consent a patient (or a practitioner on their behalf) agrees to before
// any health record exists. Bump CONSENT_VERSION whenever the wording
// changes in substance — each patient row stores the version they agreed to.
import { SUPPORT_EMAIL } from '@/lib/contact';

export const CONSENT_VERSION = '2026-10-v1';

export interface ConsentSection {
  heading: string;
  points: string[];
}

export const CONSENT_SECTIONS: ConsentSection[] = [
  {
    heading: 'What we store',
    points: [
      'Your name, date of birth, sex, phone, email and country.',
      'For each condition you are treated for: what you came in with, the practitioner’s assessments and treatment plans, products dispensed (linked to your orders), lab results, your own check-ins and photos, and the final outcome.',
      'A log of who opened or changed your record and when.',
    ],
  },
  {
    heading: 'Who can see it',
    points: [
      'You — every entry marked as visible to you, at any time, in your account.',
      'The licensed practitioner assigned to your case. A practitioner may keep a small number of working notes that are not shown to you.',
      'The company’s administrators, only to assign your case, check licences and handle requests like this one. They must use two-step sign-in to open records.',
      'No one else. Ordinary staff, sales agents and couriers cannot see health records. We never publish records, use them as testimonials, or share them for marketing.',
    ],
  },
  {
    heading: 'How it is protected',
    points: [
      'Records and photos are stored privately and are only opened through your signed-in account or a practitioner’s two-step-verified account.',
      'Entries are never edited or deleted after they are written. If something was wrong, a correction is added and the original stays visible, so the record is honest.',
    ],
  },
  {
    heading: 'Your rights',
    points: [
      'You can download a full copy of your record at any time from this page.',
      'You can ask for a mistake to be corrected.',
      `You can withdraw consent and ask for your record to be deleted by emailing ${SUPPORT_EMAIL} from the email address on your account, or by asking your practitioner. We will confirm when it is done. If a law requires us to keep part of it for longer, we will tell you which part and why.`,
      'These rights come from the Ghana Data Protection Act 2012 (Act 843), the Nigeria Data Protection Act 2023 and, where it applies, the EU/UK GDPR. Health information is treated as special-category (sensitive) data under all three.',
    ],
  },
  {
    heading: 'Important',
    points: [
      'This record supports your care; it is not an emergency service. If you feel very unwell, go to the nearest hospital or call your local emergency number.',
    ],
  },
];

export const CONSENT_STATEMENT =
  'I have read the above. I agree that GLOBALGETWEST may store and use my health information as described, for my care only.';

/** What a practitioner confirms when registering a patient they consulted
 *  in person, by phone or on WhatsApp. */
export const PRACTITIONER_CONSENT_STATEMENT =
  'I explained to the patient what is stored, who can see it and how to ask for deletion (as set out in the patient consent notice), and they agreed to a health record being kept.';
