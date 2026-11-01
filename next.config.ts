import type { NextConfig } from "next";
// Keep review builds separate from an already-running local production server.
const config: NextConfig = {
  distDir: process.env.SHELF_REVIEW_BUILD === "1" ? ".next-review" : ".next",
};
export default config;
