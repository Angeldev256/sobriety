// Photos from Unsplash (free Unsplash License — https://unsplash.com/license). Served straight
// from Unsplash's image CDN at the size each screen needs. Chosen to feel hopeful and supportive;
// none present an identifiable person as someone with an addiction.

export type PhotoInfo = {
  id: string;
  alt: string;
  photographer: string;
  profile: string;
  page: string;
  /** CSS object-position, to keep the subject in frame when cropped */
  focus?: string;
};

export const PHOTOS = {
  sunrise: {
    id: "photo-1732027198077-4e29b491d15a",
    alt: "A person standing in an open field, looking out at the sunrise",
    photographer: "Selin Karahan",
    profile: "https://unsplash.com/@selinkarahan_",
    page: "https://unsplash.com/photos/a-person-standing-in-a-field-at-sunset-Nj3PR_PortM",
    focus: "50% 45%",
  },
  conversation: {
    id: "photo-1655720355810-fcdfd7a742b5",
    alt: "Two people sitting on a couch, talking and listening to each other",
    photographer: "Iwaria Inc.",
    profile: "https://unsplash.com/@iwaria",
    page: "https://unsplash.com/photos/a-man-and-a-woman-sitting-on-a-couch-U7zb_4mTVPQ",
    focus: "50% 40%",
  },
  friends: {
    id: "photo-1630726410985-a1021e8a232a",
    alt: "Two friends sitting together outdoors, laughing",
    photographer: "Andra C Taylor Jr",
    profile: "https://unsplash.com/@taylormadeglobal",
    page: "https://unsplash.com/photos/woman-in-black-dress-sitting-beside-woman-in-green-and-yellow-dress-KfoNVMCFb5M",
    focus: "50% 30%",
  },
  handsTogether: {
    id: "photo-1582213782179-e0d53f98f2ca",
    alt: "A group of people stacking their hands together",
    photographer: "Hannah Busing",
    profile: "https://unsplash.com/@hannahbusing",
    page: "https://unsplash.com/photos/group-stacking-hands-in-colorful-sweaters-Zyx1bK9mqmA",
  },
  handsComfort: {
    id: "photo-1604881991720-f91add269bed",
    alt: "One person holding another person's hands in comfort",
    photographer: "Priscilla Du Preez",
    profile: "https://unsplash.com/@priscilladupreez",
    page: "https://unsplash.com/photos/two-people-holding-hands-on-table-in-comfort-aPa843frIzI",
  },
  newStart: {
    id: "photo-1509100194014-d49809396daa",
    alt: "A woman smiling as she works in a green field",
    photographer: "Annie Spratt",
    profile: "https://unsplash.com/@anniespratt",
    page: "https://unsplash.com/photos/woman-holding-green-grass-m0DUL38R49Y",
    focus: "45% 35%",
  },
} satisfies Record<string, PhotoInfo>;

export type PhotoKey = keyof typeof PHOTOS;

const UTM = "utm_source=sobriety_tracker&utm_medium=referral";
export const creditLink = (url: string) => `${url}?${UTM}`;

/** Unsplash CDN URL at a given width (auto WebP/AVIF, cropped server-side). */
export function unsplashSrc(id: string, width: number, quality = 70) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}
