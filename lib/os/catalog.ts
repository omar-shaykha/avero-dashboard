import { hasFeature, hasPermission, isKingAdmin, isTenantAdmin, type AuthorizationContext } from "@/lib/auth/authorization";

export type OsApp = "control" | "operations" | "sell" | "go" | "intelligence" | "admin";
export type OperationsArea = "inventory" | "purchasing" | "production" | "accounting";

const operationsPermissions: Record<OperationsArea, readonly string[]> = {
  inventory: ["inventory.view", "inventory.manage"],
  purchasing: ["purchasing.view", "purchasing.manage", "purchasing.approve", "purchasing.receive", "purchasing.pay"],
  production: ["production.view", "production.manage"],
  accounting: ["sales.cost.view", "inventory.cost.view"],
};

export function canOpenOperationsArea(access: AuthorizationContext, area: OperationsArea): boolean {
  return isKingAdmin(access) || isTenantAdmin(access) || operationsPermissions[area].some((permission) => hasPermission(access, permission));
}

export function allowedOperationsAreas(access: AuthorizationContext): OperationsArea[] {
  return (Object.keys(operationsPermissions) as OperationsArea[]).filter((area) => canOpenOperationsArea(access, area));
}

export function canOpenSell(access: AuthorizationContext): boolean {
  return isKingAdmin(access) || isTenantAdmin(access) || ["sales.view", "sales.cashier", "sales.manage"].some((permission) => hasPermission(access, permission));
}

export function availableOsApps(access: AuthorizationContext): Record<OsApp, boolean> {
  return {
    control: Boolean(access.profile.company_id),
    operations: allowedOperationsAreas(access).length > 0,
    sell: canOpenSell(access),
    go: canOpenSell(access),
    intelligence: hasFeature(access, "ai_sales") && hasPermission(access, "sales.view"),
    admin: isKingAdmin(access),
  };
}
