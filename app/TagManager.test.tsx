import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";
import Script from "next/script";
import { GTM_LOADER_SCRIPT } from "@/lib/analytics/tag-manager";
import { TagManager } from "./TagManager";

// Sprint 46. next/script renders nothing outside a Next request (it hands
// its scripts to Next's own head and loader), so these read the elements
// TagManager returns. What a built page actually serves is checked in the
// handoff against `next build && next start`.

type ScriptProps = { id: string; src?: string; strategy: string; children?: ReactNode };

function scripts(node: ReactNode): ScriptProps[] {
  if (node === null) return [];
  return Children.toArray(node).map((child) => {
    if (!isValidElement(child) || child.type !== Script) throw new Error("expected only next/script elements");
    return (child as ReactElement<ScriptProps>).props;
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TagManager (Sprint 46)", () => {
  it("R1/R2: in production, one afterInteractive inline script with no src", () => {
    // No src: next/script's src path adds a ReactDOM.preload whose fetch
    // wasn't reused on error-shell 404s, so the container downloaded twice.
    // Not beforeInteractive: inert where the layout renders only in the
    // browser (LiveQA round 1).
    expect(scripts(TagManager({ source: { VERCEL_ENV: "production" } }))).toEqual([
      { id: "gtm", strategy: "afterInteractive", children: GTM_LOADER_SCRIPT },
    ]);
  });

  it.each([["preview"], ["development"], [undefined]])("R3: renders nothing when VERCEL_ENV is %s", (env) => {
    expect(TagManager({ source: { VERCEL_ENV: env } })).toBeNull();
  });

  it("R3: reads the server's own VERCEL_ENV by default", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(scripts(TagManager({}))).toHaveLength(1);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(TagManager({})).toBeNull();
  });

  it("R3: the test suite itself never loads it", () => {
    expect(process.env.VERCEL_ENV).toBeUndefined();
    expect(TagManager({})).toBeNull();
  });
});
