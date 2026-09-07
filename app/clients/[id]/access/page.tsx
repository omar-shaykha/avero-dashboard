"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { Bot, CheckCircle2, CreditCard, Power, ReceiptText, Save, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";

type User = {
  user_id: string;
  role: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  permission_overrides: { permission_id: string; allowed: boolean }[];
};

type Permission = { id: string; key: string; name: string; description?: string };
type Overview = { company: { id: string; name: string }; users: User[]; permissions: Permission[]; subscription: any; receipts: any[] };
type Feature = { id: string; key: string; enabled: boolean; expires_at?: string | null };
type Draft = { role: string; permissions: Record<string, boolean> };

const tabs = [
  ["users", Users, "Users & Access"],
  ["features", Bot, "Features"],
  ["subscription", CreditCard, "Subscription"],
  ["receipts", ReceiptText, "Receipts"],
] as const;

function userLabel(user: User) {
  return user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "User";
}

function cleanPermissionName(key: string) {
  return key.replace(/_/g, " ").replace(/\./g, " / ");
}

function permissionGroup(key: string) {
  return key.split(".")[0]?.replace(/_/g, " ") || "general";
}

function isInitiallyAllowed(user: User, permissionId: string) {
  return user.permission_overrides.find((item) => item.permission_id === permissionId)?.allowed === true;
}

function buildDrafts(overview: Overview) {
  return Object.fromEntries(
    overview.users.map((user) => [
      user.user_id,
      {
        role: user.role,
        permissions: Object.fromEntries(overview.permissions.map((permission) => [permission.id, isInitiallyAllowed(user, permission.id)])),
      },
    ]),
  ) as Record<string, Draft>;
}

