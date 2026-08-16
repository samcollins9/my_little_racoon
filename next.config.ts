import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sprint 11: `/` has no page of its own -- this is the entire answer,
  // handled by Next.js's routing layer before any component renders, not
  // a page that ships content and then navigates away from it.
  //
  // permanent: false (307) deliberately, despite the intent being
  // long-lived: a 308 gets cached aggressively by browsers/CDNs, which
  // would make this hard to change later (Sprint 13's redesign might want
  // `/` to serve something itself). 307 keeps the redirect in effect
  // without locking in how long-term the caching treats it.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/chart",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
