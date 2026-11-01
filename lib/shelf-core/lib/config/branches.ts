/** Shared non-secret branch configuration; replace with verified LCPL codes before integration. */
export const branches = [
  { id: "ASH", name: "Ashburn" },
  { id: "RUST", name: "Rust" },
  { id: "PUR", name: "Purcellville" },
] as const;
export function isBranch(value: string): boolean {
  return value === "" || branches.some((b) => b.id === value);
}
