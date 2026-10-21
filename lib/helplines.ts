// Crisis and addiction support lines by country. To add a country, append an entry here.
// Numbers should be re-verified periodically; links point to official services.

export type Helpline = { name: string; description: string; phone?: string; text?: string; url?: string };
export type CountryHelplines = { code: string; name: string; emergency: string; lines: Helpline[] };

export const HELPLINES: CountryHelplines[] = [
  {
    code: "US",
    name: "United States",
    emergency: "911",
    lines: [
      { name: "988 Suicide & Crisis Lifeline", description: "24/7 free, confidential crisis support.", phone: "988", text: "988", url: "https://988lifeline.org" },
      { name: "SAMHSA National Helpline", description: "24/7 treatment referral and information for substance use.", phone: "1-800-662-4357", url: "https://www.samhsa.gov/find-help/national-helpline" },
      { name: "Crisis Text Line", description: "Text with a trained crisis counselor.", text: "Text HOME to 741741", url: "https://www.crisistextline.org" },
      { name: "National Problem Gambling Helpline", description: "24/7 call, text or chat.", phone: "1-800-522-4700", url: "https://www.ncpgambling.org/help-treatment/" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    emergency: "999",
    lines: [
      { name: "Samaritans", description: "24/7 emotional support.", phone: "116 123", url: "https://www.samaritans.org" },
      { name: "Shout", description: "24/7 text support.", text: "Text SHOUT to 85258", url: "https://giveusashout.org" },
      { name: "Drinkline", description: "Free, confidential alcohol helpline.", phone: "0300 123 1110" },
      { name: "FRANK", description: "Honest information and advice about drugs.", phone: "0300 123 6600", url: "https://www.talktofrank.com" },
      { name: "National Gambling Helpline", description: "24/7 support from GamCare.", phone: "0808 8020 133", url: "https://www.gamcare.org.uk" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    emergency: "911",
    lines: [
      { name: "9-8-8 Suicide Crisis Helpline", description: "24/7 call or text.", phone: "988", text: "988", url: "https://988.ca" },
      { name: "Wellness Together / Substance use support", description: "Mental health and substance use resources.", url: "https://www.canada.ca/en/health-canada/services/substance-use/get-help/get-help-problematic-substance-use.html" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    emergency: "000",
    lines: [
      { name: "Lifeline", description: "24/7 crisis support.", phone: "13 11 14", url: "https://www.lifeline.org.au" },
      { name: "National Alcohol and Other Drug Hotline", description: "Free, confidential advice 24/7.", phone: "1800 250 015" },
      { name: "Gambling Help Online", description: "24/7 counselling and support.", phone: "1800 858 858", url: "https://www.gamblinghelponline.org.au" },
    ],
  },
  {
    code: "IE",
    name: "Ireland",
    emergency: "112 or 999",
    lines: [
      { name: "Samaritans Ireland", description: "24/7 emotional support.", phone: "116 123", url: "https://www.samaritans.org/ireland/" },
      { name: "HSE Drugs and Alcohol Helpline", description: "Free and confidential.", phone: "1800 459 459", url: "https://www.drugs.ie" },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    emergency: "112",
    lines: [
      { name: "Mentally Aware Nigeria Initiative (MANI)", description: "Mental health support and referrals.", url: "https://www.mentallyaware.org" },
    ],
  },
  {
    code: "IN",
    name: "India",
    emergency: "112",
    lines: [
      { name: "Tele-MANAS", description: "24/7 government mental health helpline.", phone: "14416", url: "https://telemanas.mohfw.gov.in" },
      { name: "National Toll-Free De-addiction Helpline", description: "Support for substance use.", phone: "1800-11-0031" },
    ],
  },
  {
    code: "OTHER",
    name: "Another country",
    emergency: "your local emergency number",
    lines: [
      { name: "Find A Helpline", description: "Free, confidential support lines in 130+ countries.", url: "https://findahelpline.com" },
      { name: "Alcoholics Anonymous (worldwide)", description: "Find a meeting near you or online.", url: "https://www.aa.org/find-aa" },
      { name: "Narcotics Anonymous (worldwide)", description: "Find a meeting near you or online.", url: "https://www.na.org/meetingsearch/" },
    ],
  },
];

export function helplinesFor(code: string | null | undefined): CountryHelplines {
  return HELPLINES.find((c) => c.code === code) ?? HELPLINES[HELPLINES.length - 1];
}
