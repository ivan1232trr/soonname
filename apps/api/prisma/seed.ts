import process from "node:process";
import { PrismaClient, EventStatus, EventCategory, Vibe, TimeSlot } from "@prisma/client";
import bcrypt from "bcryptjs";
import { latLngToCell } from "h3-js";

const prisma = new PrismaClient();

// ── Cities ──────────────────────────────────────────────────────────────────────

const CITIES = [
  {
    name: "Kingston",
    country: "Jamaica",
    latitude: 17.997,
    longitude: -76.7936,
    timezone: "America/Jamaica",
  },
  {
    name: "Montego Bay",
    country: "Jamaica",
    latitude: 18.4762,
    longitude: -77.8939,
    timezone: "America/Jamaica",
  },
  {
    name: "Mandeville",
    country: "Jamaica",
    latitude: 18.0409,
    longitude: -77.5033,
    timezone: "America/Jamaica",
  },
];

// ── Tags ────────────────────────────────────────────────────────────────────────

const TAGS = [
  "music", "art", "food-and-drink", "fitness", "nightlife", "outdoors",
  "tech", "comedy", "film", "wellness", "markets", "sports", "community",
  "free", "18-plus", "family-friendly", "outdoor", "live-music", "weekend",
  "daytime", "networking", "pop-up",
];

// ── Users ───────────────────────────────────────────────────────────────────────

const USERS = [
  { email: "demo@citypulse.app", name: "Demo User", password: "demo1234" },
  { email: "alex@citypulse.app", name: "Alex Thompson", password: "password123" },
  { email: "maria@citypulse.app", name: "Maria Chen", password: "password123" },
  { email: "dj.pulse@citypulse.app", name: "DJ Pulse", password: "password123" },
  { email: "foodie@citypulse.app", name: "Chef Marcus", password: "password123" },
];

// ── Events ──────────────────────────────────────────────────────────────────────
// Spread across Kingston with realistic lat/lng coordinates

interface SeedEvent {
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  category: EventCategory;
  eventDate: string;
  startTime: string;
  endTime?: string;
  tags: string[];
  userIndex: number; // index into USERS array
  cityIndex: number; // index into CITIES array
}

