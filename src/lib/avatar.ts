/**
 * Deterministic SVG avatar generator.
 *
 * Produces a hybrid portrait-in-badge illustration using the same visual
 * language as the landing-page stadium pitch: inline SVG geometry, layered
 * backgrounds, glow filters, and subtle motif badges.
 *
 * Inputs: name/email (for initials + deterministic seed) and interests
 * (for motif selection). No sensitive traits are inferred.
 */

// ── helpers ──────────────────────────────────────────────────────────

/** Simple deterministic hash (djb2) → unsigned 32-bit integer. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick from array deterministically. */
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

/** Extract up to 2 uppercase initials from a name, falling back to email. */
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "U").toUpperCase();
}

// ── palette ──────────────────────────────────────────────────────────

const ACCENT_PAIRS: readonly [string, string][] = [
  ["#FF416C", "#FF4B2B"], // brand primary → accent
  ["#6366F1", "#8B5CF6"], // indigo → violet
  ["#06B6D4", "#0EA5E9"], // cyan → sky
  ["#F59E0B", "#EF4444"], // amber → red
  ["#10B981", "#14B8A6"], // emerald → teal
  ["#EC4899", "#F43F5E"], // pink → rose
];

const BG_TONES: readonly string[] = [
  "#1A1A2E", "#1A1E2E", "#1E1A2E", "#1A2E1E", "#2E1A1E", "#1A2E2E",
];

// ── motif SVG fragments ─────────────────────────────────────────────

type InterestKey =
  | "Sports" | "News" | "Entertainment" | "Music" | "Documentary"
  | "Gaming" | "Travel" | "Food" | "Tech" | "Fashion" | "Fitness" | "Art";

const MOTIF_PATHS: Record<InterestKey, string> = {
  Sports:
    // football
    '<circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<polygon points="50,42 55,46 55,54 50,58 45,54 45,46" fill="currentColor" opacity="0.6"/>',
  News:
    // newspaper
    '<rect x="40" y="42" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="44" y1="47" x2="56" y2="47" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="44" y1="51" x2="52" y2="51" stroke="currentColor" stroke-width="1"/>',
  Entertainment:
    // TV screen
    '<rect x="40" y="41" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="46" y1="55" x2="54" y2="55" stroke="currentColor" stroke-width="1.5"/>' +
    '<polygon points="48,46 48,52 54,49" fill="currentColor" opacity="0.6"/>',
  Music:
    // music note
    '<circle cx="47" cy="54" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="51" y1="54" x2="51" y2="40" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M51 40 Q56 38 56 43" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  Documentary:
    // film reel
    '<circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.5"/>' +
    '<circle cx="50" cy="42" r="1.5" fill="currentColor"/>' +
    '<circle cx="50" cy="58" r="1.5" fill="currentColor"/>',
  Gaming:
    // game controller
    '<rect x="39" y="44" width="22" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<circle cx="46" cy="50" r="2" fill="currentColor" opacity="0.7"/>' +
    '<circle cx="54" cy="50" r="2" fill="currentColor" opacity="0.7"/>' +
    '<line x1="48" y1="46" x2="48" y2="48" stroke="currentColor" stroke-width="1"/>',
  Travel:
    // compass
    '<circle cx="50" cy="50" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<polygon points="50,41 52,50 50,53 48,50" fill="currentColor" opacity="0.6"/>' +
    '<circle cx="50" cy="50" r="2" fill="currentColor"/>',
  Food:
    // fork + knife
    '<line x1="45" y1="40" x2="45" y2="58" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M45 40 Q42 46 45 48" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
    '<path d="M55 40 L55 47 Q55 50 52 50 L55 50 L55 58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  Tech:
    // code brackets
    '<path d="M44 44 L38 50 L44 56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M56 44 L62 50 L56 56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<line x1="52" y1="42" x2="48" y2="58" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>',
  Fashion:
    // hanger
    '<path d="M50 40 L50 44 L38 54 L62 54 L50 44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="39" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  Fitness:
    // dumbbell
    '<line x1="40" y1="50" x2="60" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="38" y="45" width="5" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="57" y="45" width="5" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  Art:
    // palette
    '<circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<circle cx="46" cy="45" r="2" fill="currentColor" opacity="0.7"/>' +
    '<circle cx="54" cy="45" r="2" fill="currentColor" opacity="0.5"/>' +
    '<circle cx="44" cy="52" r="2" fill="currentColor" opacity="0.6"/>' +
    '<circle cx="56" cy="52" r="1.5" fill="currentColor" opacity="0.4"/>',
};

const KNOWN_INTERESTS: readonly InterestKey[] = [
  "Sports", "News", "Entertainment", "Music", "Documentary",
  "Gaming", "Travel", "Food", "Tech", "Fashion", "Fitness", "Art",
];

// ── generator ────────────────────────────────────────────────────────

export interface AvatarInput {
  name?: string | null;
  email?: string | null;
  interests?: string[];
}

export interface AvatarResult {
  svg: string;
  dataUrl: string;
  initials: string;
  /** CSS class name for the animation variant best matching this profile. */
  animationClass: string;
}

