"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ClientsTable from "@/app/components/ClientsTable";
import AddClientModal from "@/app/components/AddClientModal";

interface Company {
  id: string;
  name: string;
  whatsapp_phone_number_id?: string;
  created_at: string;
}

interface User {
  id: string;
  email?: string;
}

const AVERO_INTERNAL_ID = "9fbdd617-fdc4-4c1d-b16b-b1d3118bf3d9";

export default function ClientsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    const checkAccessAndLoadClients = async () => {
      try {
        // Fetch current user
        const userRes = await fetch("/api/auth/user");
        if (!userRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

        // Fetch user profile to check company and role
        const profileRes = await fetch("/api/auth/profile");
        if (!profileRes.ok) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const profileData = await profileRes.json();

        // Check both company_id AND role
        if (profileData.company_id !== AVERO_INTERNAL_ID || profileData.role !== "admin") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setUserName(profileData.name || userData.email?.split("@")[0] || "");

        // Load companies
        const companiesRes = await fetch("/api/clients");
        if (!companiesRes.ok) {
          console.error("Failed to load companies");
          setLoading(false);
          return;
        }

        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading clients page:", error);
        setAccessDenied(true);
        setLoading(false);
      }
    };

    checkAccessAndLoadClients();
  }, [router]);

  const handleAddClient = async (formData: {
    companyName: string;
    adminEmail: string;
    temporaryPassword: string;
    whatsappPhoneNumberId: string;
  }) => {
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: formData.companyName.trim(),
          admin_email: formData.adminEmail.trim(),
          temporary_password: formData.temporaryPassword.trim(),
          whatsapp_phone_number_id: formData.whatsappPhoneNumberId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(`Conflict: ${data.error || "Unable to create client"}`);
        } else if (response.status === 400) {
          alert(`Invalid input: ${data.error || "Please check your entries"}`);
        } else {
          alert(`Error: ${data.error || "Failed to create client"}`);
        }
        return;
      }

      // Success
      setSuccessMessage("Client created successfully!");
      setShowModal(false);

      // Refresh companies list
      const companiesRes = await fetch("/api/clients");
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creating client:", error);
      alert("An error occurred. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar userEmail={user?.email} userName={userName} />
        <div className="ml-64 flex flex-col min-h-screen">
          <DashboardHeader userEmail={user?.email} userName={userName} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar userEmail={user?.email} userName={userName} />
        <div className="ml-64 flex flex-col min-h-screen">
          <DashboardHeader userEmail={user?.email} userName={userName} />
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-6">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 4v2M6.343 17.657a8 8 0 1111.314 0M9 11a3 3 0 116 0 3 3 0 01-6 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-slate-400">
                You do not have permission to access the Clients page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user?.email} userName={userName} />
      <div className="ml-64 flex flex-col min-h-screen">
        <DashboardHeader userEmail={user?.email} userName={userName} />

        {/* Main Content */}
        <div className="flex-1 px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Clients</h1>
              <p className="text-slate-400 mt-1">Manage company accounts</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Client
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400">{successMessage}</p>
            </div>
          )}

          {/* Clients Table */}
          <ClientsTable companies={companies} />
        </div>

        {/* Add Client Modal */}
        {showModal && (
          <AddClientModal
            onClose={() => setShowModal(false)}
            onSubmit={handleAddClient}
          />
        )}
      </div>
    </div>
  );
}