export default function ClientAccessPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const ar = language === "ar";

  const [tab, setTab] = useState<(typeof tabs)[number][0]>("users");
  const [data, setData] = useState<Overview | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedUser, setSavedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [overviewResponse, featuresResponse] = await Promise.all([
      fetch(`/api/clients/${id}/overview`, { cache: "no-store" }),
      fetch(`/api/clients/${id}/features`, { cache: "no-store" }),
    ]);

    if (overviewResponse.ok) {
      const overview = (await overviewResponse.json()) as Overview;
      setData(overview);
      setDrafts(buildDrafts(overview));
    } else {
      setError(ar ? "تعذر تحميل بيانات العميل" : "Failed to load client data");
    }

    if (featuresResponse.ok) {
      const payload = await featuresResponse.json();
      setFeatures(payload.features || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of data?.permissions || []) {
      const group = permissionGroup(permission.key);
      groups.set(group, [...(groups.get(group) || []), permission]);
    }
    return [...groups.entries()];
  }, [data?.permissions]);

  const progress = useMemo(() => {
    const subscription = data?.subscription;
    if (!subscription?.current_period_start || !subscription?.current_period_end) return null;
    const start = new Date(subscription.current_period_start).getTime();
    const end = new Date(subscription.current_period_end).getTime();
    const now = Date.now();
    return {
      pct: Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)),
      days: Math.max(0, Math.ceil((end - now) / 86400000)),
    };
  }, [data]);

  function isDirty(user: User) {
    const draft = drafts[user.user_id];
    if (!draft || !data) return false;
    if (draft.role !== user.role) return true;
    return data.permissions.some((permission) => draft.permissions[permission.id] !== isInitiallyAllowed(user, permission.id));
  }

  function setPermission(user: User, permissionId: string, allowed: boolean) {
    setDrafts((current) => ({
      ...current,
      [user.user_id]: {
        ...(current[user.user_id] || { role: user.role, permissions: {} }),
        permissions: { ...(current[user.user_id]?.permissions || {}), [permissionId]: allowed },
      },
    }));
  }

  function setAllPermissions(user: User, allowed: boolean) {
    if (!data) return;
    setDrafts((current) => ({
      ...current,
      [user.user_id]: {
        ...(current[user.user_id] || { role: user.role, permissions: {} }),
        permissions: Object.fromEntries(data.permissions.map((permission) => [permission.id, allowed])),
      },
    }));
  }

  async function saveUser(user: User) {
    const draft = drafts[user.user_id];
    if (!draft || !data) return;
    setSaving(user.user_id);
    setSavedUser(null);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${id}/users/${user.user_id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bulk",
          role: draft.role,
          permissions: data.permissions.map((permission) => ({ permission_id: permission.id, allowed: draft.permissions[permission.id] === true })),
        }),
      });

      if (!response.ok) throw new Error("save failed");
      await load();
      setSavedUser(user.user_id);
      setTimeout(() => setSavedUser((current) => (current === user.user_id ? null : current)), 3500);
    } catch {
      setError(ar ? "صار خطأ أثناء حفظ الصلاحيات." : "Could not save access changes.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleFeature(feature: Feature) {
    setSaving(feature.id);
    const enabled = !feature.enabled;
    const response = await fetch(`/api/clients/${id}/features`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_id: feature.id, enabled, expires_at: feature.expires_at || null }),
    });
    if (response.ok) setFeatures((current) => current.map((item) => (item.id === feature.id ? { ...item, enabled } : item)));
    setSaving(null);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="min-h-screen lg:ml-64">
        <DashboardHeader />
        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.22em] text-blue-400">AVERO / Client Control Center</p>
                <h1 className="mt-2 text-2xl font-black md:text-3xl">{data?.company.name || "Client"}</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">{ar ? "إدارة سريعة وسهلة: المستخدم، الدور، والصلاحيات On / Off من نفس المكان." : "Fast control: user role and permissions as simple On / Off switches."}</p>
              </div>
              <ShieldCheck className="text-emerald-400" size={34} />
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {tabs.map(([key, Icon, label]) => (
                <button key={key} onClick={() => setTab(key)} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${tab === key ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "border border-slate-800 bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 py-16 text-center text-slate-500">Loading...</div>
            ) : (
              <>
                {tab === "users" && (
                  <div className="space-y-5">
                    {data?.users.map((user) => {
                      const draft = drafts[user.user_id];
                      const dirty = isDirty(user);
                      const activeCount = data.permissions.filter((permission) => draft?.permissions[permission.id]).length;

                      return (
                        <section key={user.user_id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
                          <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/45 p-5 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h2 className="text-lg font-black">{userLabel(user)}</h2>
                              <p className="text-sm text-slate-500">{user.email || "—"}</p>
                              <p className="mt-2 text-xs text-slate-500">{activeCount}/{data.permissions.length} permissions ON</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <select value={draft?.role || user.role} disabled={saving !== null} onChange={(event) => setDrafts((current) => ({ ...current, [user.user_id]: { ...(current[user.user_id] || { role: user.role, permissions: {} }), role: event.target.value } }))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-blue-300 outline-none focus:border-blue-500">
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                              </select>
                              <button onClick={() => setAllPermissions(user, true)} disabled={saving !== null} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/15">All ON</button>
                              <button onClick={() => setAllPermissions(user, false)} disabled={saving !== null} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800">All OFF</button>
                            </div>
                          </div>

                          <div className="space-y-4 p-5">
                            {groupedPermissions.map(([group, permissions]) => (
                              <div key={`${user.user_id}-${group}`} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-black capitalize text-white"><SlidersHorizontal size={16} className="text-blue-300" />{group}</div>
                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                  {permissions.map((permission) => {
                                    const allowed = draft?.permissions[permission.id] === true;
                                    return (
                                      <button key={permission.id} onClick={() => setPermission(user, permission.id, !allowed)} disabled={saving !== null} className="flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-start transition hover:border-slate-700 hover:bg-slate-900">
                                        <span>
                                          <span className="block text-sm font-bold text-slate-100">{cleanPermissionName(permission.key)}</span>
                                          {permission.description && <span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">{permission.description}</span>}
                                        </span>
                                        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${allowed ? "bg-emerald-500" : "bg-slate-700"}`}>
                                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${allowed ? "left-6" : "left-1"}`} />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950/35 p-4">
                            {savedUser === user.user_id && <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400"><CheckCircle2 size={17} />{ar ? "تم الحفظ" : "Saved"}</span>}
                            <button onClick={() => saveUser(user)} disabled={!dirty || saving !== null} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                              <Save size={16} /> {saving === user.user_id ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
                            </button>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}

                {tab === "features" && (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {features.map((feature) => (
                      <div key={feature.id} className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                        <div>
                          <h3 className="font-black">{feature.key.replace(/_/g, " ").toUpperCase()}</h3>
                          <p className="text-xs text-slate-500">Company entitlement</p>
                        </div>
                        <button disabled={saving === feature.id} onClick={() => toggleFeature(feature)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${feature.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                          <Power size={14} /> {feature.enabled ? "ON" : "OFF"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "subscription" && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    {data?.subscription ? (
                      <>
                        <div className="flex justify-between gap-4">
                          <div><p className="text-sm text-slate-500">Current plan</p><h2 className="text-2xl font-black">{data.subscription.subscription_plans?.name || "Custom"}</h2></div>
                          <span className="font-bold text-emerald-400">{data.subscription.status}</span>
                        </div>
                        <div className="mt-6 h-3 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${progress?.pct || 0}%` }} /></div>
                        <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{data.subscription.current_period_start ? new Date(data.subscription.current_period_start).toLocaleDateString() : "Not started"}</span><span>{progress ? `${progress.days} days remaining` : "Period pending"}</span><span>{data.subscription.current_period_end ? new Date(data.subscription.current_period_end).toLocaleDateString() : "—"}</span></div>
                      </>
                    ) : <p className="text-slate-500">No subscription found.</p>}
                  </div>
                )}

                {tab === "receipts" && (
                  <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800/50 text-slate-400"><tr><th className="p-4 text-start">Receipt</th><th className="p-4 text-start">Issued</th><th className="p-4 text-start">Amount</th><th className="p-4 text-start">Status</th></tr></thead>
                      <tbody>{data?.receipts.length ? data.receipts.map((receipt) => <tr key={receipt.id} className="border-t border-slate-800"><td className="p-4">{receipt.receipt_number}</td><td className="p-4">{new Date(receipt.issued_at).toLocaleDateString()}</td><td className="p-4">{receipt.total_amount} {receipt.currency}</td><td className="p-4">{receipt.payment_status}</td></tr>) : <tr><td colSpan={4} className="p-8 text-center text-slate-500">No receipts yet.</td></tr>}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
