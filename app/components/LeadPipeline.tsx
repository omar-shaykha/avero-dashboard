"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import {
  Inbox, BadgeCheck, FileText, Handshake, Trophy, CircleX, Phone,
  ClipboardList, MapPin, Users, CalendarDays, Flame, X, type LucideIcon,
} from "lucide-react";

export interface LeadData {
  id: string; title: string; service_type: string; status: string; interest_level: string;
  people_count: number | null; event_date: string | null; city: string | null;
  notes: string | null; updated_at: string;
  customers: { name: string; phone: string | null; email: string | null } | null;
}

interface LeadPipelineProps { leads: LeadData[]; }

const STAGES: Record<string, { icon: LucideIcon; accent: string }> = {
  new: { icon: Inbox, accent: "bg-blue-500" },
  qualified: { icon: BadgeCheck, accent: "bg-emerald-500" },
  quotation: { icon: FileText, accent: "bg-amber-500" },
  negotiation: { icon: Handshake, accent: "bg-purple-500" },
  won: { icon: Trophy, accent: "bg-green-500" },
  lost: { icon: CircleX, accent: "bg-red-500" },
};

const INTEREST_CONFIG: Record<string, string> = {
  High: "bg-red-900/40 text-red-300 border-red-700",
  Medium: "bg-amber-900/40 text-amber-300 border-amber-700",
  Low: "bg-blue-900/40 text-blue-300 border-blue-700",
};

