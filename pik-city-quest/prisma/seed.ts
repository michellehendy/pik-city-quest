/* eslint-disable no-console */
// Seeds the PIK CITY QUEST database.
// Destinations, transport routes, events, facilities and Tourist Exclusive partners come from piktourism.com (public API, Nov 2026).
// Quests, missions, badges, rewards, challenges and demo users are SAMPLE content marked isSample=true where applicable –
// administrators replace them in the admin dashboard.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import destinationsData from "./seed-data/destinations.json";
import transportData from "./seed-data/transport.json";
import tenantsData from "./seed-data/tenants.json";
import eventsData from "./seed-data/events.json";
import facilitiesData from "./seed-data/facilities.json";

const prisma = new PrismaClient();
const token = (n = 18) => randomBytes(n).toString("base64url");
const code = (len = 8) => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(len)).map((b) => a[b % a.length]).join("");
};
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

async function reset() {
  const tables = [
    "RewardRedemption", "UserReward", "Reward", "UserBadge", "Badge", "UserChallenge", "Challenge",
    "RequirementSubmission", "MissionSubmission", "CheckpointProgress", "QuestRun", "QrScan", "QrCode",
    "CheckpointMission", "MissionRequirement", "Mission", "QuestCheckpoint", "Quest", "XpTransaction",
    "Notification", "ChatMessage", "MediaUpload", "Story", "AuditLog", "Event", "TransportStop", "TransportRoute",
    "Facility", "Destination", "Area", "Partner", "Session", "PasswordResetToken", "EmailVerificationToken", "User",
    "Level", "XpRule", "Setting",
  ];
  for (const t of tables) await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
}

