import type { PlanetName, PlanetPosition } from "../../lib/ephemeris/adapter";
import type { Aspect } from "../../lib/ephemeris/aspects";
import { computeMoonPhase, type PhaseName } from "../../lib/ephemeris/moon-phase";
import type { ZodiacSign } from "../../lib/ephemeris/zodiac";

/**
 * Pure rendering geometry for the Aspect Constellation
 * (docs/design/HANDOFF_chart_constellation.md). Ported from the design
 * prototype's own renderVals() (docs/design/prototype_chart_constellation.html)
 * -- the rendering math only. Positions and aspects are never computed
 * here; they're passed in already computed by lib/ephemeris/ (Sprint 6)
 * and lib/ephemeris/aspects.ts (Sprint 12). No Keplerian elements, no
 * longitude maths, anywhere in this file (R2).
 */

const CX = 320;
const CY = 320;
const D = Math.PI / 180;

const PLANET_GLYPHS: Record<PlanetName, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
};

// Orbital order for radial placement, not adapter.ts's canonical order.
const RING_ORDER: Record<PlanetName, number> = {
  Moon: 0,
  Sun: 1,
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6,
  Uranus: 7,
  Neptune: 8,
  Pluto: 9,
};

const SIGN_ORDER: ZodiacSign[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const SIGN_GLYPHS: Record<ZodiacSign, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export const ASPECT_SYMBOLS: Record<Aspect["aspect"], string> = {
  conjunction: "☌",
  opposition: "☍",
  trine: "△",
  square: "□",
  sextile: "⚹",
};

export const ASPECT_MAX_ORB: Record<Aspect["aspect"], number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 4,
};

export const ASPECT_DASH: Record<Aspect["aspect"], string> = {
  conjunction: "0",
  opposition: "0",
  trine: "0",
  square: "5 4",
  sextile: "2 5",
};

export const ASPECT_BASE_WIDTH: Record<Aspect["aspect"], number> = {
  conjunction: 1.6,
  opposition: 1.4,
  trine: 1.2,
  square: 1.2,
  sextile: 1.0,
};

const COLOR_GOLD = "oklch(0.84 0.07 85)";
const COLOR_VERDIGRIS = "oklch(0.70 0.13 145)";
const COLOR_RUST = "oklch(0.68 0.13 25)";

export const ASPECT_COLOR: Record<Aspect["aspect"], string> = {
  conjunction: COLOR_GOLD,
  opposition: COLOR_RUST,
  trine: COLOR_VERDIGRIS,
  square: COLOR_RUST,
  sextile: COLOR_VERDIGRIS,
};

/** "12°34'" -- degree and minute within the body's sign. */
function dms(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.floor((degreeInSign - deg) * 60);
  return `${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'`;
}

export type BodyRender = {
  key: PlanetName;
  glyph: string;
  sign: ZodiacSign;
  retrograde: boolean;
  x: number;
  y: number;
  dotRadius: number;
  glyphX: number;
  glyphY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
  label: string;
  color: string;
};

export function computeBodies(positions: PlanetPosition[]): BodyRender[] {
  return positions.map((p) => {
    const ring = RING_ORDER[p.body];
    const r = 78 + ring * 22;
    // Screen angle for ecliptic longitude: (180 - lon) degrees, putting 0
    // Aries at the left edge and running signs counter-clockwise.
    const angle = (180 - p.eclipticLongitude) * D;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = CX + r * cos;
    const y = CY + r * sin;
    const luminary = ring < 2;

    return {
      key: p.body,
      glyph: PLANET_GLYPHS[p.body],
      sign: p.sign,
      retrograde: p.retrograde,
      x,
      y,
      dotRadius: luminary ? 3.6 : 2.6,
      glyphX: CX + (r - 15) * cos,
      glyphY: CY + (r - 15) * sin,
      labelX: CX + (r + 16) * cos,
      labelY: CY + (r + 16) * sin,
      labelAnchor: cos < 0 ? "end" : "start",
      label: `${dms(p.degreeInSign)} ${SIGN_GLYPHS[p.sign]}${p.retrograde ? "  ℞" : ""}`,
      color: luminary ? COLOR_GOLD : p.retrograde ? COLOR_RUST : COLOR_VERDIGRIS,
    };
  });
}