export default function LeadPipeline({ leads: initialLeads }: LeadPipelineProps) {
  const { t, language } = useLanguage();
  const [localLeads, setLocalLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stageLabel = (stage: string) => t(stage === "quotation" ? "quotation" : stage === "negotiation" ? "negotiation" : stage);
  const interestLabel = (value: string) => value ? t(value.toLowerCase()) : "-";
  const leadsFor = (stage: string) => localLeads.filter((lead) => (lead.status || "new").toLowerCase() === stage);

  const relativeDate = (value: string) => {
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
    if (days <= 0) return t("today");
    if (days === 1) return t("yesterday");
    return language === "ar" ? `منذ ${days} أيام` : `${days} ${t("daysAgo")}`;
  };

  const closeModal = () => { setSelectedLead(null); setSelectedStatus(""); setUpdateMessage(null); };
  const whatsappUrl = (phone?: string | null) => phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;

  const handleUpdateStatus = async () => {
    if (!selectedLead || !selectedStatus) return;
    setIsUpdating(true); setUpdateMessage(null);
    try {
      const response = await fetch(`/api/leads/${selectedLead.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: selectedStatus }),
      });
      if (!response.ok) throw new Error("update failed");
      setLocalLeads((current) => current.map((lead) => lead.id === selectedLead.id ? { ...lead, status: selectedStatus } : lead));
      setSelectedLead((current) => current ? { ...current, status: selectedStatus } : current);
      setUpdateMessage({ type: "success", text: t("statusUpdated") });
    } catch {
      setUpdateMessage({ type: "error", text: t("statusUpdateFailed") });
    } finally { setIsUpdating(false); }
  };

  return (
    <>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">{t("salesPipeline")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("salesPipelineDesc")}</p>
        </div>

        <div className="overflow-x-auto rounded-lg lg:overflow-visible">
          <div className="grid min-w-max gap-3 pb-2 sm:grid-cols-2 md:grid-cols-3 lg:min-w-0 lg:grid-cols-6">
            {Object.keys(STAGES).map((stage) => {
              const stageLeads = leadsFor(stage);
              const { icon: Icon, accent } = STAGES[stage];
              return (
                <div key={stage} className="flex w-[280px] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 lg:w-auto">
                  <div className={`${accent} h-1`} />
                  <div className="border-b border-slate-700 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-semibold text-white"><Icon size={18}/>{stageLabel(stage)}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">{stageLeads.length}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    {stageLeads.length ? stageLeads.map((lead) => (
                      <button key={lead.id} onClick={() => { setSelectedLead(lead); setSelectedStatus(lead.status || "new"); setUpdateMessage(null); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-start transition hover:border-slate-600 hover:bg-slate-800/80">
                        <p className="truncate text-sm font-medium text-white">{lead.customers?.name || t("unknown")}</p>
                        {lead.updated_at && <p className="mt-0.5 text-xs text-slate-400">{relativeDate(lead.updated_at)}</p>}
                        {lead.customers?.phone && <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-slate-300"><Phone size={13}/>{lead.customers.phone}</p>}
                        {(lead.service_type || lead.city) && <div className="mt-1.5 flex items-center justify-between gap-1 text-xs text-slate-400">
                          {lead.service_type && <span className="flex items-center gap-1 truncate"><ClipboardList size={13}/>{lead.service_type}</span>}
                          {lead.city && <span className="flex items-center gap-1 truncate"><MapPin size={13}/>{lead.city}</span>}
                        </div>}
                        {(lead.people_count || lead.event_date) && <div className="mt-1.5 flex items-center justify-between gap-1 text-xs text-slate-400">
                          {lead.people_count && <span className="flex items-center gap-1"><Users size={13}/>{lead.people_count}</span>}
                          {lead.event_date && <span className="flex items-center gap-1 truncate"><CalendarDays size={13}/>{lead.event_date}</span>}
                        </div>}
                        {lead.interest_level && <div className="mt-2"><span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${INTEREST_CONFIG[lead.interest_level] || "border-slate-700 bg-slate-800 text-slate-300"}`}><Flame size={12}/>{interestLabel(lead.interest_level)}</span></div>}
                      </button>
                    )) : <div className="flex flex-col items-center justify-center gap-2 py-12 text-center"><Inbox size={32} className="text-slate-600"/><p className="text-xs font-medium text-slate-400">{t("noLeads")}</p><p className="text-xs text-slate-500">{t("noLeadsStage")}</p></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className={`absolute top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white ${language === "ar" ? "left-4" : "right-4"}`} aria-label={t("close")}><X size={20}/></button>
            <h2 className="text-2xl font-bold">{t("leadDetails")}</h2>

            <Section title={t("customerInfo")}>
              <Info label={t("name")} value={selectedLead.customers?.name}/>
              <Info label={t("phone")} value={selectedLead.customers?.phone}/>
              <Info label={t("email")} value={selectedLead.customers?.email}/>
            </Section>

            <div className="mt-6">
              {whatsappUrl(selectedLead.customers?.phone) ? <a href={whatsappUrl(selectedLead.customers?.phone)!} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700">{t("openWhatsapp")}</a> : <button disabled className="w-full rounded-lg bg-slate-800 px-4 py-3 text-slate-500">{t("openWhatsapp")}</button>}
            </div>

            <Section title={t("updateStatus")}>
              <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setUpdateMessage(null); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white">
                {Object.keys(STAGES).map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
              </select>
              <button onClick={handleUpdateStatus} disabled={isUpdating || selectedStatus === (selectedLead.status || "new")} className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500">{isUpdating ? t("updating") : t("updateStatus")}</button>
              {updateMessage && <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${updateMessage.type === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>{updateMessage.text}</div>}
            </Section>

            <Section title={t("leadInfo")}>
              <Info label={t("title")} value={selectedLead.title}/>
              <Info label={t("service")} value={selectedLead.service_type}/>
              <Info label={t("city")} value={selectedLead.city}/>
              <Info label={t("peopleCount")} value={selectedLead.people_count?.toString()}/>
              <Info label={t("eventDate")} value={selectedLead.event_date}/>
              <Info label={t("interestLevel")} value={interestLabel(selectedLead.interest_level)}/>
              <Info label={t("currentStatus")} value={stageLabel(selectedLead.status || "new")}/>
            </Section>

            {selectedLead.notes && <Section title={t("notes")}><p className="text-sm text-slate-300">{selectedLead.notes}</p></Section>}
            <div className="mt-6 border-t border-slate-700 pt-4 text-xs text-slate-500">{t("lastUpdated")}: {new Date(selectedLead.updated_at).toLocaleString(language === "ar" ? "ar-SA" : "en-SA")}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6 border-t border-slate-700 pt-6"><h3 className="font-semibold text-slate-200">{title}</h3><div className="mt-4 space-y-3">{children}</div></div>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-sm text-slate-400">{label}</span><span className="text-end font-medium">{value || "-"}</span></div>;
}
