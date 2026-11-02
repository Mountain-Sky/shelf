/** Shared non-secret branch configuration, supplied at build time for each catalog. */
type Branch = { id: string; name: string };
const defaults: Branch[] = [
  { id: "ASH", name: "Ashburn" },
  { id: "RUST", name: "Rust" },
  { id: "PUR", name: "Purcellville" },
];
function configured(): Branch[] {
  const raw = process.env.NEXT_PUBLIC_SHELF_BRANCHES;
  if (!raw) return defaults;
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 30 ||
    value.some(
      (b) =>
        !b ||
        typeof b.id !== "string" ||
        !/^[A-Z0-9_-]{1,10}$/.test(b.id) ||
        typeof b.name !== "string" ||
        !b.name.trim() ||
        b.name.length > 100,
    ) ||
    new Set(value.map((b) => b.id)).size !== value.length
  )
    throw Error("Invalid public branch configuration.");
  return value;
}
export const branches = configured();
export function isBranch(value: string): boolean {
  return value === "" || branches.some((b) => b.id === value);
}
