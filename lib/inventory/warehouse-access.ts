export type WarehouseAccessInput = {
  userId: string;
  warehouseId: string;
  canView: boolean;
  canManage: boolean;
  canTransfer: boolean;
  canCount: boolean;
  canViewCost: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FLAGS = ["can_view", "can_manage", "can_transfer", "can_count", "can_view_cost"] as const;

/** Decode untrusted HTTP input before any service-role database operation. */
export function parseWarehouseAccessInput(value: unknown): WarehouseAccessInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.user_id !== "string" || !UUID.test(input.user_id)
    || typeof input.warehouse_id !== "string" || !UUID.test(input.warehouse_id)
    || FLAGS.some((flag) => input[flag] !== undefined && typeof input[flag] !== "boolean")) return null;

  return {
    userId: input.user_id,
    warehouseId: input.warehouse_id,
    canView: input.can_view !== false,
    canManage: input.can_manage === true,
    canTransfer: input.can_transfer === true,
    canCount: input.can_count === true,
    canViewCost: input.can_view_cost === true,
  };
}

type Profile = { user_id: string; company_id: string } | null;
type Membership = { user_id: string; company_id: string; status: string } | null;
type Warehouse = { id: string; company_id: string; active: boolean } | null;

/** Ownership and membership are both required, even when the API uses a privileged key. */
export function belongsToActiveCompany(
  companyId: string, userId: string, warehouseId: string,
  profile: Profile, membership: Membership, warehouse: Warehouse,
): boolean {
  return Boolean(profile?.user_id === userId && profile.company_id === companyId
    && membership?.user_id === userId && membership.company_id === companyId && membership.status === "active"
    && warehouse?.id === warehouseId && warehouse.company_id === companyId && warehouse.active === true);
}
