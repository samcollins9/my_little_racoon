import type { ReadingModel } from "../chart/model";

/**
 * PRD v2 §4. Unlike lib/events/wikipedia.ts, this throws on failure rather
 * than degrading to null (R8): a user pressed this button, so an OpenAI
 * error, timeout, or rate limit must surface rather than be swallowed, and
 * the caller (app/reading/[id]/actions.ts, via lib/llm/generate.ts) must
 * not persist anything when it does.
 *
 * Not wrapped in the `server-only` package, matching lib/supabase/admin.ts's
 * precedent -- that would break importing this file from plain vitest. The
 * actual guarantee is that this is only ever imported from a "use server"
 * file, which Next.js itself strips from the client bundle.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.9; // PRD §4.1: nondeterminism is the point, not a defect.
const TOP_ASPECT_COUNT = 6; // PRD §4.3: the tail beyond this dilutes rather than helps.

// R7: explicit, not inherited from a default -- same reasoning as Sprint
// 16's fetch timeout, longer here since a multi-paragraph completion
// takes longer than a JSON lookup.
const TIMEOUT_MS = 25000;

// Sprint 21: register changed from effusive to plain and declarative, and
// the grounding rule strengthened in the same edit, not left as it was --
// concreteness raises fabrication pressure (a model asked for specific
// detail from event text that may not contain it will supply its own),
// so "invent no detail about the events" is added alongside the existing
// "invent no astrological data" clause rather than instead of it.
//
// The worked example below is deliberately generic -- no named real
// place, date, or incident -- rather than drawn from an actual reading.
// R3 requires any real-world detail in it to be factually correct, and
// this is the one prompt where an approximate-but-wrong fact would teach
// exactly the failure mode this sprint exists to prevent. A generic
// scenario has no real-world claim to get wrong while still
// demonstrating the register: one placement, one event, one sentence
// each, concrete nouns, no ornament.
/** Exported for lib/llm/horoscope.test.ts -- asserting the exact string (R5). */
export const SYSTEM_PROMPT = `You are an astrologer writing retroactive horoscopes for entertainment.

You will be given the astrological conditions of a specific date, and a list of
things that happened on that date. Write a short horoscope that explains those
events as though the astrology caused them.

Register: plain and declarative, not ornamental. State a placement, the event it
connects to, and the connection itself -- one per sentence where possible.
Concrete nouns over adjectives. No grandeur, no rhetorical flourish, no
scene-setting.

Example:
Mars squared Neptune, and that week a labor strike shut the harbor down. Force
meeting water rarely stays symbolic for long.

Rules:
- Name actual planets, signs, and aspects from the data you are given.
- Connect specific placements to specific events. Do not be vague.
- Commit to it. No hedging, no "may have," no disclaimers, no acknowledging
  that this is retroactive.
- Two to four short paragraphs.
- Invent no astrological data beyond what is supplied, and invent no detail
  about the events beyond what is supplied.`;

// R2/§4.3: round to two decimals -- full precision spends tokens and
// reads as noise, not as meaning the model can use.
function round2(value: number): string {
  return value.toFixed(2);
}

/** Exported for lib/llm/horoscope.test.ts -- asserting the exact assembled prompt. */
export function buildPrompt(reading: ReadingModel): string {
  const { chart, events } = reading;
  const topAspects = chart.aspects.slice(0, TOP_ASPECT_COUNT);

  const positionsBlock = chart.positions
    .map(
      (p) =>
        `${p.body} in ${p.sign} at ${round2(p.degreeInSign)}°${p.retrograde ? " (retrograde)" : ""}`
    )
    .join("\n");

  const aspectsBlock = topAspects
    .map(
      (a) =>
        `${a.bodyA} ${a.aspect} ${a.bodyB} — orb ${round2(a.orb)}°, ${a.applying ? "applying" : "separating"}`
    )
    .join("\n");

  const eventsBlock =
    events.length > 0
      ? events.map((e) => `${e.year}: ${e.text}`).join("\n")
      : "Nothing specific on record for this date.";

  return `DATE: ${chart.date}

POSITIONS
${positionsBlock}

TIGHTEST ASPECTS
${aspectsBlock}

BALANCE
Elements: Fire ${chart.elements.Fire}, Earth ${chart.elements.Earth}, Air ${chart.elements.Air}, Water ${chart.elements.Water}
Modalities: Cardinal ${chart.modalities.Cardinal}, Fixed ${chart.modalities.Fixed}, Mutable ${chart.modalities.Mutable}
Moon: ${chart.moonPhase.phaseName}

WHAT HAPPENED
${eventsBlock}

Write the horoscope.`;
}

export type OpenAiConfig = { apiKey: string };

/**
 * R5: read here and only here, never NEXT_PUBLIC_-prefixed. The injectable
 * `source` mirrors lib/supabase/admin.ts's resolveAdminConfig -- makes the
 * missing-key path testable without touching real process.env.
 */
export function resolveOpenAiConfig(
  source: Record<string, string | undefined> = process.env
): OpenAiConfig {
  const apiKey = source.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("generateHoroscope requires OPENAI_API_KEY");
  }
  return { apiKey };
}

type ChatCompletionResponse = {
  model?: string;
  choices?: { message?: { content?: string } }[];
};

/**
 * Throws on any failure -- network error, non-2xx, timeout, or an
 * unexpected response shape -- rather than degrading (R8). Never called
 * automatically; only from the explicit generate/regenerate path
 * (lib/llm/generate.ts).
 */
export async function generateHoroscope(
  reading: ReadingModel
): Promise<{ text: string; model: string }> {
  const { apiKey } = resolveOpenAiConfig();
  const prompt = buildPrompt(reading);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const body = (await response.json()) as ChatCompletionResponse;
  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) {
    throw new Error("OpenAI response had no message content");
  }

  // The response's own model string when present (may be a dated snapshot
  // like "gpt-4o-mini-2024-07-18") -- more informative for horoscope_model
  // than the bare request value, and PRD §2.2 names exactly this as the
  // reason that column exists: knowing which rows came from which model.
  const model = typeof body.model === "string" && body.model ? body.model : OPENAI_MODEL;

  return { text, model };
}
