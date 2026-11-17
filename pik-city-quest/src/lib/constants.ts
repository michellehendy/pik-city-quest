// Central enums (stored as strings in the DB so the schema stays portable across SQLite/Postgres)

export const ROLES = ["VISITOR", "SUPER_ADMIN", "QUEST_MANAGER", "VERIFICATION_ADMIN", "PARTNER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "QUEST_MANAGER", "VERIFICATION_ADMIN", "PARTNER_ADMIN"];

export const PERMISSIONS = {
  "quests.manage": ["SUPER_ADMIN", "QUEST_MANAGER"],
  "destinations.manage": ["SUPER_ADMIN", "QUEST_MANAGER"],
  "venue.view": ["SUPER_ADMIN", "QUEST_MANAGER", "PARTNER_ADMIN"],
  "missions.manage": ["SUPER_ADMIN", "QUEST_MANAGER"],
  "rewards.manage": ["SUPER_ADMIN", "QUEST_MANAGER"],
  "badges.manage": ["SUPER_ADMIN", "QUEST_MANAGER"],
  "levels.manage": ["SUPER_ADMIN"],
  "qr.manage": ["SUPER_ADMIN", "QUEST_MANAGER", "PARTNER_ADMIN"],
  "verification.review": ["SUPER_ADMIN", "VERIFICATION_ADMIN"],
  "redemption.verify": ["SUPER_ADMIN", "PARTNER_ADMIN", "QUEST_MANAGER"],
  "analytics.view": ["SUPER_ADMIN", "QUEST_MANAGER", "PARTNER_ADMIN", "VERIFICATION_ADMIN"],
  "users.manage": ["SUPER_ADMIN"],
  "audit.view": ["SUPER_ADMIN"],
  "settings.manage": ["SUPER_ADMIN"],
  "admin.access": ["SUPER_ADMIN", "QUEST_MANAGER", "VERIFICATION_ADMIN", "PARTNER_ADMIN"],
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const QUEST_TYPES = ["SPECIAL", "REGULAR"] as const;
export const QUEST_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const COMPLETION_RULES = ["SEQUENTIAL", "OPEN", "MINIMUM", "CUSTOM"] as const;

export const MISSION_TYPES = [
  "PHOTO", "QR", "GPS", "QUIZ", "CODE", "VIDEO", "MULTI",
  "SOCIAL", "EVENT_CHECKIN", "FIND_OBJECT", "TRIVIA", "COLLECT", "TIMED", "TEAM",
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

// Requirement types that make up missions (MULTI missions have several)
export const REQUIREMENT_TYPES = ["PHOTO", "QR", "GPS", "QUIZ", "CODE", "VIDEO", "SOCIAL", "EVENT_CHECKIN", "FIND_OBJECT"] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
export const AUTO_VERIFIED: RequirementType[] = ["QR", "GPS", "QUIZ", "CODE", "EVENT_CHECKIN"];
export const MANUAL_VERIFIED: RequirementType[] = ["PHOTO", "VIDEO", "SOCIAL", "FIND_OBJECT"];

export const MISSION_TYPE_META: Record<string, { label: string; icon: string; hint: string }> = {
  PHOTO: { label: "Photo Mission", icon: "camera", hint: "Upload a photo as proof" },
  QR: { label: "QR Code Mission", icon: "qr-code", hint: "Scan the QR code at the venue" },
  GPS: { label: "GPS Check-in", icon: "map-pin", hint: "Check in on location" },
  QUIZ: { label: "Quiz Mission", icon: "help-circle", hint: "Answer questions about the destination" },
  CODE: { label: "Secret Code", icon: "key-round", hint: "Find the code displayed at the venue" },
  VIDEO: { label: "Video Mission", icon: "video", hint: "Record a short video" },
  MULTI: { label: "Multi-step Mission", icon: "list-checks", hint: "Complete several steps" },
  SOCIAL: { label: "Social Challenge", icon: "share-2", hint: "Post and share your link" },
  EVENT_CHECKIN: { label: "Event Check-in", icon: "calendar-check", hint: "Check in during the event" },
  FIND_OBJECT: { label: "Find the Object", icon: "search", hint: "Find and photograph the object" },
  TRIVIA: { label: "Destination Trivia", icon: "sparkles", hint: "Trivia about PIK" },
  COLLECT: { label: "Collect-a-series", icon: "layers", hint: "Collect a series" },
  TIMED: { label: "Time-based Challenge", icon: "timer", hint: "Beat the clock" },
  TEAM: { label: "Group Challenge", icon: "users", hint: "Play as a team" },
};

export const SUBMISSION_STATUS = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
export const CHECKPOINT_STATUS = ["LOCKED", "AVAILABLE", "IN_PROGRESS", "SUBMITTED", "COMPLETED"] as const;

export const BADGE_CATEGORIES = ["DESTINATION", "AREA", "TRANSPORT", "EVENT", "EXPERIENCE", "QUEST", "LEVEL"] as const;
export const BADGE_RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
export const RARITY_COLORS: Record<string, string> = {
  COMMON: "#64748b",
  RARE: "#0ea5e9",
  EPIC: "#8b5cf6",
  LEGENDARY: "#f8b818",
};

export const REWARD_TYPES = ["DISCOUNT", "MERCHANDISE", "DINING", "TICKET", "PARTNER", "EXPERIENCE", "DIGITAL"] as const;
export const REWARD_ISSUANCE = ["QUEST_COMPLETION", "BADGE", "POINTS", "CAMPAIGN", "TOURIST_EXCLUSIVE"] as const;

export const AREA_SLUGS = ["pik1", "golf-island", "riverwalk-island", "pik2"] as const;

export const DURATION_BUCKETS = [
  { key: "lt1", label: "Under 1 hour", min: 0, max: 59 },
  { key: "1to2", label: "1–2 hours", min: 60, max: 120 },
  { key: "2to4", label: "2–4 hours", min: 121, max: 240 },
  { key: "half", label: "Half-day", min: 241, max: 360 },
  { key: "full", label: "Full-day", min: 361, max: 10000 },
];

export const BRAND = {
  teal: "#087088",
  tealLight: "#40c0c8",
  sun: "#f8b818",
  ink: "#0f2a33",
};

export const SESSION_COOKIE = "pikq_session";
export const SESSION_DAYS = 30;
