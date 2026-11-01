import { timingSafeEqual } from "node:crypto";

export type DemoAccess = { private: boolean; password?: string };
export function authorizeDemo(
  authorization: string | null,
  access: DemoAccess,
): "allowed" | "unauthorized" | "unconfigured" {
  if (!access.private) return "allowed";
  if (!access.password || access.password.length < 16) return "unconfigured";
  if (!authorization?.startsWith("Basic ") || authorization.length > 4096)
    return "unauthorized";
  const supplied = Buffer.from(authorization.slice(6), "base64");
  const expected = Buffer.from(`reviewer:${access.password}`);
  return supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
    ? "allowed"
    : "unauthorized";
}
