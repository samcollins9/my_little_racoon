import type { NextConfig } from "next";

// Sprint 28: Sprint 11's static `/` -> /chart redirect is gone. `/` now
// lands on today's date page, and that has to be worked out per request
// (app/page.tsx), which a static redirect here can't do.
const nextConfig: NextConfig = {};

export default nextConfig;
