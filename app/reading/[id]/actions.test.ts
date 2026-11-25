import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, FUTURE_DATE_MESSAGE, utcToday } from "@/lib/date-page/params";
import { fakeSupabase } from "@/lib/date-page/test-support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { generateAndPersistHoroscope } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";
import { ok } from "./page-test-support";

// Sprint 47, R4: the reading page's write path refuses a future event date
// before the admin client or the generator. redirect() is mocked to throw,
// as Next's own does, so the action stops where it redirects.

vi.mock("@/lib/supabase/anon-client", () => ({ createAnonClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/llm/generate", () => ({ generateAndPersistHoroscope: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

const ID = "0b01c79f-73d5-4fbc-afeb-d65da32ae38d";

function form(): FormData {
  const data = new FormData();
  data.set("readingId", ID);
  return data;
}

function storedReading(eventDate: string) {
  const fake = fakeSupabase({
    rpc: {
      get_reading_by_id: ok([{ id: ID, event_date: eventDate, positions: [], events: null, horoscope: null }]),
    },
  });
  vi.mocked(createAnonClient).mockReturnValue(fake.client);
  return fake;
}

afterEach(() => vi.clearAllMocks());

describe("generateReadingHoroscope refuses future dates (Sprint 47, R4)", () => {
  it.each([
    ["tomorrow (UTC)", addDays(utcToday(), 1)],
    ["the engine's last supported date", "2100-12-31"],
  ])("%s: back to the reading with the message, no admin client, no generation", async (_, date) => {
    const fake = storedReading(date);

    await expect(generateReadingHoroscope(form())).rejects.toThrow(
      `REDIRECT /reading/${ID}?error=${encodeURIComponent(FUTURE_DATE_MESSAGE)}`
    );
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(generateAndPersistHoroscope).not.toHaveBeenCalled();
    expect(fake.from).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("today itself goes on to the generator", async () => {
    storedReading(utcToday());
    vi.mocked(generateAndPersistHoroscope).mockResolvedValue({ ok: true } as never);

    await expect(generateReadingHoroscope(form())).rejects.toThrow(`REDIRECT /reading/${ID}`);
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(generateAndPersistHoroscope).toHaveBeenCalledTimes(1);
  });
});