const EVENTS: SeedEvent[] = [
  // ── Kingston Entertainment ──────────────────────────────────────────────
  {
    title: "Reggae Sunsplash Revival",
    description: "Experience the legendary Reggae Sunsplash with live performances from top Jamaican artists. A night of roots, culture, and good vibes at the waterfront amphitheatre.",
    locationName: "Kingston Waterfront",
    latitude: 17.9714,
    longitude: -76.7931,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-20",
    startTime: "2026-03-20T19:00:00-05:00",
    endTime: "2026-03-21T01:00:00-05:00",
    tags: ["music", "live-music", "outdoor"],
    userIndex: 3,
    cityIndex: 0,
  },
  {
    title: "Kingston Comedy Night",
    description: "Laugh your heart out at Kingston's premier comedy showcase featuring local and international comedians. Two hours of non-stop entertainment with a live DJ after-party.",
    locationName: "The Theatre Place",
    latitude: 18.0065,
    longitude: -76.7874,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T20:00:00-05:00",
    endTime: "2026-03-21T23:00:00-05:00",
    tags: ["comedy", "18-plus"],
    userIndex: 1,
    cityIndex: 0,
  },
  {
    title: "Indie Film Screening: Island Stories",
    description: "A curated collection of short films by Jamaican filmmakers exploring island life, identity, and culture. Q&A with directors after the screening.",
    locationName: "Carib Cinema",
    latitude: 18.0108,
    longitude: -76.7985,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T18:30:00-05:00",
    endTime: "2026-03-22T21:00:00-05:00",
    tags: ["film", "art", "community"],
    userIndex: 2,
    cityIndex: 0,
  },

  // ── Kingston Nightlife ──────────────────────────────────────────────────
  {
    title: "Dancehall Thursdays at Fiction",
    description: "The hottest dancehall party in Kingston! DJ Pulse spinning the latest bashment, dancehall, and afrobeats. Dress to impress. VIP tables available.",
    locationName: "Fiction Nightclub",
    latitude: 18.0139,
    longitude: -76.7988,
    category: EventCategory.NIGHTLIFE,
    eventDate: "2026-03-19",
    startTime: "2026-03-19T22:00:00-05:00",
    endTime: "2026-03-20T04:00:00-05:00",
    tags: ["nightlife", "music", "18-plus"],
    userIndex: 3,
    cityIndex: 0,
  },
  {
    title: "Rooftop Sunset Sessions",
    description: "Chill rooftop vibes with deep house and neo-soul from sunset to midnight. Craft cocktails and tapas menu available. Smart casual dress code.",
    locationName: "Sky Lounge, New Kingston",
    latitude: 18.0141,
    longitude: -76.7886,
    category: EventCategory.NIGHTLIFE,
    eventDate: "2026-03-20",
    startTime: "2026-03-20T17:00:00-05:00",
    endTime: "2026-03-20T23:59:00-05:00",
    tags: ["nightlife", "music", "18-plus"],
    userIndex: 3,
    cityIndex: 0,
  },
  {
    title: "Latin Night: Salsa & Bachata",
    description: "Kingston's monthly Latin night with live salsa band, bachata DJ sets, and free beginner dance lessons at 8pm. All levels welcome!",
    locationName: "Club Privilege",
    latitude: 18.0050,
    longitude: -76.7823,
    category: EventCategory.NIGHTLIFE,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T20:00:00-05:00",
    endTime: "2026-03-23T02:00:00-05:00",
    tags: ["nightlife", "music", "18-plus"],
    userIndex: 1,
    cityIndex: 0,
  },

  // ── Kingston Food ───────────────────────────────────────────────────────
  {
    title: "Jerk Festival Kingston",
    description: "Annual celebration of Jamaica's iconic jerk cuisine. Over 20 vendors serving jerk chicken, pork, fish, and creative fusion dishes. Live music stage and kids zone.",
    locationName: "Hope Gardens",
    latitude: 18.0163,
    longitude: -76.7474,
    category: EventCategory.FOOD,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T11:00:00-05:00",
    endTime: "2026-03-21T20:00:00-05:00",
    tags: ["food-and-drink", "family-friendly", "outdoor", "live-music"],
    userIndex: 4,
    cityIndex: 0,
  },
  {
    title: "Farm-to-Table Pop-Up Dinner",
    description: "Exclusive 30-seat dinner featuring locally sourced ingredients from Blue Mountain farms. Five-course tasting menu with wine pairings by Chef Marcus.",
    locationName: "Devon House",
    latitude: 18.0138,
    longitude: -76.7776,
    category: EventCategory.FOOD,
    eventDate: "2026-03-23",
    startTime: "2026-03-23T19:00:00-05:00",
    endTime: "2026-03-23T22:30:00-05:00",
    tags: ["food-and-drink", "pop-up"],
    userIndex: 4,
    cityIndex: 0,
  },
  {
    title: "Sunday Brunch Market",
    description: "Weekly open-air brunch market with artisan coffee, fresh pastries, smoothie bowls, and Caribbean brunch plates. Yoga session at 8am before the market opens.",
    locationName: "Emancipation Park",
    latitude: 18.0120,
    longitude: -76.7831,
    category: EventCategory.FOOD,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T09:00:00-05:00",
    endTime: "2026-03-22T14:00:00-05:00",
    tags: ["food-and-drink", "markets", "daytime", "family-friendly", "free"],
    userIndex: 4,
    cityIndex: 0,
  },

  // ── Kingston Sports ─────────────────────────────────────────────────────
  {
    title: "Kingston City Run 10K",
    description: "Annual 10K road race through downtown Kingston. All fitness levels welcome. Registration includes race bib, timing chip, and finisher medal. Water stations every 2K.",
    locationName: "National Heroes Park",
    latitude: 18.0004,
    longitude: -76.7950,
    category: EventCategory.SPORTS,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T06:00:00-05:00",
    endTime: "2026-03-22T10:00:00-05:00",
    tags: ["fitness", "outdoor", "community", "daytime"],
    userIndex: 1,
    cityIndex: 0,
  },
  {
    title: "Cricket: Jamaica vs Trinidad",
    description: "Regional Super50 cricket match at Sabina Park. Come support the Jamaican team in this crucial group stage match. Food and drink vendors on site.",
    locationName: "Sabina Park",
    latitude: 17.9939,
    longitude: -76.7886,
    category: EventCategory.SPORTS,
    eventDate: "2026-03-20",
    startTime: "2026-03-20T10:00:00-05:00",
    endTime: "2026-03-20T18:00:00-05:00",
    tags: ["sports", "outdoor", "daytime"],
    userIndex: 0,
    cityIndex: 0,
  },

  // ── Kingston Culture ────────────────────────────────────────────────────
  {
    title: "National Gallery: New Horizons Exhibition",
    description: "A landmark exhibition showcasing contemporary Jamaican art from 15 emerging artists. Mixed media, sculpture, and digital installations exploring Caribbean futurism.",
    locationName: "National Gallery of Jamaica",
    latitude: 17.9712,
    longitude: -76.7917,
    category: EventCategory.CULTURE,
    eventDate: "2026-03-19",
    startTime: "2026-03-19T10:00:00-05:00",
    endTime: "2026-03-19T17:00:00-05:00",
    tags: ["art", "community", "daytime", "family-friendly"],
    userIndex: 2,
    cityIndex: 0,
  },
  {
    title: "Bob Marley Museum Heritage Tour",
    description: "Special extended heritage tour of the Bob Marley Museum with live acoustic performances in the garden. Includes access to the recording studio and photo exhibition.",
    locationName: "Bob Marley Museum",
    latitude: 18.0131,
    longitude: -76.7884,
    category: EventCategory.CULTURE,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T09:30:00-05:00",
    endTime: "2026-03-21T16:00:00-05:00",
    tags: ["music", "art", "community", "daytime", "family-friendly"],
    userIndex: 2,
    cityIndex: 0,
  },

  // ── Kingston Education ──────────────────────────────────────────────────
  {
    title: "Tech Kingston: AI & Startups Meetup",
    description: "Monthly tech meetup covering AI applications in Caribbean startups. Lightning talks, networking, and pizza. Open to developers, designers, and founders.",
    locationName: "UWI Mona Visitors' Lodge",
    latitude: 18.0051,
    longitude: -76.7467,
    category: EventCategory.EDUCATION,
    eventDate: "2026-03-24",
    startTime: "2026-03-24T18:00:00-05:00",
    endTime: "2026-03-24T21:00:00-05:00",
    tags: ["tech", "networking", "free"],
    userIndex: 1,
    cityIndex: 0,
  },

  // ── Kingston Wellness ───────────────────────────────────────────────────
  {
    title: "Sunrise Yoga at Hope Gardens",
    description: "Start your weekend with a rejuvenating outdoor yoga session surrounded by tropical gardens. All levels welcome. Bring your own mat. Herbal tea provided after class.",
    locationName: "Hope Botanical Gardens",
    latitude: 18.0155,
    longitude: -76.7490,
    category: EventCategory.WELLNESS,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T06:00:00-05:00",
    endTime: "2026-03-22T07:30:00-05:00",
    tags: ["wellness", "fitness", "outdoor", "daytime", "free"],
    userIndex: 2,
    cityIndex: 0,
  },

  // ── Montego Bay Events ──────────────────────────────────────────────────
  {
    title: "Hip Strip Block Party",
    description: "Montego Bay's biggest block party on the famous Hip Strip! DJs, live bands, street food vendors, and art installations along Gloucester Avenue.",
    locationName: "Gloucester Avenue (Hip Strip)",
    latitude: 18.4882,
    longitude: -77.9178,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-20",
    startTime: "2026-03-20T16:00:00-05:00",
    endTime: "2026-03-21T00:00:00-05:00",
    tags: ["music", "live-music", "outdoor", "food-and-drink", "nightlife"],
    userIndex: 3,
    cityIndex: 1,
  },
  {
    title: "Doctor's Cave Beach Fest",
    description: "Beach music festival at the legendary Doctor's Cave Beach. Reggae, dancehall, soca. Beachside bars and food trucks. Bring your swimsuit!",
    locationName: "Doctor's Cave Beach",
    latitude: 18.4907,
    longitude: -77.9206,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T12:00:00-05:00",
    endTime: "2026-03-21T22:00:00-05:00",
    tags: ["music", "live-music", "outdoor", "food-and-drink", "family-friendly"],
    userIndex: 3,
    cityIndex: 1,
  },
  {
    title: "MoBay Night Market",
    description: "Monthly artisan night market in Sam Sharpe Square. Local crafts, street food, live drumming, and family activities. Support local vendors and artisans.",
    locationName: "Sam Sharpe Square",
    latitude: 18.4717,
    longitude: -77.9216,
    category: EventCategory.FOOD,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T17:00:00-05:00",
    endTime: "2026-03-22T22:00:00-05:00",
    tags: ["markets", "food-and-drink", "community", "family-friendly"],
    userIndex: 4,
    cityIndex: 1,
  },
  {
    title: "Sunset Catamaran Cruise",
    description: "Sail along the Montego Bay coastline at sunset with an open bar, snorkelling stop, and reggae music. The ultimate Caribbean evening experience.",
    locationName: "Montego Bay Marine Park",
    latitude: 18.4688,
    longitude: -77.9303,
    category: EventCategory.NIGHTLIFE,
    eventDate: "2026-03-23",
    startTime: "2026-03-23T16:30:00-05:00",
    endTime: "2026-03-23T19:30:00-05:00",
    tags: ["nightlife", "outdoor", "music", "18-plus"],
    userIndex: 1,
    cityIndex: 1,
  },
  {
    title: "MoBay Yoga & Wellness Retreat",
    description: "Full-day wellness retreat with morning yoga, meditation workshop, plant-based lunch, and sound healing session. Set in a beautiful hillside garden.",
    locationName: "Rose Hall Great House grounds",
    latitude: 18.5100,
    longitude: -77.8730,
    category: EventCategory.WELLNESS,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T07:00:00-05:00",
    endTime: "2026-03-22T16:00:00-05:00",
    tags: ["wellness", "fitness", "outdoor", "daytime"],
    userIndex: 2,
    cityIndex: 1,
  },

  // ── Mandeville Events ───────────────────────────────────────────────────
  {
    title: "Manchester Parish Jerk & BBQ Cook-Off",
    description: "Annual cook-off in the cool hills of Mandeville. Local pitmasters compete for the Manchester Jerk Crown. Tastings, live reggae, and a kids play area under the big tent.",
    locationName: "Cecil Charlton Park",
    latitude: 18.0425,
    longitude: -77.5048,
    category: EventCategory.FOOD,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T11:00:00-05:00",
    endTime: "2026-03-21T19:00:00-05:00",
    tags: ["food-and-drink", "live-music", "outdoor", "family-friendly"],
    userIndex: 4,
    cityIndex: 2,
  },
  {
    title: "Mandeville Farmers & Craft Market",
    description: "Weekly Saturday market featuring organic produce from Manchester farms, homemade jams, coffee from the Blue Mountain foothills, handmade crafts, and baked goods.",
    locationName: "Mandeville Town Centre",
    latitude: 18.0413,
    longitude: -77.5020,
    category: EventCategory.FOOD,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T07:00:00-05:00",
    endTime: "2026-03-22T13:00:00-05:00",
    tags: ["markets", "food-and-drink", "daytime", "family-friendly", "free"],
    userIndex: 4,
    cityIndex: 2,
  },
  {
    title: "Hill Country Acoustic Sessions",
    description: "Intimate acoustic music night in the Mandeville hills. Local singer-songwriters perform original folk, mento, and jazz in a cosy garden setting. BYO blanket.",
    locationName: "The Village Green",
    latitude: 18.0380,
    longitude: -77.5065,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-20",
    startTime: "2026-03-20T18:00:00-05:00",
    endTime: "2026-03-20T22:00:00-05:00",
    tags: ["music", "live-music", "outdoor", "community"],
    userIndex: 3,
    cityIndex: 2,
  },
  {
    title: "Marshall's Pen Bird Watching Tour",
    description: "Guided early-morning bird watching at the historic Marshall's Pen Great House. Spot Jamaican endemics including the Streamertail Hummingbird. Binoculars provided. Light breakfast included.",
    locationName: "Marshall's Pen Great House",
    latitude: 18.0220,
    longitude: -77.4860,
    category: EventCategory.CULTURE,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T05:30:00-05:00",
    endTime: "2026-03-22T09:00:00-05:00",
    tags: ["outdoors", "community", "daytime", "family-friendly"],
    userIndex: 2,
    cityIndex: 2,
  },
  {
    title: "Manchester High School Alumni 5K Fun Run",
    description: "Annual charity fun run through Mandeville's scenic hilltop roads. All proceeds go to the school's scholarship fund. Walk, jog, or run — all paces welcome!",
    locationName: "Manchester High School",
    latitude: 18.0445,
    longitude: -77.5080,
    category: EventCategory.SPORTS,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T06:30:00-05:00",
    endTime: "2026-03-22T09:30:00-05:00",
    tags: ["fitness", "outdoor", "community", "daytime", "free"],
    userIndex: 1,
    cityIndex: 2,
  },
  {
    title: "Mandeville Wine & Paint Night",
    description: "Unwind with a glass of wine while a local artist guides you through a tropical landscape painting. No experience needed. All materials and two drinks included in the ticket price.",
    locationName: "Bloomfield Great House",
    latitude: 18.0460,
    longitude: -77.4950,
    category: EventCategory.CULTURE,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T18:30:00-05:00",
    endTime: "2026-03-21T21:00:00-05:00",
    tags: ["art", "food-and-drink", "community"],
    userIndex: 2,
    cityIndex: 2,
  },
  {
    title: "Cool Runnings: Outdoor Movie Night",
    description: "Watch the classic Jamaican comedy under the stars! Outdoor screening on a giant inflatable screen. Popcorn, snow cones, and jerk sliders on sale. Gates open at 6pm, film at 7:30pm.",
    locationName: "Mandeville Polo Grounds",
    latitude: 18.0390,
    longitude: -77.5100,
    category: EventCategory.ENTERTAINMENT,
    eventDate: "2026-03-23",
    startTime: "2026-03-23T18:00:00-05:00",
    endTime: "2026-03-23T22:00:00-05:00",
    tags: ["film", "outdoor", "family-friendly", "food-and-drink"],
    userIndex: 1,
    cityIndex: 2,
  },
  {
    title: "Hilltop Yoga & Meditation Sunrise",
    description: "Greet the sunrise with a vinyasa flow and guided meditation overlooking the Manchester valleys. Cool mountain air and panoramic views make this a one-of-a-kind experience.",
    locationName: "Huntingdon Summit",
    latitude: 18.0500,
    longitude: -77.5150,
    category: EventCategory.WELLNESS,
    eventDate: "2026-03-22",
    startTime: "2026-03-22T05:45:00-05:00",
    endTime: "2026-03-22T07:15:00-05:00",
    tags: ["wellness", "fitness", "outdoor", "daytime", "free"],
    userIndex: 2,
    cityIndex: 2,
  },
  {
    title: "Manchester Tech & Entrepreneurship Mixer",
    description: "Quarterly networking event for tech professionals, freelancers, and entrepreneurs in the Manchester parish. Lightning talks on remote work, fintech, and agri-tech startups.",
    locationName: "Mandeville Hotel Conference Room",
    latitude: 18.0430,
    longitude: -77.5035,
    category: EventCategory.EDUCATION,
    eventDate: "2026-03-24",
    startTime: "2026-03-24T17:30:00-05:00",
    endTime: "2026-03-24T20:30:00-05:00",
    tags: ["tech", "networking", "community"],
    userIndex: 1,
    cityIndex: 2,
  },
  {
    title: "Mandeville Night Vibes",
    description: "The only proper party night in the hills! DJ sets spinning dancehall, soca, and R&B. Outdoor patio with fairy lights and cocktail specials. Smart casual. 18+ only.",
    locationName: "The Chill Spot Lounge",
    latitude: 18.0400,
    longitude: -77.5010,
    category: EventCategory.NIGHTLIFE,
    eventDate: "2026-03-21",
    startTime: "2026-03-21T21:00:00-05:00",
    endTime: "2026-03-22T02:00:00-05:00",
    tags: ["nightlife", "music", "18-plus"],
    userIndex: 3,
    cityIndex: 2,
  },
];

