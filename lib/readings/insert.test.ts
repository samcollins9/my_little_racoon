import { describe, expect, it } from "vitest";
import { fakeSupabase } from "../date-page/test-support";
import { insertReading } from "./insert";

const READING = { event_date: "2012-11-11", positions: [], events: null };

describe("insertReading", () => {
  it("inserts with a fresh, client-chosen uuid and returns that id", async () => {
    const fake = fakeSupabase();
    const first = await insertReading(fake.client, READING);
    const second = await insertReading(fake.client, READING);

    expect(fake.from).toHaveBeenCalledWith("readings");
    const [a, b] = fake.insert.mock.calls.map(([row]) => row);
    expect(a).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), ...READING });
    expect(first).toEqual({ ok: true, id: a.id });
    expect(second).toEqual({ ok: true, id: b.id });
    expect(a.id).not.toBe(b.id);
  });

  it("returns the error and HTTP status unclassified, for the caller to classify", async () => {
    const error = { code: "23502", message: "not-null" };
    const fake = fakeSupabase({ insertResult: { data: null, error, status: 400 } });
    expect(await insertReading(fake.client, READING)).toEqual({ ok: false, error, status: 400 });
  });
});
