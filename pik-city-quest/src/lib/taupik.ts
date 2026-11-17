// TauPIK assistant backend.
// LIVE mode: Claude (Anthropic SDK) with a cached PIK knowledge context built from the database.
// DEMO mode (no ANTHROPIC_API_KEY): deterministic retrieval over the same database – clearly labelled, never fakes AI.
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import { haversineMeters, formatDistance, parseJson } from "./utils";
import { currentMissionFor, getActiveRuns } from "./queries";

export type TauCard = { slug: string; name: string; area: string; category: string; description: string; image: string | null; websiteUrl: string | null; lat: number; lng: number; openingHours: string | null };
export type TauReply = { reply: string; cards: TauCard[]; mode: "live" | "demo"; mapFocus?: { lat: number; lng: number; label: string } | null; links?: Array<{ label: string; href: string }> };

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const taupikMode = (): "live" | "demo" => (client ? "live" : "demo");

async function knowledge() {
  const [dests, routes, events, tenants, areas] = await Promise.all([
    prisma.destination.findMany({ where: { isActive: true }, include: { area: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.transportRoute.findMany({ where: { isActive: true }, include: { stops: { orderBy: { order: "asc" } } } }),
    prisma.event.findMany({ where: { isActive: true, endDate: { gte: new Date(Date.now() - 86400000) } }, orderBy: { startDate: "asc" }, take: 30 }),
    prisma.partner.findMany({ include: { rewards: { where: { isActive: true, issuance: "TOURIST_EXCLUSIVE" } } } }),
    prisma.area.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return { dests, routes, events, tenants, areas };
}

function toCard(d: { slug: string; name: string; area: { name: string }; category: string; description: string; coverImage: string | null; websiteUrl: string | null; lat: number; lng: number; openingHours: string | null }): TauCard {
  return { slug: d.slug, name: d.name, area: d.area.name, category: d.category, description: d.description, image: d.coverImage, websiteUrl: d.websiteUrl, lat: d.lat, lng: d.lng, openingHours: d.openingHours };
}

async function questContext(userId: string) {
  const runs = await getActiveRuns(userId);
  if (!runs.length) return null;
  const run = runs[0];
  const cur = currentMissionFor(run);
  return {
    questName: run.quest.name, questSlug: run.quest.slug, completed: cur.completed, total: run.quest.checkpoints.length,
    current: cur.checkpoint ? { destination: cur.checkpoint.destination, mission: cur.mission ? { name: cur.mission.name, type: cur.mission.type, instructions: cur.mission.instructions, xp: cur.mission.xp } : null } : null,
    remaining: run.quest.checkpoints.filter((cp) => run.checkpoints.find((p) => p.checkpointId === cp.id)?.status !== "COMPLETED").map((cp) => cp.destination.name),
  };
}

// ───────────── LIVE: Claude ─────────────
async function liveAnswer(userId: string, message: string, history: Array<{ role: "user" | "assistant"; content: string }>): Promise<TauReply> {
  const k = await knowledge();
  const qc = await questContext(userId);
  const kb = [
    "DESTINATIONS (name | slug | area | category | tags | hours | one-line description):",
    ...k.dests.map((d) => `${d.name} | ${d.slug} | ${d.area.name} | ${d.category} | ${parseJson<string[]>(d.tags, []).join(",")} | ${d.openingHours ?? "n/a"} | ${d.description}`),
    "", "TRANSPORT ROUTES (operator code: route – stops):",
    ...k.routes.map((r) => `${r.operator} ${r.code}: ${r.name} – ${r.stops.map((s) => s.name).join(" → ")}`),
    "", "UPCOMING EVENTS (title | dates | location | category):",
    ...k.events.map((e) => `${e.title} | ${e.startDate.toISOString().slice(0, 10)} to ${e.endDate.toISOString().slice(0, 10)} ${e.startTime ?? ""} | ${e.location ?? ""} | ${e.category}`),
    "", "TOURIST EXCLUSIVE PARTNERS: " + k.tenants.map((t) => `${t.name} (${t.rewards.map((r) => r.name).join("; ")})`).join(" · "),
  ].join("\n");
  const system = [
    { type: "text" as const, text: `You are TauPIK, the official AI tourism concierge for Pantai Indah Kapuk (PIK), Jakarta, inside the PIK CITY QUEST web app by PIK Tourism Board. Be warm, concise (under 160 words unless an itinerary is requested), practical and honest. Answer ONLY from the knowledge base below plus general common sense about Jakarta; if something is not in the knowledge base (e.g. whether a specific restaurant is halal), say you are not certain and point to https://piktourism.com. Never invent venues, prices or schedules. For directions, suggest the relevant shuttle/bus routes from the knowledge base and mention that the app can open Google Maps. Times are WIB. When you recommend specific destinations, end your message with a final line exactly in the form:\nCARDS: slug-one, slug-two\n(using slugs from the knowledge base, max 4). If no destination cards are relevant, omit the CARDS line.\n\nKNOWLEDGE BASE\n${kb}`, cache_control: { type: "ephemeral" as const } },
    { type: "text" as const, text: qc ? `USER CONTEXT: The visitor is currently on the quest "${qc.questName}" (${qc.completed}/${qc.total} checkpoints done). ${qc.current ? `Current checkpoint: ${qc.current.destination.name} (${qc.current.destination.area.name}, lat ${qc.current.destination.lat}, lng ${qc.current.destination.lng}). Current mission: ${qc.current.mission ? `${qc.current.mission.name} – ${qc.current.mission.instructions} (+${qc.current.mission.xp} XP)` : "checkpoint done"}.` : ""} Remaining checkpoints: ${qc.remaining.join(", ") || "none"}.` : "USER CONTEXT: no active quest." },
  ];
  const res = await client!.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1200,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system,
    messages: [...history.slice(-12), { role: "user", content: message }],
  });
  if (res.stop_reason === "refusal") return { reply: "I can't help with that one, but I'm happy to help you explore PIK — ask me about destinations, food, events or how to get around.", cards: [], mode: "live" };
  const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
  const m = text.match(/\nCARDS:\s*(.+)$/i);
  const slugs = m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  const cards = slugs.map((s) => k.dests.find((d) => d.slug === s)).filter(Boolean).slice(0, 4).map((d) => toCard(d!));
  return { reply: text.replace(/\nCARDS:.*$/i, "").trim(), cards, mode: "live", mapFocus: cards[0] ? { lat: cards[0].lat, lng: cards[0].lng, label: cards[0].name } : null };
}

// ───────────── DEMO: retrieval ─────────────
function has(q: string, ...words: string[]) { return words.some((w) => q.includes(w)); }

async function demoAnswer(userId: string, message: string): Promise<TauReply> {
  const q = message.toLowerCase();
  const k = await knowledge();
  const byTag = (tag: string) => k.dests.filter((d) => parseJson<string[]>(d.tags, []).includes(tag));
  const byCat = (cat: string) => k.dests.filter((d) => parseJson<string[]>(d.categories, []).includes(cat));
  const main = k.dests.filter((d) => d.category === "Main Destinations");
  const demoNote = "";
  const links = [{ label: "piktourism.com", href: "https://piktourism.com" }];
  const qc = await questContext(userId);

  // Quest context: next checkpoint / how do I get there
  if (qc && has(q, "next checkpoint", "next mission", "where to next", "current mission", "my quest")) {
    if (!qc.current) return { reply: `You're ${qc.completed}/${qc.total} through ${qc.questName}. Head back to the quest page to see what's left: ${qc.remaining.join(", ") || "nothing — you're done!"}`, cards: [], mode: "demo", links };
    const d = qc.current.destination;
    const routes = k.routes.filter((r) => r.stops.some((s) => haversineMeters(s.lat, s.lng, d.lat, d.lng) < 600));
    return { reply: `Your next checkpoint is ${d.name} (${d.area.name}). Mission: ${qc.current.mission?.name ?? "—"} — ${qc.current.mission?.instructions ?? ""}${routes.length ? `\n\nGetting there: ${routes.map((r) => `${r.operator} ${r.code}`).join(", ")} stop nearby.` : ""} Tap the card to open the map or Google Maps directions.`, cards: [toCard(d)], mode: "demo", mapFocus: { lat: d.lat, lng: d.lng, label: d.name }, links };
  }
  // Directions "from X to Y"
  const dir = q.match(/(?:from|dari)\s+(.+?)\s+(?:to|ke)\s+(.+?)[?.]?$/) || q.match(/get to\s+(.+?)\s+from\s+(.+?)[?.]?$/);
  if (dir) {
    const find = (s: string) => k.dests.find((d) => d.name.toLowerCase().includes(s.trim())) ?? k.dests.find((d) => s.trim().split(" ").some((w) => w.length > 3 && d.name.toLowerCase().includes(w)));
    const a = find(q.includes("get to") ? dir[2] : dir[1]);
    const b = find(q.includes("get to") ? dir[1] : dir[2]);
    if (a && b) {
      const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
      const shared = k.routes.filter((r) => r.stops.some((s) => haversineMeters(s.lat, s.lng, a.lat, a.lng) < 700) && r.stops.some((s) => haversineMeters(s.lat, s.lng, b.lat, b.lng) < 700));
      return { reply: `${a.name} → ${b.name} is about ${formatDistance(dist)} apart.${shared.length ? ` Shuttle options with stops near both: ${shared.map((r) => `${r.operator} ${r.code} (${r.name})`).join("; ")}.` : " No single shuttle route connects both directly — use Google Maps directions or a ride-hailing app."} ${dist < 1500 ? "It's walkable along the waterfront if the weather's kind." : ""}`, cards: [toCard(a), toCard(b)], mode: "demo", mapFocus: { lat: b.lat, lng: b.lng, label: b.name }, links: [{ label: "Transportation guide", href: "https://piktourism.com/transportation" }, { label: "Open in Google Maps", href: `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}` }] };
    }
  }
  if (has(q, "halal")) {
    if (has(q, "non-halal", "non halal", "nonhalal", "pork")) {
      const c = byTag("culinary").slice(0, 4);
      return { reply: `PIK's culinary hubs — Pantjoran PIK (Chinese-Indonesian heritage food), Batavia PIK, Cove at Batavia and East Coast — include both halal and non-halal restaurants. Halal status varies by tenant, so please check with each venue. Explore the full list on piktourism.com's culinary page.`, cards: c.map(toCard), mode: "demo", links: [{ label: "Culinary destinations", href: "https://piktourism.com/destination" }] };
    }
    const mosques = byTag("mosque");
    const c = byTag("culinary").slice(0, 3);
    return { reply: `For halal dining, many tenants at Fresh Market PIK, Central Market PIK and Orange Groves PIK2 are halal-certified, but certification is per restaurant — I recommend confirming with the venue. Nearby mosques: ${mosques.map((m) => m.name).join(", ")}.`, cards: [...c, ...mosques.slice(0, 1)].map(toCard), mode: "demo", links: [{ label: "Culinary on piktourism.com", href: "https://piktourism.com/destination" }] };
  }
  if (has(q, "pagoda", "temple", "worship", "mosque", "church", "pray", "shrine", "vihara", "masjid", "gereja")) {
    const s = byCat("Spiritual");
    return { reply: `Places of worship and spiritual landmarks in PIK: ${s.map((d) => `${d.name} (${d.area.name})`).join(", ")}. Pantjoran PIK also has the iconic Pantjoran Pagoda and a Guan Yin altar.`, cards: s.slice(0, 4).map(toCard), mode: "demo", mapFocus: s[0] ? { lat: s[0].lat, lng: s[0].lng, label: s[0].name } : null, links };
  }
  if (has(q, "pet", "dog", "cat", "paw", "anjing")) {
    const p = byTag("pet-friendly");
    const venues = p.filter((d) => d.category === "Main Destinations" || /east coast|by the sea|orange groves|land's end|central market|pantjoran/i.test(d.name));
    return { reply: `PIK is very pet-friendly. "Paw Proved" venues on piktourism.com include ${p.length} spots. Great starting points: East Coast PIK, By The Sea PIK, Central Market PIK (with a pet park), Orange Groves PIK2 and Land's End PIK2. The Pawfall Season event runs 13–22 Nov 2026 at East Coast.`, cards: (venues.length ? venues : p).slice(0, 4).map(toCard), mode: "demo", links };
  }
  if (has(q, "family", "kids", "children", "anak")) {
    const f = [...byTag("family"), ...main.filter((d) => /aloha|batavia|kota belanda|orange groves|twa|central market/i.test(d.name))];
    const uniq = Array.from(new Map(f.map((d) => [d.id, d])).values());
    return { reply: `Family favourites: Aloha Pasir Putih (white-sand beach), Batavia PIK (boat rides, fountain show, robots & cars), Kota Belanda (pedal boats and e-bikes), Orange Groves PIK2 (playground, picnic gazebos) and TWA Angke Kapuk mangroves. Entertainment District PIK2 adds Animal.inc, Fish.inc and Kart.inc.`, cards: uniq.slice(0, 4).map(toCard), mode: "demo", links };
  }
  if (has(q, "event", "weekend", "this week", "happening", "acara")) {
    const now = new Date(); const soon = new Date(now.getTime() + 9 * 86400000);
    const ev = k.events.filter((e) => e.endDate >= now && e.startDate <= soon);
    return { reply: ev.length ? `Coming up at PIK: ${ev.slice(0, 8).map((e) => `${e.title} (${e.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${e.location ? `, ${e.location}` : ""})`).join("; ")}. Full calendar on piktourism.com/event.` : "I don't see events in the next few days in my calendar — check piktourism.com/event for the latest.", cards: [], mode: "demo", links: [{ label: "Events calendar", href: "https://piktourism.com/event" }] };
  }
  if (has(q, "transport", "bus", "shuttle", "transjakarta", "how to get to pik", "public transport", "royal trans", "trex")) {
    const here = k.routes.filter((r) => r.category === "Getting Here"); const around = k.routes.filter((r) => r.category === "Getting Around");
    return { reply: `Getting here: ${here.map((r) => `${r.operator} ${r.code} (${r.name})`).join("; ")}. Getting around PIK: ${around.map((r) => `${r.operator} ${r.code} (${r.name})`).join("; ")}. Boats to Kepulauan Seribu depart from Dermaga CBD. Open the Map tab to see routes and stops.`, cards: [], mode: "demo", links: [{ label: "Transportation guide", href: "https://piktourism.com/transportation" }] };
  }
  if (has(q, "pik2", "pik 2")) {
    const p2 = main.filter((d) => d.area.slug === "pik2");
    return { reply: `Top things in PIK2: ${p2.map((d) => d.name).join(", ")}. A classic loop: Dermaga CBD pier for the 300 m walk and sunset, Aloha's white-sand beach, Land's End lighthouse, then Kota Belanda's canal and the golden dragon at Dragon Point after dark.`, cards: p2.slice(0, 4).map(toCard), mode: "demo", mapFocus: { lat: -6.06, lng: 106.705, label: "PIK2" }, links };
  }
  if (has(q, "itinerary", "one day", "one-day", "a day", "plan")) {
    const pick = (n: string) => k.dests.find((d) => d.name === n);
    const plan = ["Pantjoran PIK", "Batavia PIK", "Sunset Pier PIK", "Aloha Pasir Putih PIK2", "Land's End PIK2", "Little Siam PIK2"].map(pick).filter(Boolean) as typeof k.dests;
    return { reply: `A one-day PIK itinerary:\n• 08:00 Breakfast & lantern-lined streets at Pantjoran PIK\n• 10:30 Batavia PIK boardwalks, boat ride, Cove at Batavia\n• 13:00 Lunch at Central Market or East Coast (pet-friendly)\n• 15:00 Beach time at Aloha Pasir Putih PIK2\n• 17:00 Golden hour at Land's End lighthouse or Sunset Pier\n• 19:30 Dinner & night lights at Little Siam PIK2 or Dragon Point\nTip: the PIK Discovery Quest follows almost exactly this route and earns you XP along the way.`, cards: plan.slice(0, 4).map(toCard), mode: "demo", links: [{ label: "Suggested itineraries", href: "https://piktourism.com/things-to-do" }] };
  }
  if (has(q, "sunset", "golden hour")) {
    const s = byTag("sunset");
    return { reply: `Best sunset spots: Sunset Pier PIK (Riverwalk Island), Dermaga CBD Beachwalk pier, Land's End lighthouse and Aloha beach. Golden hour is roughly 17:15–18:00 WIB.`, cards: s.slice(0, 4).map(toCard), mode: "demo", links };
  }
  if (has(q, "reward", "voucher", "discount", "tourist exclusive")) {
    return { reply: `Tourist Exclusive partners currently include ${k.tenants.map((t) => t.name).join(", ")} — show your QR code at the tenant for discounts and perks (valid Jan–Jun 2026). Completing quests also unlocks rewards in your profile.`, cards: [], mode: "demo", links: [{ label: "Tourist Exclusive", href: "https://piktourism.com/tourist-exclusive" }, { label: "Exchange my rewards", href: "/profile/exchange" }] };
  }
  // Destination name lookup
  const named = k.dests.filter((d) => q.includes(d.name.toLowerCase()) || d.name.toLowerCase().split(/[\s(]/)[0].length > 4 && q.includes(d.name.toLowerCase().split(/[\s(]/)[0]));
  if (named.length) {
    const d = named[0];
    return { reply: `${d.name} — ${d.description}${d.openingHours ? ` Hours: ${d.openingHours}.` : ""}${d.address ? ` Address: ${d.address}.` : ""}`, cards: named.slice(0, 3).map(toCard), mode: "demo", mapFocus: { lat: d.lat, lng: d.lng, label: d.name }, links: d.websiteUrl ? [{ label: "Destination page", href: d.websiteUrl }] : links };
  }
  // Category keywords
  const catMap: Array<[string[], string]> = [[["eat", "food", "restaurant", "culinary", "makan", "dinner", "lunch", "coffee", "cafe"], "Culinary"], [["beach", "pantai", "swim"], "Beach & Water"], [["shop", "mall", "belanja"], "Shopping"], [["photo", "instagram", "spot"], "Photo Spot"], [["night", "bar", "club", "live music"], "Night Life"], [["sport", "golf", "padel", "bowling"], "Sport"], [["nature", "green", "mangrove", "park"], "Green Tourism"], [["activity", "things to do", "fun"], "Activities"]];
  for (const [words, cat] of catMap) {
    if (has(q, ...words)) { const c = byCat(cat); return { reply: `${cat} picks in PIK: ${c.slice(0, 6).map((d) => `${d.name} (${d.area.name})`).join(", ")}.`, cards: c.slice(0, 4).map(toCard), mode: "demo", links }; }
  }
  return { reply: `Where should you go? Start with PIK's icons: ${main.slice(0, 6).map((d) => d.name).join(", ")}. Ask me about food, family spots, pet-friendly venues, places of worship, events this weekend, transport, or a one-day itinerary.${demoNote}`, cards: main.slice(0, 4).map(toCard), mode: "demo", links };
}

export async function askTauPik(userId: string, message: string): Promise<TauReply> {
  const historyRows = await prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 });
  const history = historyRows.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  await prisma.chatMessage.create({ data: { userId, role: "user", content: message } });
  let out: TauReply;
  if (client) {
    try { out = await liveAnswer(userId, message, history); }
    catch (e) { console.error("TauPIK live error", e); out = { ...(await demoAnswer(userId, message)), reply: "(Live assistant temporarily unavailable — showing database results.)\n\n" + (await demoAnswer(userId, message)).reply }; }
  } else out = await demoAnswer(userId, message);
  await prisma.chatMessage.create({ data: { userId, role: "assistant", content: out.reply, meta: JSON.stringify({ cards: out.cards.map((c) => c.slug), mode: out.mode, mapFocus: out.mapFocus ?? null, links: out.links ?? [] }) } });
  return out;
}
