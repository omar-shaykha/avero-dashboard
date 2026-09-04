"use client";

import { useState } from "react";

interface LeadData {
  id: string;
  title: string;
  service_type: string;
  status: string;
  interest_level: string;
  people_count: number | null;
  event_date: string | null;
  city: string | null;
  notes: string | null;
  updated_at: string;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

interface LeadPipelineProps {
  leads: LeadData[];
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "quotation", label: "Quotation" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STAGE_CONFIG: Record<string, { label: string; accentColor: string; bgColor: string }> = {
  new: { label: "New", accentColor: "bg-blue-500", bgColor: "bg-slate-800/30" },
  qualified: { label: "Qualified", accentColor: "bg-emerald-500", bgColor: "bg-slate-800/30" },
  quotation: { label: "Quotation", accentColor: "bg-amber-500", bgColor: "bg-slate-800/30" },
  negotiation: { label: "Negotiation", accentColor: "bg-purple-500", bgColor: "bg-slate-800/30" },
  won: { label: "Won", accentColor: "bg-green-500", bgColor: "bg-slate-800/30" },
  lost: { label: "Lost", accentColor: "bg-red-500", bgColor: "bg-slate-800/30" },
};

const INTEREST_CONFIG: Record<string, { badge: string; dot: string }> = {
  "High": { badge: "bg-red-900/40 text-red-300 border-red-700", dot: "bg-red-500" },
  "Medium": { badge: "bg-amber-900/40 text-amber-300 border-amber-700", dot: "bg-amber-500" },
  "Low": { badge: "bg-blue-900/40 text-blue-300 border-blue-700", dot: "bg-blue-500" },
};

export default function LeadPipeline({ leads: initialLeads }: LeadPipelineProps) {
  const [localLeads, setLocalLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const stages = [
    "new",
    "qualified",
    "quotation",
    "negotiation",
    "won",
    "lost",
  ];

  const getLeadsForStage = (stage: string) => {
    return localLeads?.filter(
      (lead) => (lead.status || "new").toLowerCase() === stage
    ) || [];
  };

  const closeModal = () => {
    setSelectedLead(null);
    setSelectedStatus("");
    setUpdateMessage(null);
  };

  const getWhatsAppUrl = (phone: string | null | undefined) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone ? `https://wa.me/${cleanPhone}` : null;
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setUpdateMessage(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedLead || !selectedStatus) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const response = await fetch(
        `/api/leads/${selectedLead.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Update local leads state
      setLocalLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? { ...lead, status: selectedStatus }
            : lead
        )
      );

      // Update selected lead
      setSelectedLead((current) =>
        current ? { ...current, status: selectedStatus } : current
      );

      setUpdateMessage({
        type: "success",
        text: "Status updated",
      });

      // Clear selection after success
      setSelectedStatus("");
    } catch (error) {
      console.error("Error updating status:", error);
      setUpdateMessage({
        type: "error",
        text: "Failed to update status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Sales Pipeline */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Sales Pipeline</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lead progression across the AVERO AI sales process
          </p>
        </div>

        {/* Desktop Grid: 6 columns on lg+, scrolling on smaller screens */}
        <div className="overflow-x-auto rounded-lg lg:overflow-visible">
          <div className="grid gap-3 pb-2 lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2 min-w-max lg:min-w-0">
            {stages.map((stage) => {
              const stageLeads = getLeadsForStage(stage);
              const config = STAGE_CONFIG[stage];
              
              return (
                <div
                  key={stage}
                  className="w-[280px] lg:w-auto flex flex-col rounded-lg border border-slate-700 bg-slate-900 overflow-hidden"
                >
                  {/* Stage Header with Accent Line */}
                  <div className={`${config.accentColor} h-1`} />
                  <div className="px-4 py-3 border-b border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-white capitalize">
                        {config.label}
                      </h3>
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Lead Cards */}
                  <div className="flex flex-col gap-2 p-3">
                    {stageLeads.length > 0 ? (
                      stageLeads.map((lead) => {
                        const interestConfig = INTEREST_CONFIG[lead.interest_level] || 
                          { badge: "bg-slate-800/40 text-slate-300 border-slate-700", dot: "bg-slate-500" };
                        
                        return (
                          <button
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setSelectedStatus(lead.status || "new");
                            }}
                            className="group relative w-full text-left rounded-lg border border-slate-700 bg-slate-800 p-3 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            {/* Customer Name */}
                            <p className="font-medium text-white text-sm truncate">
                              {lead.customers?.name || "Unknown"}
                            </p>

                            {/* Time since update */}
                            {lead.updated_at && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {(() => {
                                  const date = new Date(lead.updated_at);
                                  const now = new Date();
                                  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                  if (days === 0) return "Today";
                                  if (days === 1) return "Yesterday";
                                  return `${days}d ago`;
                                })()}
                              </p>
                            )}

                            {/* Phone */}
                            {lead.customers?.phone && (
                              <p className="mt-1.5 text-xs text-slate-300 truncate">
                                📞 {lead.customers.phone}
                              </p>
                            )}

                            {/* Service + City */}
                            {(lead.service_type || lead.city) && (
                              <div className="mt-1.5 flex items-center justify-between gap-1 text-xs text-slate-400">
                                {lead.service_type && (
                                  <span className="truncate">📋 {lead.service_type}</span>
                                )}
                                {lead.city && (
                                  <span className="truncate text-right">📍 {lead.city}</span>
                                )}
                              </div>
                            )}

                            {/* People Count + Event Date */}
                            {(lead.people_count || lead.event_date) && (
                              <div className="mt-1.5 flex items-center justify-between gap-1 text-xs text-slate-400">
                                {lead.people_count && (
                                  <span>👥 {lead.people_count}</span>
                                )}
                                {lead.event_date && (
                                  <span className="truncate text-right">📅 {lead.event_date}</span>
                                )}
                              </div>
                            )}

                            {/* Interest Badge */}
                            {lead.interest_level && (
                              <div className="mt-2 flex items-center gap-1">
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${interestConfig.badge}`}>
                                  <span className={`h-1 w-1 rounded-full ${interestConfig.dot}`} />
                                  {lead.interest_level}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <div className="text-2xl">📭</div>
                        <p className="text-xs font-medium text-slate-400">No leads</p>
                        <p className="text-xs text-slate-500">Leads in this stage will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <h2 className="pr-8 text-2xl font-bold">Lead Details</h2>

            {/* Customer Information Section */}
            <div className="mt-6 border-t border-slate-700 pt-6">
              <h3 className="font-semibold text-slate-200">
                Customer Information
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Name</span>
                  <span className="text-right font-medium">
                    {selectedLead.customers?.name || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Phone</span>
                  <span className="text-right font-medium">
                    {selectedLead.customers?.phone || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Email</span>
                  <span className="break-all text-right font-medium">
                    {selectedLead.customers?.email || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp Button */}
            {(() => {
              const whatsappUrl = getWhatsAppUrl(selectedLead.customers?.phone);
              return (
                <div className="mt-6">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.807-.923-1.346-1.923-1.518-2.394-.149-.353-.047-.645.106-.845.148-.176.381-.453.595-.689.206-.224.413-.565.413-1.032 0-.467-.165-.945-.679-1.374-.167-.153-1.432-1.323-1.432-1.323s-.809-.656-1.414-.656c-.738 0-1.413.656-1.414 1.378 0 .849.5 1.735 1.165 2.827.562 1.003 2.282 3.989 5.323 5.387.569.2 1.462.342 2.817.342.96 0 1.68-.196 2.008-.359 0 0 .932-.519 1.846-1.794.563-.796.96-1.47 1.195-2.094.188-.52.261-.87-.049-1.585-.269-.606-.995-1.541-2.337-1.541-.772 0-1.196.593-1.738 1.154z" />
                      </svg>
                      Open WhatsApp
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 font-medium text-slate-500 cursor-not-allowed opacity-50"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.807-.923-1.346-1.923-1.518-2.394-.149-.353-.047-.645.106-.845.148-.176.381-.453.595-.689.206-.224.413-.565.413-1.032 0-.467-.165-.945-.679-1.374-.167-.153-1.432-1.323-1.432-1.323s-.809-.656-1.414-.656c-.738 0-1.413.656-1.414 1.378 0 .849.5 1.735 1.165 2.827.562 1.003 2.282 3.989 5.323 5.387.569.2 1.462.342 2.817.342.96 0 1.68-.196 2.008-.359 0 0 .932-.519 1.846-1.794.563-.796.96-1.47 1.195-2.094.188-.52.261-.87-.049-1.585-.269-.606-.995-1.541-2.337-1.541-.772 0-1.196.593-1.738 1.154z" />
                      </svg>
                      Open WhatsApp
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Status Update Section */}
            <div className="mt-6 border-t border-slate-700 pt-6">
              <h3 className="font-semibold text-slate-200">Update Status</h3>
              <div className="mt-4 space-y-3">
                <select
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleUpdateStatus}
                  disabled={
                    isUpdating || selectedStatus === (selectedLead.status || "new")
                  }
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {isUpdating ? "Updating..." : "Update Status"}
                </button>

                {updateMessage && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      updateMessage.type === "success"
                        ? "bg-green-900 text-green-200"
                        : "bg-red-900 text-red-200"
                    }`}
                  >
                    {updateMessage.text}
                  </div>
                )}
              </div>
            </div>

            {/* Lead Information Section */}
            <div className="mt-6 border-t border-slate-700 pt-6">
              <h3 className="font-semibold text-slate-200">Lead Information</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Title</span>
                  <span className="text-right font-medium">
                    {selectedLead.title || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Service</span>
                  <span className="text-right font-medium">
                    {selectedLead.service_type || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">City</span>
                  <span className="text-right font-medium">
                    {selectedLead.city || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">People Count</span>
                  <span className="text-right font-medium">
                    {selectedLead.people_count ?? "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Event Date</span>
                  <span className="text-right font-medium">
                    {selectedLead.event_date || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Interest Level</span>
                  <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium border ${INTEREST_CONFIG[selectedLead.interest_level]?.badge || "bg-slate-800/40 text-slate-300 border-slate-700"}`}>
                    {selectedLead.interest_level || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-400">Current Status</span>
                  <span className="inline-block rounded-md bg-slate-800 px-2 py-1 text-xs font-medium capitalize">
                    {selectedLead.status || "new"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {selectedLead.notes && (
              <div className="mt-6 border-t border-slate-700 pt-6">
                <h3 className="font-semibold text-slate-200">Notes</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Updated At */}
            <div className="mt-6 border-t border-slate-700 pt-4">
              <p className="text-xs text-slate-500">
                Last updated: {new Date(selectedLead.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