// ── Helper ──────────────────────────────────────────────────────────────────────

function computeH3(lat: number, lng: number) {
  return {
    h3R6: latLngToCell(lat, lng, 6),
    h3R7: latLngToCell(lat, lng, 7),
    h3R8: latLngToCell(lat, lng, 8),
    h3R9: latLngToCell(lat, lng, 9),
    h3R11: latLngToCell(lat, lng, 11),
  };
}

// ── Main seed function ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Seeding database...\n");

  // ── Seed cities ─────────────────────────────────────────────────────────
  console.log("Cities:");
  const cityRecords: Array<{ id: string; name: string }> = [];
  for (const city of CITIES) {
    const upserted = await prisma.city.upsert({
      where: { name: city.name },
      update: {
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
      },
      create: city,
    });
    cityRecords.push({ id: upserted.id, name: upserted.name });
    console.log(`  ${upserted.name} (${upserted.id})`);
  }

  // ── Seed tags ───────────────────────────────────────────────────────────
  console.log("\nTags:");
  const tagRecords: Map<string, string> = new Map();
  for (const tagName of TAGS) {
    const upserted = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    tagRecords.set(upserted.name, upserted.id);
    console.log(`  ${upserted.name} (${upserted.id})`);
  }

  // ── Seed users ──────────────────────────────────────────────────────────
  console.log("\nUsers:");
  const userRecords: Array<{ id: string; email: string }> = [];
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
      },
    });
    userRecords.push({ id: upserted.id, email: upserted.email });
    console.log(`  ${upserted.name} <${upserted.email}> (${upserted.id})`);
  }

  // ── Seed user profiles ────────────────────────────────────────────────────
  console.log("\nUser Profiles:");
  const profileConfigs = [
    { userIdx: 0, cityIdx: 0, vibe: Vibe.BOTH, times: [TimeSlot.EVENING, TimeSlot.LATE_NIGHT], tags: ["music", "food-and-drink", "nightlife"] },
    { userIdx: 1, cityIdx: 0, vibe: Vibe.SOCIAL, times: [TimeSlot.EVENING, TimeSlot.LATE_NIGHT], tags: ["tech", "networking", "comedy"] },
    { userIdx: 2, cityIdx: 0, vibe: Vibe.CHILL, times: [TimeSlot.MORNING, TimeSlot.AFTERNOON], tags: ["art", "wellness", "film"] },
    { userIdx: 3, cityIdx: 0, vibe: Vibe.SOCIAL, times: [TimeSlot.EVENING, TimeSlot.LATE_NIGHT], tags: ["music", "nightlife", "live-music"] },
    { userIdx: 4, cityIdx: 0, vibe: Vibe.BOTH, times: [TimeSlot.MORNING, TimeSlot.AFTERNOON, TimeSlot.EVENING], tags: ["food-and-drink", "markets", "community"] },
  ];

  for (const pc of profileConfigs) {
    const userId = userRecords[pc.userIdx]!.id;
    const cityId = cityRecords[pc.cityIdx]!.id;
    const upserted = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        preferredCityId: cityId,
        vibe: pc.vibe,
        timePreferences: pc.times,
        interestedTags: pc.tags,
      },
      create: {
        userId,
        preferredCityId: cityId,
        vibe: pc.vibe,
        timePreferences: pc.times,
        interestedTags: pc.tags,
      },
    });
    console.log(`  Profile for ${userRecords[pc.userIdx]!.email} (${upserted.id})`);
  }

  // ── Seed events ─────────────────────────────────────────────────────────
  console.log("\nEvents:");
  const eventRecords: Array<{ id: string; title: string }> = [];

  for (const ev of EVENTS) {
    const cityId = cityRecords[ev.cityIndex]!.id;
    const userId = userRecords[ev.userIndex]!.id;
    const h3 = computeH3(ev.latitude, ev.longitude);

    // Find or connect tags
    const tagConnections = ev.tags
      .filter((t) => tagRecords.has(t))
      .map((t) => ({ id: tagRecords.get(t)! }));

    // Use upsert on title+cityId to be idempotent
    // Since there's no unique constraint on title, we create and catch duplicates
    const existing = await prisma.event.findFirst({
      where: { title: ev.title, cityId },
    });

    let eventRecord;
    if (existing !== null) {
      eventRecord = await prisma.event.update({
        where: { id: existing.id },
        data: {
          description: ev.description,
          locationName: ev.locationName,
          latitude: ev.latitude,
          longitude: ev.longitude,
          h3R6: h3.h3R6,
          h3R7: h3.h3R7,
          h3R8: h3.h3R8,
          h3R9: h3.h3R9,
          h3R11: h3.h3R11,
          category: ev.category,
          eventDate: new Date(ev.eventDate),
          startTime: new Date(ev.startTime),
          endTime: ev.endTime !== undefined ? new Date(ev.endTime) : null,
          status: EventStatus.ACTIVE,
          submittedById: userId,
          tags: { set: tagConnections },
        },
      });
    } else {
      eventRecord = await prisma.event.create({
        data: {
          title: ev.title,
          description: ev.description,
          locationName: ev.locationName,
          latitude: ev.latitude,
          longitude: ev.longitude,
          h3R6: h3.h3R6,
          h3R7: h3.h3R7,
          h3R8: h3.h3R8,
          h3R9: h3.h3R9,
          h3R11: h3.h3R11,
          category: ev.category,
          eventDate: new Date(ev.eventDate),
          startTime: new Date(ev.startTime),
          endTime: ev.endTime !== undefined ? new Date(ev.endTime) : null,
          status: EventStatus.ACTIVE,
          cityId,
          submittedById: userId,
          tags: { connect: tagConnections },
        },
      });
    }

    eventRecords.push({ id: eventRecord.id, title: eventRecord.title });
    console.log(`  ${eventRecord.title} [${ev.category}] (${eventRecord.id})`);
  }

  // ── Seed user interactions ──────────────────────────────────────────────
  console.log("\nUser Interactions:");
  let interactionCount = 0;

  // Helper: create interaction only if that user+event+type combo doesn't exist yet
  const createInteractionIfNew = async (userId: string, eventId: string, type: "VIEW" | "SAVE" | "SHARE" | "FLAG") => {
    const exists = await prisma.userInteraction.findFirst({ where: { userId, eventId, type } });
    if (exists !== null) return;
    await prisma.userInteraction.create({ data: { userId, eventId, type } });
    interactionCount++;
  };

  // Demo user views several events
  const demoUserId = userRecords[0]!.id;
  for (let i = 0; i < Math.min(8, eventRecords.length); i++) {
    await createInteractionIfNew(demoUserId, eventRecords[i]!.id, "VIEW");
  }

  // Demo user saves a few events
  for (const idx of [0, 3, 6]) {
    if (eventRecords[idx] !== undefined) {
      await createInteractionIfNew(demoUserId, eventRecords[idx]!.id, "SAVE");
    }
  }

  // Demo user shares one event
  if (eventRecords[0] !== undefined) {
    await createInteractionIfNew(demoUserId, eventRecords[0]!.id, "SHARE");
  }

  // Other users view and save events
  for (let userIdx = 1; userIdx < userRecords.length; userIdx++) {
    const userId = userRecords[userIdx]!.id;
    const viewCount = 3 + (userIdx % 3);
    for (let i = 0; i < viewCount && i < eventRecords.length; i++) {
      const eventIdx = (userIdx * 3 + i) % eventRecords.length;
      await createInteractionIfNew(userId, eventRecords[eventIdx]!.id, "VIEW");
    }
    if (eventRecords[userIdx] !== undefined) {
      await createInteractionIfNew(userId, eventRecords[userIdx]!.id, "SAVE");
    }
  }

  console.log(`  Created ${interactionCount} interactions`);

  // ── Seed announcements ──────────────────────────────────────────────────
  console.log("\nAnnouncements:");
  const ANNOUNCEMENTS = [
    {
      title: "Welcome to Event GO Kingston!",
      content: "We've just launched our newest city dashboard for Kingston. Explore the latest events, nightlife, and culture across the city.",
      priority: 1,
    },
    {
      title: "Scheduled Maintenance",
      content: "The Event GO API will be undergoing brief maintenance tomorrow at 3:00 AM UTC. Expect minor service interruptions.",
      priority: 2,
    },
    {
      title: "New AI Ranking Feature",
      content: "Our AI classification engine now supports personalized vibe-based ranking. Update your profile to get better recommendations!",
      priority: 0,
    },
  ];

  for (const ann of ANNOUNCEMENTS) {
    const existing = await prisma.announcement.findFirst({ where: { title: ann.title } });
    const upserted = existing !== null
      ? await prisma.announcement.update({ where: { id: existing.id }, data: ann })
      : await prisma.announcement.create({ data: ann });
    console.log(`  ${upserted.title} (${upserted.id})`);
  }

  console.log("\nSeeding complete.");
  console.log(`  ${cityRecords.length} cities`);
  console.log(`  ${tagRecords.size} tags`);
  console.log(`  ${userRecords.length} users`);
  console.log(`  ${userRecords.length} user profiles`);
  console.log(`  ${eventRecords.length} events`);
  console.log(`  ${interactionCount} interactions`);
  console.log(`\nDemo login: demo@citypulse.app / demo1234`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
