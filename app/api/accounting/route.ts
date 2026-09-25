import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { addLedgerBalances, type LedgerLine } from "@/lib/accounting/ledger";

const PAGE_SIZE = 1000;

export async function GET() {
  const access = await getAuthorizationContext();
  if (!access?.profile.company_id || !hasApp(access, "app_operations"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isKingAdmin(access) && !isTenantAdmin(access) && !hasPermission(access, "sales.cost.view") && !hasPermission(access, "inventory.cost.view"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const companyId = access.profile.company_id;
  const [accounts, journals] = await Promise.all([
    db.from("accounting_accounts").select("*").eq("company_id", companyId).order("code"),
    db.from("accounting_journal_entries").select("*").eq("company_id", companyId).order("entry_date", { ascending: false }).limit(100),
  ]);
  if (accounts.error || journals.error)
    return NextResponse.json({ error: "Could not load accounting" }, { status: 500 });

  const journalIds = new Set((journals.data || []).map((journal) => journal.id));
  const totals = new Map<string, number>();
  const byJournal = new Map<string, unknown[]>();

  // Supabase returns at most a page of rows per request. Never describe a truncated page as a balance.
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await db.from("accounting_journal_lines")
      .select("id,journal_entry_id,account_id,debit,credit,description,accounting_accounts(code,name_en,name_ar,account_type)")
      .eq("company_id", companyId).order("id", { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
    if (page.error) return NextResponse.json({ error: "Could not calculate ledger balances" }, { status: 500 });
    const rows = page.data || [];
    addLedgerBalances(totals, rows as LedgerLine[]);
    for (const line of rows) {
      if (!journalIds.has(line.journal_entry_id)) continue;
      const group = byJournal.get(line.journal_entry_id) || [];
      group.push(line);
      byJournal.set(line.journal_entry_id, group);
    }
    if (rows.length < PAGE_SIZE) break;
  }

  const accountCodes = new Map((accounts.data || []).map((account) => [account.id, account.code]));
  const balances: Record<string, number> = {};
  for (const [accountId, amount] of totals) balances[accountCodes.get(accountId) || accountId] = amount;
  return NextResponse.json({
    accounts: accounts.data || [], balances,
    journals: (journals.data || []).map((journal) => ({ ...journal, lines: byJournal.get(journal.id) || [] })),
  });
}
