"use client";

import { useState } from "react";

interface AddClientModalProps {
  onClose: () => void;
  onSubmit: (data: {
    companyName: string;
    whatsappPhoneNumberId: string;
    adminEmail: string;
  }) => Promise<void>;
}

export default function AddClientModal({ onClose, onSubmit }: AddClientModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (!adminEmail.trim()) {
      setError("Admin email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        companyName: companyName.trim(),
        whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
        adminEmail: adminEmail.trim(),
      });
    } catch (err) {
      setError("Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Add Client</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Acme Corp"
              disabled={loading}
            />
          </div>

          {/* WhatsApp Phone Number ID */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              WhatsApp Phone Number ID
            </label>
            <input
              type="text"
              value={whatsappPhoneNumberId}
              onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 1234567890"
              disabled={loading}
            />
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Admin Email *
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., admin@acme.com"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">
              User must already have a login account
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}