"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import {
  BadgeCheck,
  CalendarDays,
  CircleX,
  ClipboardList,
  Flame,
  Handshake,
  Inbox,
  MapPin,
  Phone,
  Target,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

export interface LeadData {
  id: string;
  title: string;
  service_type: string;
  status: string;
  interest_level: string;
  estimated_value: number | null;
  people_count: number | null;
  appointment_date: string | null;
  city: string | null;
  notes: string | null;
  updated_at: string;
  lead_source: string | null;
  priority: string | null;
  next_follow_up_at: string | null;
  next_action: string | null;
  probability: number | null;
  last_contact_at: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
}

interface LeadPipelineProps { leads: LeadData[]; }

type StageKey = "new" | "qualified" | "quotation" | "negotiation" | "won" | "lost";
const STAGE_ORDER: StageKey[] = ["new", "qualified", "quotation", "negotiation", "won", "lost"];
const STAGES: Record<StageKey, { icon: LucideIcon; label: string; labelAr: string; accent: string }> = {
  new: { icon: Inbox, label: "New", labelAr: "جديد", accent: "bg-blue-500" },
  qualified: { icon: BadgeCheck, label: "Qualified", labelAr: "مؤهل", accent: "bg-emerald-500" },
  quotation: { icon: ClipboardList, label: "Quotation", labelAr: "عرض سعر", accent: "bg-amber-500" },
  negotiation: { icon: Handshake, label: "Negotiation", labelAr: "تفاوض", accent: "bg-purple-500" },
  won: { icon: Trophy, label: "Won", labelAr: "تم الفوز", accent: "bg-green-500" },
  lost: { icon: CircleX, label: "Lost", labelAr: "مفقود", accent: "bg-red-500" },
};

