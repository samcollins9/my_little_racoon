import { expect, vi, type Mock } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fakeSupabase, type FakeResult } from "@/lib/date-page/test-support";
import DatePage from "@/app/date/[date]/page";
import ReadingPage from "./page";

/**
 * Server-render helpers for the two page components, shared by
 * reveal-landing.test.ts (Sprint 33) and accuracy-pages.test.ts (Sprint 39).
 * Named without `.test.` so vitest doesn't collect it as a suite.
 *
 * Each test file must still declare its own vi.mock calls for
 * "@/lib/supabase/anon-client", "@/lib/supabase/admin" and "next/server"
 * (vi.mock is hoisted per file). With those in place, createAnonClient is a
 * mock this module points at a recording double, and createAdminClient
 * throws if a render ever reaches it.
 */

export const ok = (data: unknown): FakeResult => ({ data, error: null, status: 200 });

/** The date page's one lookup besides get_reading_by_date: Sprint 47's random link. */
export const NAVIGATION_RPCS = {
  get_recent_reading_dates: ok([]),
};

export function useAnon(rpc: Record<string, FakeResult>) {
  const fake = fakeSupabase({ rpc });
  vi.mocked(createAnonClient).mockReturnValue(fake.client);
  return fake;
}

export async function renderDatePage(
  date: string,
  searchParams: Record<string, string | string[]> = {}
): Promise<string> {
  const element = await DatePage({
    params: Promise.resolve({ date }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToStaticMarkup(element as ReactElement);
}

export async function renderReadingPage(
  id: string,
  searchParams: Record<string, string | string[]> = {}
): Promise<string> {
  const element = await ReadingPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToStaticMarkup(element as ReactElement);
}

/** Sprint 33, R4 (and Sprint 28, R3): nothing on a GET render writes, generates or calls OpenAI. */
export function expectNoWriteAndNoOpenAI(fake: ReturnType<typeof fakeSupabase>, fetchSpy: Mock) {
  expect(createAdminClient).not.toHaveBeenCalled();
  expect(fake.from).not.toHaveBeenCalled();
  expect(fake.insert).not.toHaveBeenCalled();
  expect(fake.rpc).not.toHaveBeenCalledWith("set_reading_horoscope", expect.anything());
  for (const [url] of fetchSpy.mock.calls) expect(String(url)).not.toContain("openai.com");
}