async function main() {
  await reset();

  // ── Levels & XP rules ──────────────────────────────────────────────
  await prisma.level.createMany({
    data: [
      { order: 1, name: "BEGINNER", minXp: 0, icon: "🌱", color: "#64748b", description: "Every adventure starts with a first step." },
      { order: 2, name: "EXPLORER", minXp: 500, icon: "🧭", color: "#40c0c8", description: "You know your way around PIK." },
      { order: 3, name: "TRAVELER", minXp: 1500, icon: "🎒", color: "#087088", description: "Seasoned PIK traveler." },
      { order: 4, name: "PIK ENTHUSIAST", minXp: 3500, icon: "🌅", color: "#f8b818", description: "You live for PIK sunsets." },
      { order: 5, name: "PIK LEGEND", minXp: 7000, icon: "👑", color: "#e11d48", description: "A true legend of Pantai Indah Kapuk." },
    ],
  });
  await prisma.xpRule.createMany({
    data: [
      { key: "CHECKPOINT_BONUS", label: "Checkpoint completed bonus", amount: 25, description: "Added when all mandatory missions at a checkpoint are approved." },
      { key: "NEW_DESTINATION", label: "New destination discovered", amount: 20, description: "First approved mission at a destination." },
      { key: "QUEST_COMPLETE_DEFAULT", label: "Default quest completion XP", amount: 200, description: "Used when a quest has no completion XP configured." },
      { key: "STREAK_DAY", label: "Daily streak bonus", amount: 10, description: "Awarded per consecutive active day (max once per day)." },
      { key: "DAILY_CHALLENGE", label: "Daily challenge", amount: 30, description: "Default XP for daily challenges." },
      { key: "WEEKLY_CHALLENGE", label: "Weekly challenge", amount: 80, description: "Default XP for weekly challenges." },
      { key: "POINTS_PER_XP", label: "Reward points per XP", amount: 1, description: "Redeemable points credited per XP earned (reward economy)." },
    ],
  });
  await prisma.setting.createMany({
    data: [
      { key: "app", value: JSON.stringify({ name: "PIK CITY QUEST", tagline: "EXPLORE PIK. COMPLETE QUESTS. COLLECT EXPERIENCES.", publicUrl: "https://piktourism.com/city-quest" }) },
      { key: "taupik", value: JSON.stringify({ mode: process.env.ANTHROPIC_API_KEY ? "live" : "demo", welcome: "Hi! I'm TauPIK, your PIK tourism assistant. Ask me where to go, what to eat, or how to get to your next checkpoint." }) },
    ],
  });

  // ── Areas ──────────────────────────────────────────────────────────
  const areas = await Promise.all([
    prisma.area.create({ data: { slug: "pik1", name: "PIK1", description: "The original Pantai Indah Kapuk: PIK Avenue, Fresh Market, TWA Angke Kapuk mangroves and Tzu Chi.", color: "#087088", centerLat: -6.105, centerLng: 106.741, zoom: 15, sortOrder: 1 } }),
    prisma.area.create({ data: { slug: "golf-island", name: "Golf Island", description: "Reclaimed island lifestyle hub: Pantjoran PIK, Batavia PIK, Cove, Central Market, East Coast and By The Sea.", color: "#f8b818", centerLat: -6.0915, centerLng: 106.744, zoom: 16, sortOrder: 2 } }),
    prisma.area.create({ data: { slug: "riverwalk-island", name: "Riverwalk Island", description: "Sunset Pier, Si Mian Fo, Tian Fu Gong and Masjid Al-Ikhlas along the water.", color: "#8b5cf6", centerLat: -6.091, centerLng: 106.7355, zoom: 16, sortOrder: 3 } }),
    prisma.area.create({ data: { slug: "pik2", name: "PIK2", description: "Pantai Indah Kapuk 2: Aloha, Land's End, Dermaga CBD Beachwalk, Kota Belanda, Dragon Point and Little Siam.", color: "#40c0c8", centerLat: -6.06, centerLng: 106.705, zoom: 13, sortOrder: 4 } }),
  ]);
  const areaBySlug = Object.fromEntries(areas.map((a) => [a.slug, a]));
  const areaSlugFromName: Record<string, string> = { PIK1: "pik1", "Golf Island": "golf-island", "Riverwalk Island": "riverwalk-island", PIK2: "pik2" };

  // ── Partners (Tourist Exclusive tenants) ──────────────────────────
  const partners: Record<string, { id: string }> = {};
  for (const t of tenantsData) {
    partners[t.name] = await prisma.partner.create({ data: { name: t.name, logoUrl: t.photo, description: t.description, contact: "visitor@piktourism.com" } });
  }

  // ── Destinations (official data) ──────────────────────────────────
  const destBySlug: Record<string, { id: string; lat: number; lng: number; name: string; areaId: string }> = {};
  const destByName: Record<string, { id: string; lat: number; lng: number; name: string; areaId: string }> = {};
  const tagsFor = (d: (typeof destinationsData)[number]) => {
    const tags: string[] = [];
    if (d.categories.includes("Paw Proved")) tags.push("pet-friendly");
    if (d.categories.includes("Culinary")) tags.push("culinary");
    if (d.categories.includes("Spiritual")) tags.push("worship");
    if (d.categories.includes("Beach & Water")) tags.push("beach", "sunset");
    if (d.categories.includes("Photo Spot")) tags.push("photo-spot");
    if (d.categories.includes("Night Life")) tags.push("nightlife");
    if (d.categories.includes("Green Tourism")) tags.push("nature", "family");
    if (d.categories.includes("Sport")) tags.push("sport");
    if (d.categories.includes("Shopping")) tags.push("shopping");
    if (d.categories.includes("Activities")) tags.push("activities", "family");
    if (/masjid|mosque/i.test(d.name)) tags.push("halal", "mosque");
    if (/fo pik|tian fu|pagoda|taman doa|tzu chi/i.test(d.name)) tags.push("temple");
    if (/pantjoran|batavia|aloha|land's end|dermaga|little siam/i.test(d.name)) tags.push("iconic");
    return Array.from(new Set(tags));
  };
  for (const d of destinationsData) {
    const lat = d.lat ?? -6.0875;
    const lng = d.lng ?? 106.7357;
    const isSample = d.lat == null;
    const partnerId = /animal\.inc/i.test(d.name) ? partners["Animal.inc"]?.id : /fish\.inc/i.test(d.name) ? partners["Fish.inc"]?.id : /express rental/i.test(d.name) ? partners["Express Fun"]?.id : undefined;
    const rec = await prisma.destination.create({
      data: {
        externalId: d.externalId,
        slug: d.slug,
        name: d.name,
        description: d.description,
        longDescription: d.longDescription || null,
        category: d.primaryCategory,
        categories: JSON.stringify(d.categories),
        tags: JSON.stringify(tagsFor(d)),
        areaId: areaBySlug[areaSlugFromName[d.area]].id,
        address: d.address || null,
        lat,
        lng,
        coverImage: d.imageUrl,
        gallery: JSON.stringify(d.gallery || []),
        openingHours: d.openingHours || null,
        websiteUrl: d.websiteUrl,
        gmapUrl: d.gmapUrl || null,
        gpsRadiusM: 150,
        isSample,
        partnerId,
      },
    });
    destBySlug[d.slug] = rec;
    destByName[d.name] = rec;
  }
  const D = (name: string) => {
    const r = destByName[name];
    if (!r) throw new Error("Missing destination " + name);
    return r;
  };

  // ── Facilities ─────────────────────────────────────────────────────
  for (const f of facilitiesData) {
    await prisma.facility.create({ data: { name: f.name, type: f.type, address: f.address || null, lat: f.lat ?? null, lng: f.lng ?? null, phone: f.phone || null, openingHours: f.openingHours || null, imageUrl: f.imageUrl || null, gmapUrl: f.gmapUrl || null } });
  }

  // ── Transport routes (official route list; stop geometry is SAMPLE derived from destination coordinates) ──
  const stopSets: Record<string, Array<[string, number, number]>> = {
    "ROYAL TRANS-01": [["Shelter PIK2", -6.0615, 106.7125], ["Aloha PIK2", -6.0718, 106.7151], ["Land's End PIK2", -6.0823, 106.7223], ["NICE PIK2", -6.0875, 106.7297], ["Sunset Pier", -6.0942, 106.7352], ["Batavia PIK", -6.0935, 106.7396], ["Pantjoran PIK", -6.0885, 106.7429], ["PIK Avenue", -6.1088, 106.7402]],
    "ROYAL TRANS-02": [["PIK2 Millennials", -6.0491, 106.7027], ["CBD PIK2", -6.0615, 106.7125], ["Aloha PIK2", -6.0718, 106.7151], ["Land's End PIK2", -6.0823, 106.7223], ["Cove at Batavia", -6.0881, 106.7418], ["PIK Avenue", -6.1088, 106.7402]],
    "ROYAL TRANS-05": [["Pasadena", -6.0665, 106.6965], ["Dragon Point", -6.0452, 106.6972], ["Kota Belanda", -6.0437, 106.6931], ["Community Park PIK2", -6.0572, 106.7078], ["Shelter PIK2", -6.0615, 106.7125]],
    "TREX-03": [["Tokyo Riverside Apt.", -6.0409, 106.6917], ["IDD PIK2", -6.0491, 106.7027], ["Monumen Soekarno-Hatta", -6.0671, 106.71], ["PIK Avenue", -6.1088, 106.7402]],
    "TREX-04": [["Shelter PIK2", -6.0615, 106.7125], ["Rasuna Said / Entertainment District", -6.0472, 106.7046], ["PIK Avenue", -6.1088, 106.7402]],
    "Transjakarta-T31": [["Blok M", -6.2437, 106.8003], ["PIK Avenue", -6.1088, 106.7402], ["Shelter PIK2", -6.0615, 106.7125]],
    "Transjakarta-1A": [["Balai Kota", -6.1816, 106.8285], ["PIK Avenue", -6.1088, 106.7402], ["Pantai Maju (Golf Island)", -6.0915, 106.744]],
    "Hub Connector-HC1": [["Juanda", -6.1665, 106.8306], ["PIK Avenue", -6.1088, 106.7402], ["Shelter PIK2", -6.0615, 106.7125]],
    "Hub Connector-HC2": [["Dukuh Atas", -6.2008, 106.8229], ["GKT PIK2", -6.0491, 106.7027]],
    "TREX-TREX": [["Sedayu City Kelapa Gading", -6.1522, 106.9155], ["Tokyo Riverside PIK2", -6.0409, 106.6917]],
  };
  for (const t of transportData) {
    const key = `${t.operator}-${t.code}`;
    const stops = stopSets[key] || [];
    const route = await prisma.transportRoute.create({
      data: {
        operator: t.operator, code: t.code, name: t.route, category: t.category, color: t.color, imageUrl: t.imageUrl,
        notes: t.category === "Getting Here" ? "Connects PIK with Greater Jakarta. Source: piktourism.com/transportation" : "Shuttle service inside PIK. Stop positions are sample data – edit in admin.",
        polyline: JSON.stringify(stops.map((s) => [s[1], s[2]])),
      },
    });
    await prisma.transportStop.createMany({ data: stops.map((s, i) => ({ routeId: route.id, name: s[0], lat: s[1], lng: s[2], order: i })) });
  }
  // Sea access to Kepulauan Seribu (Thousand Islands) from Dermaga CBD – from piktourism.com homepage promo
  const ferry = await prisma.transportRoute.create({
    data: { operator: "Sealeader Marine / Safari Signature", code: "SEA", name: "Dermaga CBD PIK2 – Kepulauan Seribu (Thousand Islands)", category: "Sea", color: "#0ea5e9", notes: "Island getaway departures from Dermaga CBD. See piktourism.com for current promos and schedules.", polyline: JSON.stringify([[-6.0616, 106.7125], [-5.95, 106.65]]) },
  });
  await prisma.transportStop.createMany({ data: [{ routeId: ferry.id, name: "Dermaga CBD Beachwalk PIK2", lat: -6.0616, lng: 106.7125, order: 0 }, { routeId: ferry.id, name: "Kepulauan Seribu", lat: -5.95, lng: 106.65, order: 1 }] });

  // ── Events (official) ──────────────────────────────────────────────
  const locMap: Record<string, string> = { Aloha: "Aloha Pasir Putih PIK2", "Aloha PIK2": "Aloha Pasir Putih PIK2", "Sunset Pier": "Sunset Pier PIK", "East Coast": "East Coast PIK", "Lands End PIK2": "Land's End PIK2" };
  const eventIdByTitle: Record<string, string> = {};
  for (const e of eventsData) {
    const locName = locMap[e.location || ""] || e.location || "";
    const dest = destByName[locName];
    const rec = await prisma.event.create({
      data: {
        externalId: e.externalId, title: e.title, category: e.category, startDate: new Date(e.startDate), endDate: new Date(e.endDate),
        startTime: e.startTime, endTime: e.endTime, location: e.location, destinationId: dest?.id, excerpt: e.excerpt, description: e.description, imageUrl: e.imageUrl, url: e.url,
      },
    });
    eventIdByTitle[e.title] = rec.id;
  }

  // ── Missions (SAMPLE, reusable) ────────────────────────────────────
  type ReqIn = { type: string; label?: string; config?: Record<string, unknown>; isMandatory?: boolean };
  async function mission(m: { name: string; description: string; instructions: string; type: string; dest?: string; xp?: number; difficulty?: string; verification?: string; reqs: ReqIn[]; stepsOrdered?: boolean; maxAttempts?: number; timeLimitSec?: number }) {
    const rec = await prisma.mission.create({
      data: {
        name: m.name, description: m.description, instructions: m.instructions, type: m.type,
        destinationId: m.dest ? D(m.dest).id : null, xp: m.xp ?? 50, difficulty: m.difficulty ?? "EASY",
        verification: m.verification ?? (m.reqs.some((r) => ["PHOTO", "VIDEO", "SOCIAL", "FIND_OBJECT"].includes(r.type)) ? "MANUAL" : "AUTO"),
        stepsOrdered: m.stepsOrdered ?? true, maxAttempts: m.maxAttempts ?? null, timeLimitSec: m.timeLimitSec ?? null,
        requirements: { create: m.reqs.map((r, i) => ({ order: i, type: r.type, label: r.label ?? null, config: JSON.stringify(r.config ?? {}), isMandatory: r.isMandatory ?? true })) },
      },
    });
    return rec;
  }
  const gps = (radiusM = 150) => ({ type: "GPS", label: "Check in on location", config: { radiusM } });
  const qr = () => ({ type: "QR", label: "Scan the venue QR code", config: {} });
  const photo = (prompt: string) => ({ type: "PHOTO", label: prompt, config: { prompt, maxSizeMB: 10 } });
  const quiz = (questions: Array<{ text: string; options: string[]; correctIndex: number; type?: string }>, maxAttempts = 3) => ({ type: "QUIZ", label: "Answer the quiz", config: { questions: questions.map((q, i) => ({ id: `q${i + 1}`, type: q.type ?? "multiple", ...q })), passScore: 1, maxAttempts, timerSec: 90 } });
  const secret = (c: string, maxAttempts = 5) => ({ type: "CODE", label: "Enter the secret code", config: { code: c, maxAttempts, caseSensitive: false, expiresAt: null } });

  const M = {
    pantjoranQr: await mission({ name: "Welcome to Pantjoran", description: "Scan the PIK City Quest QR code displayed at the Pantjoran Pagoda plaza.", instructions: "Find the PIK City Quest sign near the pagoda and scan its QR code with your camera.", type: "QR", dest: "Pantjoran PIK", xp: 50, reqs: [qr()] }),
    pantjoranPhoto: await mission({ name: "Pagoda Portrait", description: "Take a photo with the iconic Pantjoran Pagoda.", instructions: "Stand in front of the Pantjoran Pagoda and take a photo that clearly shows the pagoda. Upload it for review.", type: "PHOTO", dest: "Pantjoran PIK", xp: 75, difficulty: "EASY", reqs: [photo("Photo with the Pantjoran Pagoda")] }),
    pantjoranQuiz: await mission({ name: "Chinatown Heritage Quiz", description: "Test what you learned about Pantjoran PIK.", instructions: "Answer all questions correctly. You have 3 attempts.", type: "QUIZ", dest: "Pantjoran PIK", xp: 60, difficulty: "MEDIUM", reqs: [quiz([
      { text: "Pantjoran Chinatown PIK is inspired by which historic Jakarta Chinatown?", options: ["Glodok", "Kota Tua", "Senen", "Pasar Baru"], correctIndex: 0 },
      { text: "What stands at the heart of Pantjoran PIK?", options: ["A lighthouse", "The Pantjoran Pagoda", "A Dutch windmill", "A Ferris wheel"], correctIndex: 1 },
      { text: "Pantjoran PIK is located on which PIK area?", options: ["Riverwalk Island", "PIK2", "Golf Island", "Ebony Island"], correctIndex: 2 },
    ])] }),
    bataviaMulti: await mission({ name: "Floating City Explorer", description: "Check in, scan and answer a question at Batavia PIK.", instructions: "1) Check in with GPS. 2) Scan the venue QR. 3) Answer the quiz.", type: "MULTI", dest: "Batavia PIK", xp: 120, difficulty: "MEDIUM", stepsOrdered: true, reqs: [gps(200), qr(), quiz([
      { text: "Batavia PIK is designed as a unique…", options: ["Floating city", "Desert oasis", "Mountain village", "Jungle lodge"], correctIndex: 0 },
      { text: "Old Batavia was once nicknamed…", options: ["Pearl of the Orient", "Queen of the East", "Venice of Asia", "Gateway to Java"], correctIndex: 1 },
    ])] }),
    bataviaPhoto: await mission({ name: "Bridge Moment", description: "Capture one of Batavia PIK's thematic bridges.", instructions: "Take a photo on or in front of a thematic bridge with the colonial-style buildings in view.", type: "PHOTO", dest: "Batavia PIK", xp: 60, reqs: [photo("Photo at a Batavia PIK bridge")] }),
    alohaGps: await mission({ name: "Aloha Check-in", description: "Check in within 150 m of Aloha Pasir Putih.", instructions: "Allow location access and tap Check In when you are on the beach.", type: "GPS", dest: "Aloha Pasir Putih PIK2", xp: 40, reqs: [gps(150)] }),
    alohaQr: await mission({ name: "Scan at Aloha", description: "Scan the PIK City Quest QR code at the Aloha entrance.", instructions: "Look for the quest sign near the main entrance and scan it.", type: "QR", dest: "Aloha Pasir Putih PIK2", xp: 50, reqs: [qr()] }),
    alohaPhoto: await mission({ name: "Slice of Hawaii", description: "Take a beach photo with the palm trees and white sand.", instructions: "Your photo must clearly show the Aloha beach setting.", type: "PHOTO", dest: "Aloha Pasir Putih PIK2", xp: 70, reqs: [photo("Beach photo at Aloha Pasir Putih")] }),
    landsEndCode: await mission({ name: "Lighthouse Secret", description: "Find the secret code displayed at the Land's End lighthouse.", instructions: "The code is printed on the PIK City Quest board next to the lighthouse. Enter it here.", type: "CODE", dest: "Land's End PIK2", xp: 60, difficulty: "MEDIUM", reqs: [secret("LIGHTHOUSE26")] }),
    landsEndPhoto: await mission({ name: "Sunset at the Lighthouse", description: "Photograph the white-and-blue lighthouse.", instructions: "Bonus points for golden hour. Upload a photo that clearly shows the lighthouse.", type: "PHOTO", dest: "Land's End PIK2", xp: 70, reqs: [photo("Photo with the Land's End lighthouse")] }),
    dermagaGpsQuiz: await mission({ name: "Pier Walk", description: "Walk the 300-metre pier and answer a question.", instructions: "Check in on the pier, then answer the quiz.", type: "MULTI", dest: "Dermaga CBD Beachwalk PIK2", xp: 100, difficulty: "MEDIUM", reqs: [gps(250), quiz([
      { text: "How long is the iconic pier at Dermaga CBD Beachwalk PIK2?", options: ["100 metres", "300 metres", "1 kilometre", "4 kilometres"], correctIndex: 1 },
      { text: "Dermaga CBD is a departure point for trips to…", options: ["Bali", "Kepulauan Seribu (Thousand Islands)", "Bandung", "Krakatau"], correctIndex: 1 },
    ])] }),
    dermagaVideo: await mission({ name: "Pier Panorama", description: "Record a short panorama video from the end of the pier.", instructions: "Record up to 20 seconds showing the sea view from the pier.", type: "VIDEO", dest: "Dermaga CBD Beachwalk PIK2", xp: 90, difficulty: "MEDIUM", reqs: [{ type: "VIDEO", label: "Panorama video from the pier", config: { maxSizeMB: 40, maxDurationSec: 20 } }] }),
    littleSiamQr: await mission({ name: "Welcome to the New Bangkok", description: "Scan the quest QR code at Little Siam PIK2.", instructions: "Find the PIK City Quest sign near the Four-Faced Buddha plaza and scan it.", type: "QR", dest: "Little Siam PIK2", xp: 50, reqs: [qr()] }),
    littleSiamPhoto: await mission({ name: "Thai Street Snapshot", description: "Take a photo with the colourful Thai-inspired shophouses.", instructions: "Upload a photo that clearly shows Little Siam's architecture.", type: "PHOTO", dest: "Little Siam PIK2", xp: 80, reqs: [photo("Photo with Little Siam shophouses")] }),
    littleSiamQuiz: await mission({ name: "Little Siam Trivia", description: "Quick trivia about Little Siam PIK2.", instructions: "Answer correctly to complete the final checkpoint.", type: "QUIZ", dest: "Little Siam PIK2", xp: 60, reqs: [quiz([
      { text: "Little Siam PIK2 is also known as…", options: ["The New Bangkok", "Little Tokyo", "Mini Seoul", "Chinatown 2"], correctIndex: 0 },
      { text: "Which shrine can be found at Little Siam?", options: ["Erawan-style Four-Faced Buddha", "Borobudur replica", "Prambanan replica", "Golden Pavilion"], correctIndex: 0 },
    ])] }),
    sunsetPierGps: await mission({ name: "Golden Hour Check-in", description: "Check in at Sunset Pier between 4 PM and 7 PM.", instructions: "Be on the boardwalk during golden hour and tap Check In.", type: "GPS", dest: "Sunset Pier PIK", xp: 60, difficulty: "MEDIUM", reqs: [{ type: "GPS", label: "Check in during golden hour", config: { radiusM: 200, timeWindow: { from: "16:00", to: "19:00" } } }] }),
    sunsetPierPhoto: await mission({ name: "Sunset Chaser", description: "Capture the sunset from the overwater boardwalk.", instructions: "Upload a sunset photo taken at Sunset Pier.", type: "PHOTO", dest: "Sunset Pier PIK", xp: 70, reqs: [photo("Sunset photo at Sunset Pier")] }),
    simianfoQuiz: await mission({ name: "Erawan of PIK", description: "Learn about Si Mian Fo.", instructions: "Check in and answer the quiz.", type: "MULTI", dest: "Si Mian Fo PIK", xp: 80, reqs: [gps(150), quiz([
      { text: "Si Mian Fo PIK replicates which famous shrine?", options: ["Erawan Shrine, Bangkok", "Wat Arun", "Shwedagon Pagoda", "Angkor Wat"], correctIndex: 0 },
      { text: "True or false: entry to Si Mian Fo is free.", options: ["True", "False"], correctIndex: 0, type: "truefalse" },
    ])] }),
    tianfugongGps: await mission({ name: "Temple of Harmony", description: "Visit Tian Fu Gong, home to Indonesia's tallest Jade Emperor statue.", instructions: "Check in at the temple grounds.", type: "GPS", dest: "Tian Fu Gong (天福宫) PIK", xp: 40, reqs: [gps(200)] }),
    alikhlasGps: await mission({ name: "Twin Minarets", description: "Visit Masjid Al-Ikhlas on Riverwalk Island.", instructions: "Check in respectfully near the mosque entrance.", type: "GPS", dest: "Masjid Al-Ikhlas PIK", xp: 40, reqs: [gps(200)] }),
    kotaBelandaPhoto: await mission({ name: "Amsterdam in PIK2", description: "Photo at the Kota Belanda canal.", instructions: "Capture the colourful Dutch-style shophouses and canal.", type: "PHOTO", dest: "Kota Belanda (La Riviera) PIK2", xp: 70, reqs: [photo("Photo at Kota Belanda canal")] }),
    dragonPointQuiz: await mission({ name: "Golden Dragon", description: "Check in and answer a question about Dragon Point.", instructions: "Check in near the dragon statue, then answer.", type: "MULTI", dest: "Dragon Point PIK2", xp: 80, reqs: [gps(200), quiz([
      { text: "How long is the golden dragon statue at Dragon Point PIK2?", options: ["53 m", "103 m", "153 m", "253 m"], correctIndex: 2 },
    ])] }),
    monumenGps: await mission({ name: "17 Metres of History", description: "Check in at Monumen Soekarno-Hatta.", instructions: "Check in near the monument and answer the quiz.", type: "MULTI", dest: "Monumen Soekarno-Hatta PIK2", xp: 70, reqs: [gps(200), quiz([
      { text: "The monument's 17-metre height symbolises…", options: ["17 founding provinces", "Independence day, 17 August 1945", "17 islands", "17 heroes"], correctIndex: 1 },
    ])] }),
    communityParkGps: await mission({ name: "Park Life", description: "Check in at Community Park PIK2.", instructions: "Enjoy the park and check in.", type: "GPS", dest: "Community Park PIK2", xp: 40, reqs: [gps(250)] }),
    covePhoto: await mission({ name: "Seaside Promenade", description: "Photo along the Cove at Batavia promenade.", instructions: "Upload a photo of the seaside promenade.", type: "PHOTO", dest: "Cove at Batavia PIK", xp: 60, reqs: [photo("Photo at Cove at Batavia promenade")] }),
    centralMarketQuiz: await mission({ name: "Green Building Quiz", description: "Central Market PIK is Indonesia's first EDGE Advanced certified retail building.", instructions: "Check in and answer.", type: "MULTI", dest: "Central Market PIK", xp: 70, reqs: [gps(150), quiz([
      { text: "Central Market PIK was Indonesia's first retail building to receive which certification?", options: ["LEED Platinum", "EDGE Advanced Green Building", "BREEAM Excellent", "Greenship Gold"], correctIndex: 1 },
    ])] }),
    eastCoastPhoto: await mission({ name: "Alfresco Afternoon", description: "Photo of the rustic tropical patios at East Coast.", instructions: "Upload a photo at East Coast By The Sea.", type: "PHOTO", dest: "East Coast PIK", xp: 60, reqs: [photo("Photo at East Coast By The Sea")] }),
    byTheSeaQr: await mission({ name: "Seaside Shopping", description: "Scan the quest QR at By The Sea PIK.", instructions: "Find the quest sign at the main atrium.", type: "QR", dest: "By The Sea PIK", xp: 50, reqs: [qr()] }),
    orangeGrovesGps: await mission({ name: "Riverside Slow Living", description: "Check in at Orange Groves PIK2.", instructions: "Check in by the Tahang River.", type: "GPS", dest: "Orange Groves PIK2", xp: 40, reqs: [gps(200)] }),
    petPhotoEastCoast: await mission({ name: "Paw Proved Portrait", description: "Photo with your pet at a Paw Proved venue.", instructions: "Upload a photo with your pet at East Coast PIK.", type: "PHOTO", dest: "East Coast PIK", xp: 80, reqs: [photo("Photo with your pet at East Coast PIK")] }),
    shuttleCode: await mission({ name: "Ride the PIK Shuttle", description: "Ride Royal Trans and enter the code shown inside the bus.", instructions: "Board any Royal Trans shuttle and enter the PIK City Quest code displayed on board.", type: "CODE", xp: 60, difficulty: "MEDIUM", reqs: [secret("ROYALTRANS")] }),
    pawfallEvent: await mission({ name: "Pawfall Season Check-in", description: "Check in at East Coast during Pawfall Season (13–22 Nov 2026).", instructions: "Check in at East Coast PIK while the event is running.", type: "EVENT_CHECKIN", dest: "East Coast PIK", xp: 80, reqs: [{ type: "EVENT_CHECKIN", label: "Check in during the event", config: { eventId: eventIdByTitle["Pawfall Season"], radiusM: 250 } }] }),
  };

  // ── Quests (SAMPLE – fully editable) ───────────────────────────────
  const admin = await prisma.user.create({
    data: { email: "admin@piktourism.local", passwordHash: await bcrypt.hash("Admin123!", 10), name: "PIK Super Admin", username: "pik_admin", role: "SUPER_ADMIN", emailVerifiedAt: new Date(), publicProfile: false },
  });
  const questManager = await prisma.user.create({ data: { email: "quests@piktourism.local", passwordHash: await bcrypt.hash("Quest123!", 10), name: "Quest Manager", username: "quest_manager", role: "QUEST_MANAGER", emailVerifiedAt: new Date(), publicProfile: false } });
  const verifier = await prisma.user.create({ data: { email: "verify@piktourism.local", passwordHash: await bcrypt.hash("Verify123!", 10), name: "Verification Admin", username: "verifier", role: "VERIFICATION_ADMIN", emailVerifiedAt: new Date(), publicProfile: false } });
  const partnerAdmin = await prisma.user.create({ data: { email: "partner@expressfun.local", passwordHash: await bcrypt.hash("Partner123!", 10), name: "Express Fun Venue Admin", username: "expressfun_venue", role: "PARTNER_ADMIN", partnerId: partners["Express Fun"].id, emailVerifiedAt: new Date(), publicProfile: false } });

  type CpIn = { dest: string; missions: Array<{ id: string; mandatory?: boolean }>; intro?: string };
  async function quest(q: { slug: string; name: string; tagline: string; description: string; cover: string; type?: string; difficulty?: string; duration: number; status?: string; rule?: string; minCheckpoints?: number; completionXp?: number; bonusXp?: number; startsAt?: Date; endsAt?: Date; featured?: boolean; rules?: string; checkpoints: CpIn[]; sortOrder?: number }) {
    const areaSlugs = Array.from(new Set(q.checkpoints.map((c) => areas.find((a) => a.id === D(c.dest).areaId)!.slug)));
    const rec = await prisma.quest.create({
      data: {
        slug: q.slug, name: q.name, tagline: q.tagline, description: q.description, coverImage: q.cover, type: q.type ?? "REGULAR", difficulty: q.difficulty ?? "EASY",
        durationMinutes: q.duration, status: q.status ?? "PUBLISHED", completionRule: q.rule ?? "SEQUENTIAL", minCheckpoints: q.minCheckpoints ?? null,
        completionXp: q.completionXp ?? 200, bonusXp: q.bonusXp ?? 0, startsAt: q.startsAt ?? null, endsAt: q.endsAt ?? null, isFeatured: q.featured ?? false,
        areas: JSON.stringify(areaSlugs), createdById: admin.id, sortOrder: q.sortOrder ?? 0,
        rules: q.rules ?? "Visit each checkpoint in person. Missions are verified automatically or by the PIK Tourism team. XP is awarded only after verification. Be respectful of venues and other visitors.",
        checkpoints: {
          create: q.checkpoints.map((c, i) => ({
            destinationId: D(c.dest).id, order: i, isStart: i === 0, isEnd: i === q.checkpoints.length - 1, intro: c.intro ?? null,
            missions: { create: c.missions.map((m, j) => ({ missionId: m.id, order: j, isMandatory: m.mandatory ?? true })) },
          })),
        },
      },
      include: { checkpoints: { include: { missions: true }, orderBy: { order: "asc" } } },
    });
    return rec;
  }
  const img = (name: string) => destinationsData.find((d) => d.name === name)?.imageUrl ?? null;

  const questA = await quest({
    slug: "pik-discovery-quest", name: "PIK Discovery Quest", tagline: "Six icons, one unforgettable route.",
    description: "The classic PIK City Quest. Start among the lanterns of Pantjoran PIK, cross the floating city of Batavia, hit the white sand at Aloha, chase the lighthouse at Land's End, walk the Dermaga CBD pier and finish in the New Bangkok of Little Siam PIK2.",
    cover: img("Pantjoran PIK")!, type: "REGULAR", difficulty: "MEDIUM", duration: 300, completionXp: 300, featured: true, sortOrder: 1,
    checkpoints: [
      { dest: "Pantjoran PIK", missions: [{ id: M.pantjoranQr.id }, { id: M.pantjoranPhoto.id }, { id: M.pantjoranQuiz.id, mandatory: false }] },
      { dest: "Batavia PIK", missions: [{ id: M.bataviaMulti.id }, { id: M.bataviaPhoto.id, mandatory: false }] },
      { dest: "Aloha Pasir Putih PIK2", missions: [{ id: M.alohaQr.id }, { id: M.alohaPhoto.id }] },
      { dest: "Land's End PIK2", missions: [{ id: M.landsEndCode.id }, { id: M.landsEndPhoto.id, mandatory: false }] },
      { dest: "Dermaga CBD Beachwalk PIK2", missions: [{ id: M.dermagaGpsQuiz.id }, { id: M.dermagaVideo.id, mandatory: false }] },
      { dest: "Little Siam PIK2", missions: [{ id: M.littleSiamQr.id }, { id: M.littleSiamQuiz.id }, { id: M.littleSiamPhoto.id, mandatory: false }] },
    ],
  });
  const questB = await quest({
    slug: "pik2-explorer", name: "PIK2 Explorer", tagline: "Open route across the newest side of PIK.",
    description: "Explore PIK2 in any order: the Dermaga CBD pier, Monumen Soekarno-Hatta, Community Park, the canals of Kota Belanda, the golden dragon at Dragon Point and Little Siam.",
    cover: img("Dermaga CBD Beachwalk PIK2")!, type: "REGULAR", difficulty: "HARD", duration: 360, rule: "OPEN", completionXp: 350, sortOrder: 2,
    checkpoints: [
      { dest: "Dermaga CBD Beachwalk PIK2", missions: [{ id: M.dermagaGpsQuiz.id }] },
      { dest: "Monumen Soekarno-Hatta PIK2", missions: [{ id: M.monumenGps.id }] },
      { dest: "Community Park PIK2", missions: [{ id: M.communityParkGps.id }] },
      { dest: "Kota Belanda (La Riviera) PIK2", missions: [{ id: M.kotaBelandaPhoto.id }] },
      { dest: "Dragon Point PIK2", missions: [{ id: M.dragonPointQuiz.id }] },
      { dest: "Little Siam PIK2", missions: [{ id: M.littleSiamQr.id }, { id: M.littleSiamQuiz.id }] },
    ],
  });
  const questC = await quest({
    slug: "pik-weekend-quest", name: "PIK Weekend Quest", tagline: "Complete 4 of 6 checkpoints this season.",
    description: "A limited-time weekend special. Pick any four of six waterfront favourites between Aloha and Land's End, including Sunset Pier's golden hour.",
    cover: img("Aloha Pasir Putih PIK2")!, type: "SPECIAL", difficulty: "EASY", duration: 180, rule: "MINIMUM", minCheckpoints: 4, completionXp: 250, bonusXp: 100,
    startsAt: new Date("2026-11-01T00:00:00+07:00"), endsAt: new Date("2026-12-31T23:59:59+07:00"), featured: true, sortOrder: 3,
    checkpoints: [
      { dest: "Aloha Pasir Putih PIK2", missions: [{ id: M.alohaGps.id }] },
      { dest: "Sunset Pier PIK", missions: [{ id: M.sunsetPierGps.id }, { id: M.sunsetPierPhoto.id, mandatory: false }] },
      { dest: "By The Sea PIK", missions: [{ id: M.byTheSeaQr.id }] },
      { dest: "East Coast PIK", missions: [{ id: M.eastCoastPhoto.id }] },
      { dest: "Batavia PIK", missions: [{ id: M.bataviaPhoto.id }] },
      { dest: "Land's End PIK2", missions: [{ id: M.landsEndCode.id }] },
    ],
  });
  const questD = await quest({
    slug: "golf-island-culinary-trail", name: "Golf Island Culinary Trail", tagline: "Eat your way around Golf Island.",
    description: "From heritage flavours at Pantjoran to seaside dining at Cove, Central Market's eco-hub, East Coast's alfresco patios and By The Sea.",
    cover: img("East Coast PIK")!, type: "REGULAR", difficulty: "EASY", duration: 150, rule: "OPEN", completionXp: 200, sortOrder: 4,
    checkpoints: [
      { dest: "Pantjoran PIK", missions: [{ id: M.pantjoranQr.id }] },
      { dest: "Cove at Batavia PIK", missions: [{ id: M.covePhoto.id }] },
      { dest: "Central Market PIK", missions: [{ id: M.centralMarketQuiz.id }] },
      { dest: "East Coast PIK", missions: [{ id: M.eastCoastPhoto.id }] },
      { dest: "By The Sea PIK", missions: [{ id: M.byTheSeaQr.id }] },
    ],
  });
  const questE = await quest({
    slug: "riverwalk-sunset-trail", name: "Riverwalk Sunset Trail", tagline: "Culture, harmony and golden hour.",
    description: "A short walk on Riverwalk Island: Si Mian Fo, Tian Fu Gong, Masjid Al-Ikhlas and sunset at Sunset Pier.",
    cover: img("Sunset Pier PIK")!, type: "REGULAR", difficulty: "EASY", duration: 90, completionXp: 150, sortOrder: 5,
    checkpoints: [
      { dest: "Si Mian Fo PIK", missions: [{ id: M.simianfoQuiz.id }] },
      { dest: "Tian Fu Gong (天福宫) PIK", missions: [{ id: M.tianfugongGps.id }] },
      { dest: "Masjid Al-Ikhlas PIK", missions: [{ id: M.alikhlasGps.id }] },
      { dest: "Sunset Pier PIK", missions: [{ id: M.sunsetPierGps.id }, { id: M.sunsetPierPhoto.id, mandatory: false }] },
    ],
  });
  const questF = await quest({
    slug: "paw-proved-trail", name: "Paw Proved Trail", tagline: "Pet-friendly PIK, coming December.",
    description: "Bring your best friend to PIK's Paw Proved venues: East Coast, By The Sea, Orange Groves and Land's End.",
    cover: img("Orange Groves PIK2")!, type: "SPECIAL", difficulty: "EASY", duration: 240, rule: "OPEN", completionXp: 250,
    startsAt: new Date("2026-12-05T00:00:00+07:00"), endsAt: new Date("2027-01-31T23:59:59+07:00"), sortOrder: 6,
    checkpoints: [
      { dest: "East Coast PIK", missions: [{ id: M.petPhotoEastCoast.id }] },
      { dest: "By The Sea PIK", missions: [{ id: M.byTheSeaQr.id }] },
      { dest: "Orange Groves PIK2", missions: [{ id: M.orangeGrovesGps.id }] },
      { dest: "Land's End PIK2", missions: [{ id: M.landsEndPhoto.id }] },
    ],
  });
  await quest({
    slug: "pik-transit-explorer", name: "PIK Transit Explorer (Draft)", tagline: "Ride, scan, discover.",
    description: "Draft quest built around PIK shuttles and the Dermaga CBD sea connection.", cover: img("PIK Avenue")!, type: "REGULAR", difficulty: "MEDIUM", duration: 200, status: "DRAFT", completionXp: 200, sortOrder: 9,
    checkpoints: [
      { dest: "PIK Avenue", missions: [{ id: M.shuttleCode.id }] },
      { dest: "Dermaga CBD Beachwalk PIK2", missions: [{ id: M.dermagaGpsQuiz.id }] },
    ],
  });

  // ── QR codes: one per checkpoint destination for QR missions ───────
  const qrDestNames = ["Pantjoran PIK", "Batavia PIK", "Aloha Pasir Putih PIK2", "Land's End PIK2", "Dermaga CBD Beachwalk PIK2", "Little Siam PIK2", "By The Sea PIK", "Sunset Pier PIK", "East Coast PIK", "Central Market PIK", "Cove at Batavia PIK"];
  const qrByDest: Record<string, string> = {};
  for (const n of qrDestNames) {
    const rec = await prisma.qrCode.create({ data: { token: token(18), label: `${n} – checkpoint QR`, kind: "CHECKPOINT", destinationId: D(n).id } });
    qrByDest[n] = rec.token;
  }

  // ── Badges ─────────────────────────────────────────────────────────
  const badgeDefs = [
    // destination
    { slug: "pantjoran-explorer", name: "Pantjoran Explorer", category: "DESTINATION", rarity: "COMMON", icon: "🏮", color: "#dc2626", description: "Completed a mission at Pantjoran PIK.", criteria: { type: "DESTINATION_VISIT", destinationName: "Pantjoran PIK" } },
    { slug: "batavia-discoverer", name: "Batavia Discoverer", category: "DESTINATION", rarity: "COMMON", icon: "⛵", color: "#b45309", description: "Completed a mission at Batavia PIK.", criteria: { type: "DESTINATION_VISIT", destinationName: "Batavia PIK" } },
    { slug: "aloha-explorer", name: "Aloha Explorer", category: "DESTINATION", rarity: "COMMON", icon: "🌴", color: "#059669", description: "Completed a mission at Aloha Pasir Putih PIK2.", criteria: { type: "DESTINATION_VISIT", destinationName: "Aloha Pasir Putih PIK2" } },
    { slug: "lands-end-explorer", name: "Land's End Explorer", category: "DESTINATION", rarity: "COMMON", icon: "🗼", color: "#0284c7", description: "Completed a mission at Land's End PIK2.", criteria: { type: "DESTINATION_VISIT", destinationName: "Land's End PIK2" } },
    { slug: "dermaga-cbd-explorer", name: "Dermaga CBD Explorer", category: "DESTINATION", rarity: "COMMON", icon: "⚓", color: "#1d4ed8", description: "Completed a mission at Dermaga CBD Beachwalk PIK2.", criteria: { type: "DESTINATION_VISIT", destinationName: "Dermaga CBD Beachwalk PIK2" } },
    { slug: "little-siam-discoverer", name: "Little Siam Discoverer", category: "DESTINATION", rarity: "RARE", icon: "🛕", color: "#d97706", description: "Completed a mission at Little Siam PIK2.", criteria: { type: "DESTINATION_VISIT", destinationName: "Little Siam PIK2" } },
    { slug: "sunset-pier-regular", name: "Sunset Pier Regular", category: "DESTINATION", rarity: "COMMON", icon: "🌇", color: "#f97316", description: "Completed a mission at Sunset Pier PIK.", criteria: { type: "DESTINATION_VISIT", destinationName: "Sunset Pier PIK" } },
    // area
    { slug: "pik1-explorer", name: "PIK1 Explorer", category: "AREA", rarity: "RARE", icon: "🏙️", color: "#087088", description: "Completed missions at 2 different PIK1 destinations.", criteria: { type: "AREA_VISITS", areaSlug: "pik1", count: 2 } },
    { slug: "golf-island-explorer", name: "Golf Island Explorer", category: "AREA", rarity: "RARE", icon: "⛳", color: "#f8b818", description: "Completed missions at 3 different Golf Island destinations.", criteria: { type: "AREA_VISITS", areaSlug: "golf-island", count: 3 } },
    { slug: "riverwalk-island-explorer", name: "Riverwalk Island Explorer", category: "AREA", rarity: "RARE", icon: "🌉", color: "#8b5cf6", description: "Completed missions at 3 different Riverwalk Island destinations.", criteria: { type: "AREA_VISITS", areaSlug: "riverwalk-island", count: 3 } },
    { slug: "pik2-explorer", name: "PIK2 Explorer", category: "AREA", rarity: "EPIC", icon: "🌊", color: "#40c0c8", description: "Completed missions at 4 different PIK2 destinations.", criteria: { type: "AREA_VISITS", areaSlug: "pik2", count: 4 } },
    // transport
    { slug: "pik-shuttle-explorer", name: "PIK Shuttle Explorer", category: "TRANSPORT", rarity: "RARE", icon: "🚌", color: "#700055", description: "Rode a Royal Trans / TREX shuttle and completed the on-board code mission.", criteria: { type: "MISSION_APPROVED", missionName: "Ride the PIK Shuttle" } },
    { slug: "thousand-islands-voyager", name: "Thousand Islands Voyager", category: "TRANSPORT", rarity: "EPIC", icon: "🛥️", color: "#0ea5e9", description: "Completed the Dermaga CBD pier mission – gateway to Kepulauan Seribu.", criteria: { type: "MISSION_APPROVED", missionName: "Pier Walk" } },
    // event
    { slug: "pawfall-season-2026", name: "Pawfall Season 2026", category: "EVENT", rarity: "EPIC", icon: "🐾", color: "#f59e0b", description: "Checked in at East Coast during Pawfall Season, 13–22 Nov 2026.", criteria: { type: "MISSION_APPROVED", missionName: "Pawfall Season Check-in" }, eventTitle: "Pawfall Season" },
    // experience
    { slug: "culinary-explorer", name: "Culinary Explorer", category: "EXPERIENCE", rarity: "RARE", icon: "🍜", color: "#e11d48", description: "Completed missions at 3 culinary destinations.", criteria: { type: "CATEGORY_VISITS", category: "Culinary", count: 3 } },
    { slug: "pet-friendly-explorer", name: "Pet-Friendly Explorer", category: "EXPERIENCE", rarity: "RARE", icon: "🐶", color: "#f59e0b", description: "Completed missions at 3 Paw Proved venues.", criteria: { type: "TAG_VISITS", tag: "pet-friendly", count: 3 } },
    { slug: "weekend-explorer", name: "Weekend Explorer", category: "EXPERIENCE", rarity: "COMMON", icon: "🎉", color: "#8b5cf6", description: "Completed 3 missions on a Saturday or Sunday.", criteria: { type: "WEEKEND_MISSIONS", count: 3 } },
    { slug: "sunset-chaser", name: "Sunset Chaser", category: "EXPERIENCE", rarity: "EPIC", icon: "🌅", color: "#f97316", description: "Completed 3 missions between 4 PM and 7 PM at waterfront destinations.", criteria: { type: "SUNSET_MISSIONS", count: 3 } },
    { slug: "family-explorer", name: "Family Explorer", category: "EXPERIENCE", rarity: "RARE", icon: "👨‍👩‍👧", color: "#10b981", description: "Completed missions at 3 family-friendly destinations.", criteria: { type: "TAG_VISITS", tag: "family", count: 3 } },
    { slug: "first-steps", name: "First Steps", category: "EXPERIENCE", rarity: "COMMON", icon: "👣", color: "#64748b", description: "Completed your very first mission.", criteria: { type: "MISSION_COUNT", count: 1 } },
    { slug: "mission-master", name: "Mission Master", category: "EXPERIENCE", rarity: "EPIC", icon: "🎯", color: "#0f766e", description: "Completed 25 missions.", criteria: { type: "MISSION_COUNT", count: 25 } },
    // quest completions
    { slug: "quest-pik-discovery", name: "PIK Discovery Finisher", category: "QUEST", rarity: "EPIC", icon: "🏆", color: "#f8b818", description: "Completed the PIK Discovery Quest.", criteria: { type: "QUEST_COMPLETE", questSlug: "pik-discovery-quest" } },
    { slug: "quest-pik2-explorer", name: "PIK2 Explorer Finisher", category: "QUEST", rarity: "EPIC", icon: "🏅", color: "#40c0c8", description: "Completed the PIK2 Explorer quest.", criteria: { type: "QUEST_COMPLETE", questSlug: "pik2-explorer" } },
    { slug: "quest-weekend", name: "Weekend Quest Finisher", category: "QUEST", rarity: "RARE", icon: "🎖️", color: "#8b5cf6", description: "Completed the PIK Weekend Quest.", criteria: { type: "QUEST_COMPLETE", questSlug: "pik-weekend-quest" } },
    { slug: "quest-culinary", name: "Culinary Trail Finisher", category: "QUEST", rarity: "RARE", icon: "🥢", color: "#e11d48", description: "Completed the Golf Island Culinary Trail.", criteria: { type: "QUEST_COMPLETE", questSlug: "golf-island-culinary-trail" } },
    { slug: "quest-riverwalk", name: "Riverwalk Trail Finisher", category: "QUEST", rarity: "RARE", icon: "🕌", color: "#8b5cf6", description: "Completed the Riverwalk Sunset Trail.", criteria: { type: "QUEST_COMPLETE", questSlug: "riverwalk-sunset-trail" } },
    { slug: "pik-legend", name: "PIK Legend", category: "LEVEL", rarity: "LEGENDARY", icon: "👑", color: "#e11d48", description: "Reached the PIK LEGEND level.", criteria: { type: "LEVEL", order: 5 } },
  ];
  const badgeBySlug: Record<string, { id: string }> = {};
  for (const [i, b] of badgeDefs.entries()) {
    const c = b.criteria as Record<string, unknown>;
    const relatedDestinationId = c.destinationName ? D(c.destinationName as string).id : undefined;
    const relatedQuestId = c.questSlug ? (await prisma.quest.findUnique({ where: { slug: c.questSlug as string } }))?.id : undefined;
    const relatedEventId = (b as { eventTitle?: string }).eventTitle ? eventIdByTitle[(b as { eventTitle?: string }).eventTitle!] : undefined;
    badgeBySlug[b.slug] = await prisma.badge.create({
      data: { slug: b.slug, name: b.name, description: b.description, category: b.category, rarity: b.rarity, icon: b.icon, color: b.color, criteria: JSON.stringify({ ...c, destinationId: relatedDestinationId, questId: relatedQuestId }), xpBonus: b.rarity === "LEGENDARY" ? 200 : b.rarity === "EPIC" ? 100 : b.rarity === "RARE" ? 50 : 25, sortOrder: i, relatedDestinationId, relatedQuestId, relatedEventId },
    });
  }

  // ── Rewards ────────────────────────────────────────────────────────
  // Tourist Exclusive partner benefits (official tenants list, Jan–Jun 2026 validity as shown on piktourism.com/tourist-exclusive)
  for (const t of tenantsData) {
    for (const b of t.benefits) {
      await prisma.reward.create({
        data: {
          name: b.title, partnerId: partners[t.name].id, partnerName: t.name, description: b.subtitle, imageUrl: b.photo || t.photo, type: "PARTNER",
          terms: `${b.description}. Show your QR code to the tenant. Valid January–June 2026. Terms per piktourism.com/tourist-exclusive.`,
          instructions: "Open the reward, show the QR code or voucher code to the tenant staff before paying.", voucherPrefix: "TE", validDays: 60, expiresAt: new Date("2026-06-30T23:59:59+07:00"),
          issuance: "TOURIST_EXCLUSIVE", pointsCost: 150, isSample: false,
        },
      });
    }
  }
  // Sample quest-completion & point rewards (replace in admin)
  const rewardDiscovery = await prisma.reward.create({ data: { name: "PIK Discovery Finisher Voucher", partnerName: "PIK Tourism Board", description: "Sample reward: IDR 50.000 dining voucher at participating Golf Island tenants.", imageUrl: img("Cove at Batavia PIK"), type: "DINING", terms: "SAMPLE reward for demo purposes. Replace with a real partner offer in the admin dashboard.", instructions: "Show the QR code to the cashier.", voucherPrefix: "PIKDQ", validDays: 30, issuance: "QUEST_COMPLETION", questId: questA.id, isSample: true } });
  await prisma.reward.create({ data: { name: "PIK2 Explorer Merch Pack", partnerName: "PIK Tourism Board", description: "Sample reward: exclusive PIK City Quest tote bag and sticker set.", imageUrl: img("Dragon Point PIK2"), type: "MERCHANDISE", terms: "SAMPLE reward. Collect at the PIK Visitor Center.", instructions: "Show the QR code at the Visitor Center.", voucherPrefix: "PIKMERCH", validDays: 60, issuance: "QUEST_COMPLETION", questId: questB.id, isSample: true } });
  await prisma.reward.create({ data: { name: "Weekend Quest Coffee Treat", partnerName: "PIK Tourism Board", description: "Sample reward: one complimentary coffee at a participating Riverwalk café.", imageUrl: img("Sunset Pier PIK"), type: "DINING", terms: "SAMPLE reward.", instructions: "Show the QR code to staff.", voucherPrefix: "PIKWKND", validDays: 14, issuance: "QUEST_COMPLETION", questId: questC.id, isSample: true } });
  await prisma.reward.create({ data: { name: "Culinary Trail 10% Off", partnerName: "PIK Tourism Board", description: "Sample reward: 10% off at a participating Culinary Trail tenant.", imageUrl: img("East Coast PIK"), type: "DISCOUNT", terms: "SAMPLE reward.", instructions: "Show the QR code before ordering.", voucherPrefix: "PIKCUL", validDays: 30, issuance: "QUEST_COMPLETION", questId: questD.id, isSample: true } });
  await prisma.reward.create({ data: { name: "Riverwalk Sunset Postcard Set", partnerName: "PIK Tourism Board", description: "Sample reward: limited edition PIK postcard set.", imageUrl: img("Si Mian Fo PIK"), type: "MERCHANDISE", terms: "SAMPLE reward.", instructions: "Collect at the PIK Visitor Center.", voucherPrefix: "PIKRW", validDays: 60, issuance: "QUEST_COMPLETION", questId: questE.id, isSample: true } });
  await prisma.reward.create({ data: { name: "Paw Proved Goodie Bag", partnerName: "PIK Tourism Board", description: "Sample reward: treats for your pet from Paw Proved partners.", imageUrl: img("Orange Groves PIK2"), type: "PARTNER", terms: "SAMPLE reward.", instructions: "Collect at any Paw Proved venue.", voucherPrefix: "PIKPAW", validDays: 30, issuance: "QUEST_COMPLETION", questId: questF.id, isSample: true } });
  await prisma.reward.create({ data: { name: "Golf Island Explorer Sticker", partnerName: "PIK Tourism Board", description: "Sample digital collectible unlocked with the Golf Island Explorer badge.", imageUrl: img("Central Market PIK"), type: "DIGITAL", terms: "SAMPLE digital collectible.", instructions: "Saved to your rewards wallet automatically.", voucherPrefix: "PIKGI", validDays: 365, issuance: "BADGE", badgeId: badgeBySlug["golf-island-explorer"].id, isSample: true } });
  await prisma.reward.create({ data: { name: "Mangrove Boat Ride – 500 pts", partnerName: "PIK Tourism Board", description: "Sample point reward: redeem 500 points for a TWA Angke Kapuk boat ride voucher.", imageUrl: img("Taman Wisata Alam (TWA) Angke Kapuk"), type: "TICKET", terms: "SAMPLE reward. Subject to availability.", instructions: "Show the QR code at the TWA ticket counter.", voucherPrefix: "PIKTWA", validDays: 30, issuance: "POINTS", pointsCost: 500, totalLimit: 100, isSample: true } });

  // ── Challenges ─────────────────────────────────────────────────────
  await prisma.challenge.createMany({
    data: [
      { title: "Complete a mission at Pantjoran PIK", description: "Any approved mission at Pantjoran PIK today counts.", cadence: "DAILY", destinationId: D("Pantjoran PIK").id, difficulty: "EASY", xp: 30 },
      { title: "Discover a new destination at Golf Island", description: "Complete your first mission at any Golf Island destination today.", cadence: "DAILY", difficulty: "EASY", xp: 30 },
      { title: "Scan a QR code at Aloha", description: "Scan the quest QR code at Aloha Pasir Putih PIK2.", cadence: "DAILY", missionId: M.alohaQr.id, destinationId: D("Aloha Pasir Putih PIK2").id, difficulty: "EASY", xp: 30 },
      { title: "Weekend challenge: 3 waterfront check-ins", description: "Complete three GPS check-ins at waterfront destinations this week.", cadence: "WEEKLY", difficulty: "MEDIUM", xp: 80 },
      { title: "Pawfall Season check-in", description: "Limited-time: check in at East Coast during Pawfall Season.", cadence: "LIMITED", missionId: M.pawfallEvent.id, destinationId: D("East Coast PIK").id, difficulty: "EASY", xp: 80, startsAt: new Date("2026-11-13"), endsAt: new Date("2026-11-22T23:59:59"), mysteryReward: true },
      { title: "Bonus: Ride the PIK shuttle", description: "Earn bonus XP by completing the shuttle code mission.", cadence: "BONUS", missionId: M.shuttleCode.id, difficulty: "MEDIUM", xp: 60 },
    ],
  });

  // ── Demo players ───────────────────────────────────────────────────
  const michelle = await prisma.user.create({ data: { email: "michelle@example.com", passwordHash: await bcrypt.hash("Explorer123!", 10), name: "Michelle", username: "michelle_explores", instagram: "michelle.explores", role: "VISITOR", emailVerifiedAt: new Date(), avatarUrl: null } });
  const rafi = await prisma.user.create({ data: { email: "rafi@example.com", passwordHash: await bcrypt.hash("Explorer123!", 10), name: "Rafi Pratama", username: "rafi_pik", role: "VISITOR", emailVerifiedAt: new Date() } });
  const sinta = await prisma.user.create({ data: { email: "sinta@example.com", passwordHash: await bcrypt.hash("Explorer123!", 10), name: "Sinta Dewi", username: "sinta.sunset", role: "VISITOR", emailVerifiedAt: new Date() } });
  const kevin = await prisma.user.create({ data: { email: "kevin@example.com", passwordHash: await bcrypt.hash("Explorer123!", 10), name: "Kevin Tanoto", username: "kevin_t", role: "VISITOR", emailVerifiedAt: new Date() } });

  async function addXp(userId: string, amount: number, kind: string, refType: string, refId: string, description: string, createdAt?: Date) {
    // Same idempotency rule as the live engine: the (user, kind, refType, refId) key prevents duplicate awards.
    const exists = await prisma.xpTransaction.findUnique({ where: { userId_kind_refType_refId: { userId, kind, refType, refId } } });
    if (exists) return;
    await prisma.xpTransaction.create({ data: { userId, amount, kind, refType, refId, description, createdAt } });
    await prisma.user.update({ where: { id: userId }, data: { xpTotal: { increment: amount }, pointsBalance: { increment: amount } } });
  }
  const daysAgo = (n: number, h = 15) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d; };

  // Michelle: active PIK Discovery Quest, checkpoint 1 done, checkpoint 2 available, one photo pending review
  const runA = await prisma.questRun.create({ data: { userId: michelle.id, questId: questA.id, status: "ACTIVE", startedAt: daysAgo(1, 10) } });
  const cps = questA.checkpoints;
  for (const [i, cp] of cps.entries()) {
    await prisma.checkpointProgress.create({ data: { questRunId: runA.id, checkpointId: cp.id, status: i === 0 ? "COMPLETED" : i === 1 ? "AVAILABLE" : "LOCKED", unlockedAt: i <= 1 ? daysAgo(1, 10) : null, completedAt: i === 0 ? daysAgo(1, 12) : null, stampIssuedAt: i === 0 ? daysAgo(1, 12) : null } });
  }
  const subQr = await prisma.missionSubmission.create({ data: { userId: michelle.id, questRunId: runA.id, checkpointId: cps[0].id, missionId: M.pantjoranQr.id, status: "APPROVED", attempts: 1, startedAt: daysAgo(1, 11), submittedAt: daysAgo(1, 11), reviewedAt: daysAgo(1, 11), xpAwarded: 50, xpAwardedAt: daysAgo(1, 11), lat: -6.0885, lng: 106.7429, accuracyM: 12 } });
  const reqQr = await prisma.missionRequirement.findFirst({ where: { missionId: M.pantjoranQr.id } });
  await prisma.requirementSubmission.create({ data: { submissionId: subQr.id, requirementId: reqQr!.id, status: "APPROVED", attempts: 1, payload: JSON.stringify({ qrToken: qrByDest["Pantjoran PIK"] }), verifiedAt: daysAgo(1, 11) } });
  const subPhoto = await prisma.missionSubmission.create({ data: { userId: michelle.id, questRunId: runA.id, checkpointId: cps[0].id, missionId: M.pantjoranPhoto.id, status: "APPROVED", attempts: 1, startedAt: daysAgo(1, 11), submittedAt: daysAgo(1, 12), reviewedAt: daysAgo(1, 12), reviewedById: verifier.id, xpAwarded: 75, xpAwardedAt: daysAgo(1, 12) } });
  const reqPhoto = await prisma.missionRequirement.findFirst({ where: { missionId: M.pantjoranPhoto.id } });
  await prisma.requirementSubmission.create({ data: { submissionId: subPhoto.id, requirementId: reqPhoto!.id, status: "APPROVED", attempts: 1, payload: JSON.stringify({ note: "seeded sample" }), mediaUrl: img("Pantjoran PIK"), verifiedAt: daysAgo(1, 12) } });
  await addXp(michelle.id, 50, "MISSION", "MissionSubmission", subQr.id, "Welcome to Pantjoran – mission approved", daysAgo(1, 11));
  await addXp(michelle.id, 75, "MISSION", "MissionSubmission", subPhoto.id, "Pagoda Portrait – mission approved", daysAgo(1, 12));
  await addXp(michelle.id, 25, "CHECKPOINT", "CheckpointProgress", `${runA.id}:${cps[0].id}`, "Checkpoint completed: Pantjoran PIK", daysAgo(1, 12));
  await addXp(michelle.id, 20, "NEW_DESTINATION", "Destination", D("Pantjoran PIK").id, "New destination discovered: Pantjoran PIK", daysAgo(1, 12));
  await prisma.userBadge.create({ data: { userId: michelle.id, badgeId: badgeBySlug["pantjoran-explorer"].id, earnedAt: daysAgo(1, 12) } });
  await addXp(michelle.id, 25, "BADGE", "Badge", badgeBySlug["pantjoran-explorer"].id, "Badge earned: Pantjoran Explorer", daysAgo(1, 12));
  await prisma.userBadge.create({ data: { userId: michelle.id, badgeId: badgeBySlug["first-steps"].id, earnedAt: daysAgo(1, 11) } });
  await addXp(michelle.id, 25, "BADGE", "Badge", badgeBySlug["first-steps"].id, "Badge earned: First Steps", daysAgo(1, 11));
  // Batavia multi-step in progress: GPS done, QR pending
  const subBat = await prisma.missionSubmission.create({ data: { userId: michelle.id, questRunId: runA.id, checkpointId: cps[1].id, missionId: M.bataviaMulti.id, status: "IN_PROGRESS", attempts: 0, startedAt: daysAgo(0, 9), lat: -6.0935, lng: 106.7396, accuracyM: 20 } });
  const batReqs = await prisma.missionRequirement.findMany({ where: { missionId: M.bataviaMulti.id }, orderBy: { order: "asc" } });
  await prisma.requirementSubmission.create({ data: { submissionId: subBat.id, requirementId: batReqs[0].id, status: "APPROVED", attempts: 1, payload: JSON.stringify({ lat: -6.0935, lng: 106.7396, distanceM: 18 }), verifiedAt: daysAgo(0, 9) } });
  await prisma.checkpointProgress.update({ where: { questRunId_checkpointId: { questRunId: runA.id, checkpointId: cps[1].id } }, data: { status: "IN_PROGRESS" } });
  // Batavia photo submitted – waiting for review (shows in verification queue)
  const subBatPhoto = await prisma.missionSubmission.create({ data: { userId: michelle.id, questRunId: runA.id, checkpointId: cps[1].id, missionId: M.bataviaPhoto.id, status: "SUBMITTED", attempts: 1, startedAt: daysAgo(0, 9), submittedAt: daysAgo(0, 9), lat: -6.0935, lng: 106.7396 } });
  const reqBatPhoto = await prisma.missionRequirement.findFirst({ where: { missionId: M.bataviaPhoto.id } });
  await prisma.requirementSubmission.create({ data: { submissionId: subBatPhoto.id, requirementId: reqBatPhoto!.id, status: "SUBMITTED", attempts: 1, payload: JSON.stringify({ note: "seeded sample – photo from piktourism.com" }), mediaUrl: img("Batavia PIK") } });
  await prisma.user.update({ where: { id: michelle.id }, data: { streakDays: 2, lastActiveDate: new Date().toISOString().slice(0, 10) } });
  await prisma.notification.createMany({
    data: [
      { userId: michelle.id, type: "MISSION_COMPLETED", title: "MISSION COMPLETED!", body: "Nice work! You've collected the Pantjoran stamp.", link: "/quests/pik-discovery-quest", createdAt: daysAgo(1, 12) },
      { userId: michelle.id, type: "BADGE", title: "NEW BADGE UNLOCKED!", body: "Congratulations! You've earned the Pantjoran Explorer badge.", link: "/profile#badges", createdAt: daysAgo(1, 12) },
      { userId: michelle.id, type: "MISSION_UNLOCKED", title: "MISSION UNLOCKED!", body: "Your next challenge at Batavia PIK is ready.", link: "/quests/pik-discovery-quest", createdAt: daysAgo(1, 12) },
      { userId: michelle.id, type: "SPECIAL_QUEST", title: "SPECIAL QUEST AVAILABLE!", body: "PIK Weekend Quest is live until 31 December. Complete 4 of 6 waterfront checkpoints.", link: "/quests/pik-weekend-quest", createdAt: daysAgo(0, 8), isRead: false },
    ],
  });

  // Rafi & Sinta & Kevin: completed quests for the leaderboard
  async function completeQuestFor(userId: string, q: typeof questA, start: Date, hoursTotal: number, missionXp: number) {
    const end = new Date(start.getTime() + hoursTotal * 3600 * 1000);
    const run = await prisma.questRun.create({ data: { userId, questId: q.id, status: "COMPLETED", startedAt: start, completedAt: end, completionCode: `PIKQ-${code(6)}` } });
    let total = 0;
    for (const [i, cp] of q.checkpoints.entries()) {
      const t = new Date(start.getTime() + ((i + 1) * hoursTotal * 3600 * 1000) / (q.checkpoints.length + 1));
      await prisma.checkpointProgress.create({ data: { questRunId: run.id, checkpointId: cp.id, status: "COMPLETED", unlockedAt: start, completedAt: t, stampIssuedAt: t } });
      for (const cm of cp.missions.filter((x) => x.isMandatory)) {
        const sub = await prisma.missionSubmission.create({ data: { userId, questRunId: run.id, checkpointId: cp.id, missionId: cm.missionId, status: "APPROVED", attempts: 1, startedAt: t, submittedAt: t, reviewedAt: t, xpAwarded: missionXp, xpAwardedAt: t } });
        await addXp(userId, missionXp, "MISSION", "MissionSubmission", sub.id, "Mission approved", t);
        total += missionXp;
      }
      await addXp(userId, 25, "CHECKPOINT", "CheckpointProgress", `${run.id}:${cp.id}`, "Checkpoint completed", t);
      await addXp(userId, 20, "NEW_DESTINATION", "Destination", `${userId}:${cp.destinationId}`, "New destination discovered", t);
      total += 45;
    }
    await addXp(userId, q.completionXp, "QUEST", "QuestRun", run.id, `Quest completed: ${q.name}`, end);
    total += q.completionXp;
    await prisma.questRun.update({ where: { id: run.id }, data: { xpEarned: total } });
    return run;
  }
  const rafiRun = await completeQuestFor(rafi.id, questA, daysAgo(6, 9), 5, 70);
  await completeQuestFor(rafi.id, questE, daysAgo(3, 15), 2, 60);
  await completeQuestFor(sinta.id, questA, daysAgo(10, 9), 6, 70);
  await completeQuestFor(sinta.id, questD, daysAgo(4, 11), 3, 60);
  await completeQuestFor(sinta.id, questE, daysAgo(2, 16), 2, 60);
  await completeQuestFor(kevin.id, questD, daysAgo(5, 12), 3, 60);
  for (const [uid, slugs] of [[rafi.id, ["quest-pik-discovery", "quest-riverwalk", "pantjoran-explorer", "first-steps", "golf-island-explorer"]], [sinta.id, ["quest-pik-discovery", "quest-culinary", "quest-riverwalk", "pantjoran-explorer", "first-steps", "culinary-explorer", "golf-island-explorer", "sunset-pier-regular"]], [kevin.id, ["quest-culinary", "first-steps", "pantjoran-explorer"]]] as Array<[string, string[]]>) {
    for (const s of slugs) {
      await prisma.userBadge.create({ data: { userId: uid, badgeId: badgeBySlug[s].id, earnedAt: daysAgo(2) } });
      await addXp(uid, 25, "BADGE", "Badge", badgeBySlug[s].id, `Badge earned`, daysAgo(2));
    }
  }
  // Rafi has a quest reward, one already redeemed by the partner admin
  const ur = await prisma.userReward.create({ data: { userId: rafi.id, rewardId: rewardDiscovery.id, voucherCode: `PIKDQ-${code(6)}`, qrToken: token(18), status: "REDEEMED", source: "QUEST_COMPLETION", sourceRefId: rafiRun.id, issuedAt: daysAgo(6), expiresAt: daysAgo(-24), redeemedAt: daysAgo(2) } });
  await prisma.rewardRedemption.create({ data: { userRewardId: ur.id, redeemedById: partnerAdmin.id, partnerId: partners["Express Fun"].id, location: "Batavia PIK", createdAt: daysAgo(2) } });
  await prisma.userReward.create({ data: { userId: michelle.id, rewardId: (await prisma.reward.findFirst({ where: { issuance: "TOURIST_EXCLUSIVE" } }))!.id, voucherCode: `TE-${code(6)}`, qrToken: token(18), status: "AVAILABLE", source: "CAMPAIGN", sourceRefId: "welcome-2026", issuedAt: daysAgo(1), expiresAt: new Date("2026-06-30T23:59:59+07:00") } });

  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: "SEED", entity: "System", meta: JSON.stringify({ note: "Database seeded with piktourism.com data and sample quests" }) },
      { actorId: verifier.id, action: "APPROVE_SUBMISSION", entity: "MissionSubmission", entityId: subPhoto.id, meta: JSON.stringify({ mission: "Pagoda Portrait" }), createdAt: daysAgo(1, 12) },
    ],
  });

  console.log("Seed complete.");
  console.log("Admin:    admin@piktourism.local / Admin123!");
  console.log("Quests:   quests@piktourism.local / Quest123!");
  console.log("Verifier: verify@piktourism.local / Verify123!");
  console.log("Partner:  partner@expressfun.local / Partner123!");
  console.log("Visitor:  michelle@example.com / Explorer123!");
  console.log("QR tokens:", qrByDest);
  void questManager;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