export default function LeadPipeline({ leads: initialLeads }: LeadPipelineProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [localLeads, setLocalLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const metrics = useMemo(() => {
    const total = localLeads.length;
    const won = localLeads.filter((lead) => normalizeStatus(lead.status) === "won").length;
    const active = localLeads.filter((lead) => ["qualified", "quotation", "negotiation"].includes(normalizeStatus(lead.status))).length;
    const values = localLeads.map((lead) => lead.probability).filter((value): value is number => typeof value === "number");
    const avg = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    const estimated = localLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
    return { total, won, active, avg, estimated };
  }, [localLeads]);

  const closeModal = () => { setSelectedLead(null); setSelectedStatus(""); setUpdateMessage(null); };
  const leadsFor = (stage: StageKey) => localLeads.filter((lead) => normalizeStatus(lead.status) === stage);
  const stageLabel = (stage: StageKey) => ar ? STAGES[stage].labelAr : STAGES[stage].label;
  const interestLabel = (value?: string | null) => value ? value : "-";
  const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleString(ar ? "ar-SA" : "en-SA") : null;
  const whatsappUrl = (phone?: string | null) => phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;

  async function handleUpdateStatus() {
    if (!selectedLead || !selectedStatus) return;
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const response = await fetch(`/api/leads/${selectedLead.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: selectedStatus }) });
      if (!response.ok) throw new Error("update failed");
      setLocalLeads((current) => current.map((lead) => lead.id === selectedLead.id ? { ...lead, status: selectedStatus } : lead));
      setSelectedLead((current) => current ? { ...current, status: selectedStatus } : current);
      setUpdateMessage({ type: "success", text: ar ? "تم تحديث حالة العميل" : "Lead status updated" });
    } catch {
      setUpdateMessage({ type: "error", text: ar ? "تعذر تحديث الحالة" : "Could not update status" });
    } finally {
      setIsUpdating(false);
    }
  }

  return <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-blue-400">{ar ? "مسار المبيعات" : "Sales Pipeline"}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{ar ? "لوحة العملاء المحتملين" : "Lead Command Board"}</h2>
          <p className="mt-1 text-sm text-slate-400">{ar ? "شكل أوضح للنِسب والحالات والمتابعة بدون زحمة للعين." : "Cleaner lead stages, probability and next actions without visual noise."}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label={ar ? "كل العملاء" : "Total leads"} value={metrics.total} />
        <Metric label={ar ? "نشط بالمسار" : "Active pipeline"} value={metrics.active} />
        <Metric label={ar ? "تم الفوز" : "Won"} value={metrics.won} />
        <Metric label={ar ? "متوسط الاحتمال" : "Avg probability"} value={`${metrics.avg}%`} />
        <Metric label={ar ? "القيمة المتوقعة" : "Estimated value"} value={metrics.estimated ? metrics.estimated.toLocaleString() : "0"} />
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="grid min-w-[1180px] gap-3 lg:min-w-0 lg:grid-cols-6">
          {STAGE_ORDER.map((stage) => {
            const stageLeads = leadsFor(stage);
            const { icon: Icon, accent } = STAGES[stage];
            return <div key={stage} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className={`${accent} h-1`} />
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-black text-white"><Icon size={17} />{stageLabel(stage)}</h3>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">{stageLeads.length}</span>
                </div>
              </div>
              <div className="space-y-3 p-3">
                {stageLeads.length ? stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} ar={ar} onOpen={() => { setSelectedLead(lead); setSelectedStatus(normalizeStatus(lead.status)); setUpdateMessage(null); }} />) : <EmptyStage ar={ar} />}
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>

    {selectedLead && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <button onClick={closeModal} className={`absolute top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white ${ar ? "left-4" : "right-4"}`}><X size={20} /></button>
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-400">{ar ? "تفاصيل العميل" : "Lead Details"}</p>
        <h2 className="mt-2 pr-10 text-2xl font-black">{selectedLead.customers?.name || (ar ? "عميل غير معروف" : "Unknown customer")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_.7fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="font-bold text-slate-200">{ar ? "معلومات العميل" : "Customer Info"}</h3>
            <Info label={ar ? "الهاتف" : "Phone"} value={selectedLead.customers?.phone} />
            <Info label={ar ? "الإيميل" : "Email"} value={selectedLead.customers?.email} />
            <Info label={ar ? "الخدمة" : "Service"} value={selectedLead.service_type} />
            <Info label={ar ? "المدينة" : "City"} value={selectedLead.city} />
            <Info label={ar ? "عدد الأشخاص" : "People"} value={selectedLead.people_count?.toString()} />
            <Info label={ar ? "الموعد" : "Appointment"} value={selectedLead.appointment_date} />
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="font-bold text-slate-200">{ar ? "الحالة والنسبة" : "Status & Probability"}</h3>
            <Probability value={selectedLead.probability} />
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setUpdateMessage(null); }} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500">
              {STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
            </select>
            <button onClick={handleUpdateStatus} disabled={isUpdating || selectedStatus === normalizeStatus(selectedLead.status)} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500">{isUpdating ? (ar ? "جارٍ التحديث..." : "Updating...") : (ar ? "تحديث الحالة" : "Update Status")}</button>
            {updateMessage && <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${updateMessage.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{updateMessage.text}</div>}
            {whatsappUrl(selectedLead.customers?.phone) && <a href={whatsappUrl(selectedLead.customers?.phone)!} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500">{ar ? "فتح واتساب" : "Open WhatsApp"}</a>}
          </section>
        </div>
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="font-bold text-slate-200">{ar ? "المتابعة" : "Follow up"}</h3>
          <Info label={ar ? "الأولوية" : "Priority"} value={selectedLead.priority} />
          <Info label={ar ? "الخطوة القادمة" : "Next action"} value={selectedLead.next_action} />
          <Info label={ar ? "موعد المتابعة" : "Next follow-up"} value={fmtDate(selectedLead.next_follow_up_at)} />
          <Info label={ar ? "آخر تواصل" : "Last contact"} value={fmtDate(selectedLead.last_contact_at)} />
          <Info label={ar ? "المصدر" : "Source"} value={selectedLead.lead_source} />
          <Info label={ar ? "الوسوم" : "Tags"} value={selectedLead.tags?.join(", ")} />
          {selectedLead.notes && <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-300">{selectedLead.notes}</p>}
        </section>
      </div>
    </div>}
  </>;
}

function normalizeStatus(value?: string | null): StageKey {
  const status = String(value || "new").toLowerCase();
  return STAGE_ORDER.includes(status as StageKey) ? status as StageKey : "new";
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>;
}

function Probability({ value }: { value?: number | null }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  return <div className="mt-3"><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-slate-400"><Target size={13} />Probability</span><span className="font-bold text-cyan-300">{pct}%</span></div><div className="h-2.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} /></div></div>;
}

function LeadCard({ lead, ar, onOpen }: { lead: LeadData; ar: boolean; onOpen: () => void }) {
  const pct = typeof lead.probability === "number" ? Math.max(0, Math.min(100, lead.probability)) : 0;
  return <button onClick={onOpen} className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-start transition hover:border-cyan-500/40 hover:bg-slate-950">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-white">{lead.customers?.name || (ar ? "عميل غير معروف" : "Unknown")}</p><p className="mt-1 truncate text-xs text-slate-500">{lead.service_type || lead.title || (ar ? "طلب جديد" : "New request")}</p></div>{lead.priority && <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{lead.priority}</span>}</div>
    <div className="mt-3 grid gap-1.5 text-xs text-slate-400">
      {lead.customers?.phone && <span className="flex items-center gap-1 truncate"><Phone size={13} />{lead.customers.phone}</span>}
      {lead.city && <span className="flex items-center gap-1 truncate"><MapPin size={13} />{lead.city}</span>}
      {lead.people_count && <span className="flex items-center gap-1 truncate"><Users size={13} />{lead.people_count}</span>}
      {lead.appointment_date && <span className="flex items-center gap-1 truncate"><CalendarDays size={13} />{lead.appointment_date}</span>}
      {lead.interest_level && <span className="flex items-center gap-1 truncate text-amber-300"><Flame size={13} />{interestText(lead.interest_level)}</span>}
    </div>
    <div className="mt-3"><div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-slate-500">Probability</span><span className="font-bold text-cyan-300">{pct}%</span></div><div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} /></div></div>
    {lead.next_action && <p className="mt-3 line-clamp-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-xs leading-5 text-slate-300">{lead.next_action}</p>}
  </button>;
}

function interestText(value: string) { return value || "-"; }
function EmptyStage({ ar }: { ar: boolean }) { return <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-5 text-center"><Inbox size={26} className="text-slate-700" /><p className="mt-2 text-xs font-medium text-slate-500">{ar ? "لا يوجد عملاء هنا" : "No leads here"}</p></div>; }
function Info({ label, value }: { label: string; value?: string | null }) { return <div className="mt-3 flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className="max-w-[65%] text-end font-medium text-slate-200">{value || "-"}</span></div>; }