/**
 * Generate a deterministic SVG avatar.
 *
 * The illustration is a 100×100 hybrid portrait-in-badge:
 * - Circular badge frame with a gradient ring
 * - Layered geometric background (seeded by email/name)
 * - Initials centred as prominent text
 * - A small floating motif icon from the user's primary interest
 * - Glow filter for depth
 */
export function generateAvatar(input: AvatarInput): AvatarResult {
  const seed = hash((input.email ?? input.name ?? "user").toLowerCase());
  const initials = getInitials(input.name, input.email);

  // Deterministic palette selection
  const [accent1, accent2] = pick(ACCENT_PAIRS, seed);
  const bgTone = pick(BG_TONES, seed >> 4);

  // Select motif from first matching interest
  const primaryInterest = (input.interests ?? []).find((i) =>
    KNOWN_INTERESTS.includes(i as InterestKey)
  ) as InterestKey | undefined;

  // Deterministic decorative angles
  const deco1Angle = (seed % 360);
  const deco2Angle = ((seed >> 8) % 360);
  const deco3Angle = ((seed >> 16) % 360);

  // Floating shapes (small geometric decorations)
  const floatX1 = 18 + (seed % 15);
  const floatY1 = 18 + ((seed >> 3) % 15);
  const floatX2 = 68 + ((seed >> 6) % 15);
  const floatY2 = 65 + ((seed >> 9) % 15);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="ag${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent1}"/>
      <stop offset="100%" stop-color="${accent2}"/>
    </linearGradient>
    <filter id="af${seed}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="ac${seed}"><circle cx="50" cy="50" r="46"/></clipPath>
  </defs>

  <!-- Outer ring -->
  <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ag${seed})" stroke-width="2.5" opacity="0.8"/>
  <circle cx="50" cy="50" r="46" fill="${bgTone}"/>

  <!-- Clipped interior -->
  <g clip-path="url(#ac${seed})">
    <!-- Layered geometric background -->
    <rect x="0" y="0" width="100" height="100" fill="${bgTone}"/>
    <rect x="5" y="5" width="90" height="90" rx="45" fill="${accent1}" opacity="0.06"
          transform="rotate(${deco1Angle} 50 50)"/>
    <rect x="15" y="15" width="70" height="70" rx="35" fill="${accent2}" opacity="0.08"
          transform="rotate(${deco2Angle} 50 50)"/>
    <circle cx="50" cy="50" r="28" fill="${accent1}" opacity="0.05"/>

    <!-- Decorative floating shapes -->
    <circle cx="${floatX1}" cy="${floatY1}" r="3" fill="${accent1}" opacity="0.2"/>
    <rect x="${floatX2}" y="${floatY2}" width="5" height="5" rx="1"
          fill="${accent2}" opacity="0.18" transform="rotate(${deco3Angle} ${floatX2 + 2.5} ${floatY2 + 2.5})"/>

    <!-- Initials -->
    <text x="50" y="${initials.length > 1 ? 56 : 57}" text-anchor="middle"
          font-family="Inter,system-ui,sans-serif" font-size="${initials.length > 1 ? 28 : 32}"
          font-weight="700" fill="white" filter="url(#af${seed})">${initials}</text>
  </g>

  ${primaryInterest ? `<!-- Interest motif badge -->
  <g transform="translate(68, 68) scale(0.42)" color="${accent1}" opacity="0.85">
    <circle cx="50" cy="50" r="16" fill="${bgTone}" stroke="${accent1}" stroke-width="1.5"/>
    ${MOTIF_PATHS[primaryInterest]}
  </g>` : ""}
</svg>`;

  const dataUrl = `data:image/svg+xml;base64,${typeof Buffer !== "undefined" ? Buffer.from(svg).toString("base64") : btoa(svg)}`;

  // Determine animation variant based on profile characteristics
  const animationClass = resolveAnimationClass(input.interests ?? [], seed);

  return { svg, dataUrl, initials, animationClass };
}

// ── animation variant resolution ────────────────────────────────────

const INTEREST_TO_VIBE: Record<InterestKey, string> = {
  Sports: "energetic",
  News: "steady",
  Entertainment: "playful",
  Music: "rhythmic",
  Documentary: "steady",
  Gaming: "energetic",
  Travel: "playful",
  Food: "warm",
  Tech: "precise",
  Fashion: "playful",
  Fitness: "energetic",
  Art: "rhythmic",
};

const VIBE_CLASSES: Record<string, string> = {
  energetic: "avatar-vibe-energetic",
  steady: "avatar-vibe-steady",
  playful: "avatar-vibe-playful",
  rhythmic: "avatar-vibe-rhythmic",
  warm: "avatar-vibe-warm",
  precise: "avatar-vibe-precise",
};

function resolveAnimationClass(interests: string[], seed: number): string {
  const matched = interests.find((i) => KNOWN_INTERESTS.includes(i as InterestKey)) as InterestKey | undefined;
  if (matched) return VIBE_CLASSES[INTEREST_TO_VIBE[matched]];
  // Fallback: deterministic pick from available vibes
  const vibes = Object.values(VIBE_CLASSES);
  return pick(vibes, seed);
}
