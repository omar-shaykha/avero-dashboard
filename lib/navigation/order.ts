export const DEFAULT_ORDER = [
  "monitoring", "cashier", "add_items", "inventory", "purchasing",
  "production", "accounting", "agents", "crm", "clients", "apps", "settings", "go",
] as const;

export type NavSectionKey = (typeof DEFAULT_ORDER)[number];

/** Keep the King layout while migrating old POS and Operations menus. */
export function normalizeOrder(value: unknown): NavSectionKey[] {
  const input = Array.isArray(value) ? value.map(String) : [];
  const seen = new Set<string>();
  const valid: NavSectionKey[] = [];
  for (const raw of input) {
    const key = raw === "pos" ? "cashier" : raw;
    if (!DEFAULT_ORDER.includes(key as NavSectionKey) || seen.has(key)) continue;
    valid.push(key as NavSectionKey);
    seen.add(key);
  }
  if (valid.includes("cashier") && !valid.includes("add_items")) valid.splice(valid.indexOf("cashier") + 1, 0, "add_items");
  if (valid.includes("purchasing")) {
    if (!valid.includes("inventory")) valid.splice(valid.indexOf("purchasing"), 0, "inventory");
    let after = valid.indexOf("purchasing") + 1;
    for (const key of ["production", "accounting"] as const) {
      if (!valid.includes(key)) valid.splice(after++, 0, key);
    }
  }
  return [...valid, ...DEFAULT_ORDER.filter(key => !valid.includes(key))];
}
