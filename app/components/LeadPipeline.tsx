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

export default function LeadPipeline({ leads }: LeadPipelineProps) {
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

  const stages = [
    "new",
    "qualified",
    "quotation",
    "negotiation",
    "won",
    "lost",
  ];

  const getLeadsForStage = (stage: string) => {
    return leads?.filter(
      (lead) => (lead.status || "new").toLowerCase() === stage
    ) || [];
  };

  const closeModal = () => {
    setSelectedLead(null);
  };

  const getWhatsAppUrl = (phone: string | null | undefined) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone ? `https://wa.me/${cleanPhone}` : null;
  };

  return (
    <>
      {/* Sales Pipeline */}
      <div className="mt-12">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">Sales Pipeline</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Lead progression across the AVERO AI sales process
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4">
            {stages.map((stage) => {
              const stageLeads = getLeadsForStage(stage);
              return (
                <div
                  key={stage}
                  className="min-w-[240px] rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  {/* Stage Header */}
                  <div className="mb-4 border-b border-zinc-800 pb-3">
                    <h3 className="font-semibold capitalize">
                      {stage} ({stageLeads.length})
                    </h3>
                  </div>

                  {/* Lead Cards */}
                  <div className="flex flex-col gap-3">
                    {stageLeads.length > 0 ? (
                      stageLeads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left text-xs transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                        >
                          {/* Customer Name */}
                          <p className="font-medium text-white">
                            {lead.customers?.name || "Unknown"}
                          </p>

                          {/* Phone */}
                          <p className="mt-1 text-zinc-400">
                            {lead.customers?.phone || "-"}
                          </p>

                          {/* Service */}
                          <p className="text-zinc-400">
                            {lead.service_type || "-"}
                          </p>

                          {/* City */}
                          <p className="text-zinc-400">
                            {lead.city || "-"}
                          </p>

                          {/* People Count */}
                          <p className="text-zinc-400">
                            People: {lead.people_count ?? "-"}
                          </p>

                          {/* Interest Badge */}
                          <div className="mt-2">
                            <span className="inline-block rounded-full border border-zinc-600 px-2 py-1 text-xs text-zinc-300">
                              {lead.interest_level || "-"}
                            </span>
                          </div>

                          {/* Event Date */}
                          <p className="mt-2 text-zinc-500">
                            {lead.event_date || "-"}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-zinc-500">No leads</p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <h3 className="font-semibold text-zinc-200">
                Customer Information
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Name</span>
                  <span className="text-right font-medium">
                    {selectedLead.customers?.name || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Phone</span>
                  <span className="text-right font-medium">
                    {selectedLead.customers?.phone || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Email</span>
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
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 13.795c.326.842.603 1.487.928 2.595l.6 1.894 1.994-.51c1.457.363 2.92.37 4.511-.07 5.823-1.604 9.376-7.099 8.856-13.072-.52-5.973-5.354-10.439-11.139-10.239z" />
                      </svg>
                      Open WhatsApp
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 font-medium text-zinc-500 cursor-not-allowed opacity-50"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 13.795c.326.842.603 1.487.928 2.595l.6 1.894 1.994-.51c1.457.363 2.92.37 4.511-.07 5.823-1.604 9.376-7.099 8.856-13.072-.52-5.973-5.354-10.439-11.139-10.239z" />
                      </svg>
                      Open WhatsApp
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Lead Information Section */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <h3 className="font-semibold text-zinc-200">Lead Information</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Title</span>
                  <span className="text-right font-medium">
                    {selectedLead.title || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Service</span>
                  <span className="text-right font-medium">
                    {selectedLead.service_type || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">City</span>
                  <span className="text-right font-medium">
                    {selectedLead.city || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">People Count</span>
                  <span className="text-right font-medium">
                    {selectedLead.people_count ?? "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Event Date</span>
                  <span className="text-right font-medium">
                    {selectedLead.event_date || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Interest Level</span>
                  <span className="inline-block rounded-full border border-zinc-600 px-2 py-1 text-xs font-medium text-zinc-300">
                    {selectedLead.interest_level || "-"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-zinc-400">Status</span>
                  <span className="inline-block rounded-full bg-zinc-800 px-2 py-1 text-xs font-medium capitalize">
                    {selectedLead.status || "new"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {selectedLead.notes && (
              <div className="mt-6 border-t border-zinc-800 pt-6">
                <h3 className="font-semibold text-zinc-200">Notes</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Updated At */}
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-500">
                Last updated: {new Date(selectedLead.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
