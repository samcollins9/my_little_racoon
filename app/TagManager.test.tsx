import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";
import Script from "next/script";
import { GTM_INIT_SCRIPT, GTM_SCRIPT_URL } from "@/lib/analytics/tag-manager";
import { TagManager } from "./TagManager";

// Sprint 46. next/script renders nothing outside a Next request (it hands
// its scripts to Next's own head and loader), so these read the elements
// TagManager returns. What a built page actually serves is checked in the
// handoff against `next build && next start`.

type ScriptProps = { id: string; src?: string; strategy: string; children?: ReactNode };

function scripts(node: ReactNode): ScriptProps[] {
  if (node === null) return [];
  const fragment = node as ReactElement<{ children: ReactNode }>;
  return Children.toArray(fragment.props.children).map((child) => {
    if (!isValidElement(child) || child.type !== Script) throw new Error("expected only next/script elements");
    return child.props as ScriptProps;
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TagManager (Sprint 46)", () => {
  it("R2: in production, Google's snippet: dataLayer set up first, then the container", () => {
    expect(scripts(TagManager({ source: { VERCEL_ENV: "production" } }))).toEqual([
      { id: "gtm-init", strategy: "beforeInteractive", children: GTM_INIT_SCRIPT },
      { id: "gtm-container", src: GTM_SCRIPT_URL, strategy: "afterInteractive" },
    ]);
  });

  it.each([["preview"], ["development"], [undefined]])("R3: renders nothing when VERCEL_ENV is %s", (env) => {
    expect(TagManager({ source: { VERCEL_ENV: env } })).toBeNull();
  });

  it("R3: reads the server's own VERCEL_ENV by default", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(scripts(TagManager({}))).toHaveLength(2);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(TagManager({})).toBeNull();
  });

  it("R3: the test suite itself never loads it", () => {
    expect(process.env.VERCEL_ENV).toBeUndefined();
    expect(TagManager({})).toBeNull();
  });
});
