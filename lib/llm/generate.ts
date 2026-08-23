import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingModel } from "../chart/model";
import { generateHoroscope } from "./horoscope";

/**
 * R6: absent, or any value other than an explicit disable, means enabled
 * -- the feature cannot ship silently off. "false" (any case) is the one
 * explicit disable value; everything else, including a typo, is enabled.
 */
export function isHoroscopeEnabled(
  source: Record<string, string | undefined> = process.env
): boolean {
  return source.HOROSCOPE_ENABLED?.trim().toLowerCase() !== "false";
}

export type GenerateResult = { ok: true } | { ok: false; error: string };

/**
 * The testable core of the generate/regenerate path, separated from the
 * "use server" boundary (app/reading/[id]/actions.ts) the same way
 * lib/chart/model.ts's composeChart is separated from app/chart/actions.ts
 * -- a plain function with injected dependencies is directly unit
 * testable; a "use server" export is not.
 *
 * R8: no write happens unless generateHoroscope succeeds. A thrown error
 * from generateHoroscope (network, timeout, malformed response) or from
 * the RPC call both leave the stored reading untouched -- there is no
 * partial-write path here to guard against, only ordering.
 */
export async function generateAndPersistHoroscope(
  anon: SupabaseClient,
  readingId: string,
  reading: ReadingModel
): Promise<GenerateResult> {
  if (!isHoroscopeEnabled()) {
    return { ok: false, error: "Horoscope generation is currently disabled." };
  }

  let text: string;
  let model: string;
  try {
    ({ text, model } = await generateHoroscope(reading));
  } catch {
    return { ok: false, error: "Horoscope generation failed, try again." };
  }

  const { data, error } = await anon.rpc("set_reading_horoscope", {
    reading_id: readingId,
    horoscope: text,
    model,
  });

  if (error || !data) {
    return { ok: false, error: "Could not save the horoscope, try again." };
  }

  return { ok: true };
}
