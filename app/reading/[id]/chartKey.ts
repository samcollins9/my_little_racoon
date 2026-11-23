import type { PlanetName, PlanetPosition } from "@/lib/ephemeris/adapter";
import { ASPECT_DEFINITIONS, type Aspect, type AspectName } from "@/lib/ephemeris/aspects";
import { elementOfSign, modalityOfSign, type Element, type Modality } from "@/lib/ephemeris/balance";
import { ZODIAC_SIGNS, type ZodiacSign } from "@/lib/ephemeris/zodiac";
import {
  ASPECT_BASE_WIDTH,
  ASPECT_COLOR,
  ASPECT_DASH,
  PLANET_GLYPHS,
  SIGN_GLYPHS,
  dms,
  isShownRetrograde,
} from "./constellation";

/**
 * Sprint 37: the data behind the chart panel's Planets, Signs and Aspects
 * tabs. Pure shaping of what composeChart already produced -- nothing here
 * computes a position, an aspect or an orb (R7). Every glyph, name, element,
 * modality, line style and angle is read from the module the chart itself
 * reads it from, so the key can't drift from the chart it explains.
 */

/** A glyph and the name it stands for: the key's first column, always shown (R6). */
export type KeySymbol = { glyph: string; name: string };

export function planetSymbol(body: PlanetName): KeySymbol {
  return { glyph: PLANET_GLYPHS[body], name: body };
}

export function signSymbol(sign: ZodiacSign): KeySymbol {
  return { glyph: SIGN_GLYPHS[sign], name: sign };
}

export type PlanetRow = {
  planet: KeySymbol;
  sign: KeySymbol;
  /** The chart label's own position text, from the same formatter (R3/R7). */
  position: string;
  retrograde: boolean;
};

/** R3: one row per body, in the order the chart receives them (Sun → Pluto). */
export function planetRows(positions: PlanetPosition[]): PlanetRow[] {
  return positions.map((p) => ({
    planet: planetSymbol(p.body),
    sign: signSymbol(p.sign),
    position: dms(p.degreeInSign),
    retrograde: isShownRetrograde(p),
  }));
}

export type SignRow = {
  sign: KeySymbol;
  element: Element;
  modality: Modality;
  /** The bodies in this sign, in chart order; empty for an unoccupied sign. */
  planets: KeySymbol[];
  /** The chart's own rule for a highlighted sector: at least one body in the sign. */
  occupied: boolean;
};

/** R4: all twelve signs in zodiac order, Aries → Pisces. */
export function signRows(positions: PlanetPosition[]): SignRow[] {
  return ZODIAC_SIGNS.map((sign) => {
    const planets = positions.filter((p) => p.sign === sign).map((p) => planetSymbol(p.body));
    return {
      sign: signSymbol(sign),
      element: elementOfSign(sign),
      modality: modalityOfSign(sign),
      planets,
      occupied: planets.length > 0,
    };
  });
}

/** How the chart draws one aspect type's line, for the key's swatch (R5a). */
export type AspectLineStyle = { color: string; dash: string; width: number };

export function aspectLineStyle(aspect: AspectName): AspectLineStyle {
  return { color: ASPECT_COLOR[aspect], dash: ASPECT_DASH[aspect], width: ASPECT_BASE_WIDTH[aspect] };
}

/** "conjunction" -> "Conjunction": the display form of an AspectName. */
export function aspectLabel(aspect: AspectName): string {
  return aspect.charAt(0).toUpperCase() + aspect.slice(1);
}

export type AspectKeyRow = { aspect: AspectName; label: string; angle: string; line: AspectLineStyle };

/** R5a: the five aspect types, in lib/ephemeris/aspects.ts's own order. */
export function aspectKeyRows(): AspectKeyRow[] {
  return ASPECT_DEFINITIONS.map(({ name, angle }) => ({
    aspect: name,
    label: aspectLabel(name),
    angle: `${angle}°`,
    line: aspectLineStyle(name),
  }));
}

export type AspectRow = {
  planetA: KeySymbol;
  planetB: KeySymbol;
  aspect: AspectName;
  label: string;
  line: AspectLineStyle;
  /** One decimal place, with a degree sign. */
  orb: string;
};

/**
 * R5b: the chart's own aspect list (the one it draws threads for), tightest
 * orb first. composeChart already returns it sorted; this sorts a copy
 * anyway, so the table's order doesn't depend on that staying true.
 */
export function aspectRows(aspects: Aspect[]): AspectRow[] {
  return [...aspects]
    .sort((x, y) => x.orb - y.orb)
    .map((a) => ({
      planetA: planetSymbol(a.bodyA),
      planetB: planetSymbol(a.bodyB),
      aspect: a.aspect,
      label: aspectLabel(a.aspect),
      line: aspectLineStyle(a.aspect),
      orb: `${a.orb.toFixed(1)}°`,
    }));
}