export type ThreadGeometry = {
  bodyA: PlanetName;
  bodyB: PlanetName;
  aspect: Aspect["aspect"];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dash: string;
  tightness: number;
  baseWidth: number;
};

export function computeThreads(aspects: Aspect[], bodies: BodyRender[]): ThreadGeometry[] {
  const byKey = new Map(bodies.map((b) => [b.key, b]));
  return aspects.map((a) => {
    const bodyA = byKey.get(a.bodyA)!;
    const bodyB = byKey.get(a.bodyB)!;
    return {
      bodyA: a.bodyA,
      bodyB: a.bodyB,
      aspect: a.aspect,
      x1: bodyA.x,
      y1: bodyA.y,
      x2: bodyB.x,
      y2: bodyB.y,
      color: ASPECT_COLOR[a.aspect],
      dash: ASPECT_DASH[a.aspect],
      tightness: a.tightness,
      baseWidth: ASPECT_BASE_WIDTH[a.aspect],
    };
  });
}

export type SectorRender = {
  sign: ZodiacSign;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
  glyphX: number;
  glyphY: number;
  glyph: string;
  occupied: boolean;
};

export function computeSectors(bodies: BodyRender[]): SectorRender[] {
  const occupiedSigns = new Set(bodies.map((b) => b.sign));
  return SIGN_ORDER.map((sign, i) => {
    const startAngle = (180 - i * 30) * D;
    const midAngle = (180 - (i * 30 + 15)) * D;
    return {
      sign,
      lineX1: CX + 60 * Math.cos(startAngle),
      lineY1: CY + 60 * Math.sin(startAngle),
      lineX2: CX + 288 * Math.cos(startAngle),
      lineY2: CY + 288 * Math.sin(startAngle),
      glyphX: CX + 306 * Math.cos(midAngle),
      glyphY: CY + 306 * Math.sin(midAngle),
      glyph: SIGN_GLYPHS[sign],
      occupied: occupiedSigns.has(sign),
    };
  });
}

export type StarRender = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  duration: number;
  delay: number;
};

/**
 * Deterministic star field -- fixed seed (the handoff's own 20260816),
 * so it never reshuffles between renders. Computed once at module load,
 * not per-render: this is set dressing, not derived from any instant.
 */
export const STAR_FIELD: StarRender[] = (() => {
  let seed = 20260816;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const stars: StarRender[] = [];
  for (let i = 0; i < 110; i++) {
    const angle = next() * 360;
    const r = 40 + next() * 268;
    stars.push({
      x: CX + r * Math.cos(angle * D),
      y: CY + r * Math.sin(angle * D),
      radius: 0.4 + next() * 1.2,
      opacity: 0.12 + next() * 0.4,
      duration: 5 + next() * 9,
      delay: next() * 6,
    });
  }
  return stars;
})();

export type MoonPhaseGeometry = {
  path: string;
  phaseName: PhaseName;
};

/**
 * The lit limb is a true semicircle; the terminator is an ellipse whose
 * horizontal radius is |cos(elongation)| * r, bulging away from the lit
 * side for a crescent and toward it for a gibbous.
 */
export function computeMoonPhaseGeometry(positions: PlanetPosition[]): MoonPhaseGeometry {
  const { elongation, waxing, phaseName } = computeMoonPhase(positions);
  const r = 11;
  const cx = 320;
  const cy = 354;
  const k = Math.cos(elongation * D);
  const gibbous = k < 0;
  const outerSweep = waxing ? 1 : 0;
  const returnSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
  const terminatorRadius = Math.abs(k) * r;

  const path =
    `M ${cx} ${cy - r} ` +
    `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} ` +
    `A ${terminatorRadius.toFixed(3)} ${r} 0 0 ${returnSweep} ${cx} ${cy - r} Z`;

  return { path, phaseName };
}
