"use client";

import { useState } from "react";

interface SearchToolbarProps {
  onSearchChange?: (value: string) => void;
  onStatusFilter?: (status: string) => void;
  onCityFilter?: (city: string) => void;
  onDateRangeChange?: (range: string) => void;
}

export default function SearchToolbar({
  onSearchChange,
  onStatusFilter,
  onCityFilter,
  onDateRangeChange,
}: SearchToolbarProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearchChange?.(value);
  };

  return (
    <div className="px-6 py-4 flex gap-4 items-center flex-wrap bg-slate-900/30 border-b border-slate-800">
      <div className="flex-1 min-w-[300px]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search leads by name, phone, service, or location..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>
      </div>

      <select
        onChange={(e) => onStatusFilter?.(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="qualified">Qualified</option>
        <option value="quotation">Quotation</option>
        <option value="negotiation">Negotiation</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      <select
        onChange={(e) => onCityFilter?.(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <option value="">All Cities</option>
      </select>

      <select
        onChange={(e) => onDateRangeChange?.(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <option value="30">Last 30 days</option>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="90">Last 90 days</option>
      </select>

      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
        <span>+</span> Add Lead
      </button>
    </div>
  );
}
