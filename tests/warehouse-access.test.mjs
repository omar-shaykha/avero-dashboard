import assert from "node:assert/strict";
import test from "node:test";
import { belongsToActiveCompany, parseWarehouseAccessInput } from "../lib/inventory/warehouse-access.ts";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const warehouseId = "44444444-4444-4444-8444-444444444444";

test("decodes only valid warehouse access input and defaults grants to false", () => {
  assert.deepEqual(parseWarehouseAccessInput({ user_id: userId, warehouse_id: warehouseId }), {
    userId, warehouseId, canView: true, canManage: false, canTransfer: false,
    canCount: false, canViewCost: false,
  });
  assert.equal(parseWarehouseAccessInput({ user_id: userId, warehouse_id: warehouseId, can_view_cost: "true" }), null);
  assert.equal(parseWarehouseAccessInput({ user_id: userId, warehouse_id: "invalid" }), null);
  assert.equal(parseWarehouseAccessInput([userId, warehouseId]), null);
});

test("requires the target account, active membership and warehouse to belong to the tenant", () => {
  const profile = { user_id: userId, company_id: companyId };
  const membership = { user_id: userId, company_id: companyId, status: "active" };
  const warehouse = { id: warehouseId, company_id: companyId, active: true };
  const allowed = (p, m, w) => belongsToActiveCompany(companyId, userId, warehouseId, p, m, w);

  assert.equal(allowed(profile, membership, warehouse), true);
  assert.equal(allowed({ ...profile, company_id: otherCompanyId }, membership, warehouse), false);
  assert.equal(allowed(profile, { ...membership, company_id: otherCompanyId }, warehouse), false);
  assert.equal(allowed(profile, { ...membership, status: "suspended" }, warehouse), false);
  assert.equal(allowed(profile, membership, { ...warehouse, company_id: otherCompanyId }), false);
  assert.equal(allowed(profile, membership, { ...warehouse, active: false }), false);
  assert.equal(allowed(profile, null, warehouse), false);
});
