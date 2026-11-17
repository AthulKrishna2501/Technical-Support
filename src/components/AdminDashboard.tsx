"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TicketType = "tech" | "project";
type TicketStatus = "pending" | "in_progress" | "resolved";
type AvgRange = "all" | "this_week" | "last_week" | "last_month" | "custom";

interface SupportTicket {
  id: string;
  row?: number;
  sheetName?: string;
  endpointUrl?: string;
  type: TicketType;
  timestamp: string;
  name: string;
  email: string;
  contact: string;
  batch: string;
  domain: string;
  module?: string;
  projectType?: string;
  description: string;
  audioUrl?: string;
  audioDataUrl?: string;
  status: TicketStatus;
  resolvedAt?: string;
  ageLabel?: string;
  urgencyLabel?: string;
  urgencyTone?: "error" | "warning" | "success";
}

function formatWaPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeStatus(raw?: string): TicketStatus {
  const s = (raw || "").toLowerCase();
  if (s === "in_progress" || s === "resolved") return s;
  return "pending";
}

function parseTicketTime(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+at\s+/i, " ");
  const ms = Date.parse(cleaned);
  return Number.isNaN(ms) ? null : ms;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

const PAGE_SIZE = 10;
const STATUS_STORAGE_KEY = "admin_ticket_overrides_v1";

type StatusOverrideMap = Record<
  string,
  { status: TicketStatus; resolvedAt?: string }
>;

function readStoredOverrides(): StatusOverrideMap {
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatusOverrideMap) : {};
  } catch {
    return {};
  }
}

function saveStoredOverride(
  id: string,
  status: TicketStatus,
  resolvedAt?: string
) {
  try {
    const current = readStoredOverrides();
    current[id] = { status, resolvedAt };
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

function applyOverrides(list: SupportTicket[]): SupportTicket[] {
  const overrides = readStoredOverrides();
  return list.map((t) => {
    const ov = overrides[t.id];
    if (!ov) return t;
    return {
      ...t,
      status: ov.status,
      resolvedAt: ov.resolvedAt ?? t.resolvedAt,
    };
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filter, setFilter] = useState<"all" | TicketType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [avgRange, setAvgRange] = useState<AvgRange>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<TicketStatus>("pending");
  const [statusSaved, setStatusSaved] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchLiveTickets = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/tickets", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok || !Array.isArray(json.tickets)) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const mapped = (json.tickets as SupportTicket[]).map((t) => ({
        ...t,
        audioUrl: t.audioDataUrl || t.audioUrl,
        status: normalizeStatus(t.status),
        ageLabel: new Date(t.timestamp).toLocaleString() || t.timestamp,
        urgencyLabel:
          t.status === "resolved"
            ? "Resolved"
            : t.type === "tech"
            ? "Tech Ticket"
            : "Project Ticket",
        urgencyTone: (t.status === "resolved"
          ? "success"
          : t.type === "tech"
          ? "warning"
          : "success") as "error" | "warning" | "success",
      }));

      setTickets(mapped);
      setSelectedId((prev) =>
        mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || ""
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load Google Sheet data.";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTickets();
  }, [fetchLiveTickets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter]);

  const filteredTickets = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        t.id,
        t.name,
        t.email,
        t.batch,
        t.domain,
        t.module || "",
        t.projectType || "",
        t.description,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tickets, filter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, safePage]);

  const selectedTicket = useMemo(
    () =>
      tickets.find((t) => t.id === selectedId) ||
      filteredTickets[0] ||
      tickets[0],
    [tickets, filteredTickets, selectedId]
  );

  useEffect(() => {
    if (selectedTicket) {
      setDraftStatus(selectedTicket.status);
    }
  }, [selectedTicket]);

  const stats = useMemo(() => {
    const pending = tickets.filter((t) => t.status !== "resolved").length;
    const techCount = tickets.filter((t) => t.type === "tech").length;
    const projectCount = tickets.filter((t) => t.type === "project").length;
    const audioCount = tickets.filter((t) => Boolean(t.audioUrl)).length;

    // Date range bounds for Resolved / Avg Time
    const now = new Date();
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    if (avgRange === "this_week") {
      const day = now.getDay(); // 0 = Sun, 1 = Mon
      const diffToMon = day === 0 ? 6 : day - 1;
      const mon = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diffToMon,
        0,
        0,
        0,
        0
      );
      rangeStart = mon.getTime();
      rangeEnd = now.getTime();
    } else if (avgRange === "last_week") {
      const day = now.getDay();
      const diffToMon = day === 0 ? 6 : day - 1;
      const thisMon = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diffToMon,
        0,
        0,
        0,
        0
      );
      const lastMon = new Date(thisMon);
      lastMon.setDate(thisMon.getDate() - 7);
      rangeStart = lastMon.getTime();
      rangeEnd = thisMon.getTime() - 1;
    } else if (avgRange === "last_month") {
      const firstOfThisMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
      const firstOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0
      );
      rangeStart = firstOfLastMonth.getTime();
      rangeEnd = firstOfThisMonth.getTime() - 1;
    } else if (avgRange === "custom") {
      if (customStart) {
        rangeStart = new Date(`${customStart}T00:00:00`).getTime();
      }
      if (customEnd) {
        rangeEnd = new Date(`${customEnd}T23:59:59.999`).getTime();
      }
    }

    const resolvedInRange = tickets.filter((t) => {
      if (t.status !== "resolved") return false;
      if (rangeStart === null && rangeEnd === null) return true;
      const refTime =
        parseTicketTime(t.resolvedAt) ?? parseTicketTime(t.timestamp);
      if (refTime === null) return false;
      if (rangeStart !== null && refTime < rangeStart) return false;
      if (rangeEnd !== null && refTime > rangeEnd) return false;
      return true;
    });

    const resolvedCount = resolvedInRange.length;

    const durationsMin: number[] = [];
    for (const t of resolvedInRange) {
      const start = parseTicketTime(t.timestamp);
      const end = parseTicketTime(t.resolvedAt);
      if (start !== null && end !== null && end >= start) {
        durationsMin.push((end - start) / 60000);
      }
    }

    const avgResolutionLabel =
      durationsMin.length > 0
        ? formatDuration(
            durationsMin.reduce((a, b) => a + b, 0) / durationsMin.length
          )
        : "—";

    return {
      pending,
      techCount,
      projectCount,
      resolvedCount,
      audioCount,
      avgResolutionLabel,
    };
  }, [tickets, avgRange, customStart, customEnd]);

  const handleUpdateStatus = async () => {
    if (!selectedTicket || updatingStatus) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTicket.id, status: draftStatus }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.ticket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  status: json.ticket.status,
                  resolvedAt: json.ticket.resolvedAt,
                }
              : t
          )
        );
      }
    } catch {
      // ignore network error
    }

    setUpdatingStatus(false);
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 1800);
  };

  return (
    <div className="min-h-screen bg-light-surface text-light-on-surface font-body antialiased flex flex-col">
      {/* Admin Top Navigation Bar */}
      <header className="bg-light-surface-card border-b border-light-outline/70 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">
                admin_panel_settings
              </span>
            </div>
            <h1 className="font-headline text-headline-sm text-light-on-surface font-bold tracking-tight">
              Technical Support
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-DEFAULT border border-light-outline bg-light-surface hover:bg-light-surface-card text-light-on-surface font-label text-label-md transition-colors"
              title="Open Public Student Portal"
            >
              <span className="material-symbols-outlined text-[16px]">
                open_in_new
              </span>
              <span className="hidden sm:inline">Student View</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-light-outline/80">
              <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-label-md">
                AD
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/admin/logout", { method: "POST" });
                  router.refresh();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-DEFAULT text-light-on-surface-muted hover:text-error hover:bg-error/10 font-label text-label-md transition-colors cursor-pointer"
                title="Sign out"
              >
                <span className="material-symbols-outlined text-[16px]">
                  logout
                </span>
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Resolution Time Period Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 id="metrics-heading" className="font-headline text-headline-sm text-light-on-surface font-semibold">
            Overview
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center p-1 rounded-DEFAULT bg-light-surface-card border border-light-outline/70 gap-1 flex-wrap"
              role="group"
              aria-label="Resolution time period"
            >
              {(
                [
                  { key: "all", label: "All Time" },
                  { key: "this_week", label: "This Week" },
                  { key: "last_week", label: "Last Week" },
                  { key: "last_month", label: "Last Month" },
                  { key: "custom", label: "Custom" },
                ] as const
              ).map((item) => {
                const active = avgRange === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAvgRange(item.key)}
                    className={`px-2.5 py-1 rounded-sm font-label text-label-md transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-on-primary font-semibold"
                        : "text-light-on-surface-muted hover:text-light-on-surface hover:bg-light-surface"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {avgRange === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  aria-label="Custom start date"
                  className="h-9 px-2.5 rounded-DEFAULT border border-light-outline bg-light-surface-card text-body-sm text-light-on-surface focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <span className="text-body-sm text-light-on-surface-muted">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  aria-label="Custom end date"
                  className="h-9 px-2.5 rounded-DEFAULT border border-light-outline bg-light-surface-card text-body-sm text-light-on-surface focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Top Stats Row */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
          aria-labelledby="metrics-heading"
        >

          <div className="p-5 rounded-lg bg-light-surface-card border border-light-outline/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-body text-body-sm text-light-on-surface-muted block">
                Pending Attention
              </span>
              <span className="font-headline text-headline-lg text-light-on-surface font-bold mt-1 block">
                {stats.pending}
              </span>
              <span className="font-body text-body-sm text-error flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                Support exceeded 1 hr
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                hourglass_top
              </span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-light-surface-card border border-light-outline/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-body text-body-sm text-light-on-surface-muted block">
                Technical Support
              </span>
              <span className="font-headline text-headline-lg text-primary font-bold mt-1 block">
                {stats.techCount}
              </span>
              <span className="font-body text-body-sm text-light-on-surface-muted mt-1 block">
                {stats.audioCount} with voice notes
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                terminal
              </span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-light-surface-card border border-light-outline/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-body text-body-sm text-light-on-surface-muted block">
                Project Support
              </span>
              <span className="font-headline text-headline-lg text-secondary font-bold mt-1 block">
                {stats.projectCount}
              </span>
              <span className="font-body text-body-sm text-light-on-surface-muted mt-1 block">
                First / Second projects
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                assignment_turned_in
              </span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-light-surface-card border border-light-outline/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-body text-body-sm text-light-on-surface-muted block">
                Resolved
              </span>
              <span className="font-headline text-headline-lg text-success font-bold mt-1 block">
                {stats.resolvedCount}
              </span>
              <span className="font-body text-body-sm text-success flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">
                  trending_up
                </span>
                Avg time: {stats.avgResolutionLabel}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                check_circle
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <div className="bg-light-surface-card p-4 rounded-lg border border-light-outline/70 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 flex-wrap"
            role="tablist"
            aria-label="Ticket Filter"
          >
            {(
              [
                { key: "all", label: `All Tickets (${tickets.length})` },
                { key: "tech", label: `Technical (${stats.techCount})` },
                {
                  key: "project",
                  label: `Project Support (${stats.projectCount})`,
                },
              ] as const
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-DEFAULT font-label text-label-md transition-colors cursor-pointer ${
                    active
                      ? "bg-primary text-on-primary font-semibold"
                      : "bg-light-surface text-light-on-surface-muted hover:text-light-on-surface border border-light-outline"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | TicketStatus)
              }
              aria-label="Filter by status"
              className="h-10 pl-3 pr-8 rounded-DEFAULT border border-light-outline bg-light-surface text-light-on-surface font-label text-label-md focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-light-on-surface-muted">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, batch, ticket..."
                className="w-full h-10 pl-9 pr-9 rounded-DEFAULT border border-light-outline bg-light-surface text-light-on-surface font-body text-body-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-2.5 flex items-center text-light-on-surface-muted hover:text-light-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchLiveTickets}
              disabled={loading}
              className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-DEFAULT border border-light-outline bg-light-surface text-light-on-surface-muted hover:text-light-on-surface hover:bg-light-surface-card transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Queue"
              aria-label="Refresh Queue"
            >
              <span
                className={`material-symbols-outlined text-[20px] leading-none ${
                  loading ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Main Content: Ticket Table & Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Tickets Data Table */}
          <div className="lg:col-span-2 bg-light-surface-card rounded-lg border border-light-outline/70 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-light-outline/60 flex items-center justify-between bg-light-surface/50">
              <h3 className="font-headline text-headline-sm text-light-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  table_rows
                </span>
                <span>Live Ticket Queue</span>
              </h3>
              <span className="font-body text-body-sm text-light-on-surface-muted">
                {filteredTickets.length} shown
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-outline/60 bg-light-surface text-light-on-surface-muted font-label text-label-md">
                    <th className="py-3 px-4">Ticket / Student</th>
                    <th className="py-3 px-4">Type &amp; Domain</th>
                    <th className="py-3 px-4">Module / Details</th>
                    <th className="py-3 px-4">Status / Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-outline/40 font-body text-body-sm">
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-light-on-surface-muted"
                      >
                        {loading
                          ? "Loading tickets..."
                          : fetchError || "No tickets submitted yet."}
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((t) => {
                      const isSelected = selectedTicket?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          className={`hover:bg-light-surface/60 transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  t.status === "resolved"
                                    ? "bg-success"
                                    : t.urgencyTone === "error"
                                    ? "bg-error"
                                    : "bg-warning"
                                }`}
                              />
                              <div>
                                <span className="font-mono text-mono-sm font-bold text-primary block">
                                  #{t.id}
                                </span>
                                <span className="font-label text-label-md text-light-on-surface font-semibold block">
                                  {t.name}
                                </span>
                                <span className="text-light-on-surface-muted text-[11px]">
                                  Batch: {t.batch}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-mono-sm font-semibold ${
                                t.type === "tech"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary/15 text-secondary"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {t.type === "tech" ? "terminal" : "folder"}
                              </span>
                              {t.type === "tech" ? "Tech" : "Project"}
                            </span>
                            <span className="block text-light-on-surface mt-1 text-body-sm max-w-[180px] truncate">
                              {t.domain}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 flex-wrap">
                              {t.projectType && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-light-surface border font-label text-[11px] text-primary">
                                  {t.projectType}
                                </span>
                              )}
                              {t.module &&
                                t.module.split(",").map((m) => (
                                  <span
                                    key={m.trim()}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-light-outline/40 text-light-on-surface font-mono text-[11px]"
                                  >
                                    {m.trim().startsWith("Paper")
                                      ? m.trim()
                                      : `Mod ${m.trim()}`}
                                  </span>
                                ))}
                              {t.audioUrl && (
                                <span
                                  className="material-symbols-outlined text-accent text-[15px]"
                                  title="Audio note attached"
                                >
                                  mic
                                </span>
                              )}
                            </div>
                            <p className="text-light-on-surface-muted truncate max-w-[180px] mt-1 text-[12px]">
                              {t.description}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-label text-label-md text-light-on-surface block capitalize">
                              {t.status.replace("_", " ")}
                            </span>
                            <span className="text-light-on-surface-muted text-[11px]">
                              {t.ageLabel || t.timestamp}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(t.id);
                              }}
                              className={`px-3 py-1.5 rounded-DEFAULT font-label text-label-md transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-on-primary"
                                  : "bg-light-surface border border-light-outline text-light-on-surface hover:bg-light-surface-card"
                              }`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredTickets.length > 0 && (
              <div className="px-4 py-3 border-t border-light-outline/60 bg-light-surface/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm">
                <span className="text-light-on-surface-muted">
                  Showing{" "}
                  <strong className="text-light-on-surface">
                    {(safePage - 1) * PAGE_SIZE + 1}
                  </strong>
                  –
                  <strong className="text-light-on-surface">
                    {Math.min(safePage * PAGE_SIZE, filteredTickets.length)}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-light-on-surface">
                    {filteredTickets.length}
                  </strong>{" "}
                  tickets
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-DEFAULT border border-light-outline bg-light-surface-card text-light-on-surface font-label text-label-md hover:border-accent disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>

                  <span className="text-light-on-surface-muted font-label text-label-md px-1">
                    Page <strong className="text-light-on-surface">{safePage}</strong> of{" "}
                    <strong className="text-light-on-surface">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-DEFAULT border border-light-outline bg-light-surface-card text-light-on-surface font-label text-label-md hover:border-accent disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right 1 Col: Selected Ticket Detail & Action Panel */}
          {selectedTicket && (
            <aside
              className="bg-light-surface-card rounded-lg border border-light-outline/70 shadow-sm p-5 flex flex-col justify-between"
              aria-labelledby="detail-pane-heading"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-light-outline/60 mb-4">
                  <div>
                    <span className="font-mono text-mono-sm font-bold text-primary block">
                      #{selectedTicket.id}
                    </span>
                    <h3
                      id="detail-pane-heading"
                      className="font-headline text-headline-sm text-light-on-surface font-bold"
                    >
                      {selectedTicket.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-label text-label-md font-bold capitalize ${
                      selectedTicket.status === "resolved"
                        ? "bg-success/10 text-success"
                        : selectedTicket.urgencyTone === "error"
                        ? "bg-error/10 text-error"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {selectedTicket.status.replace("_", " ")}
                  </span>
                </div>

                {/* Student Quick Contact Links */}
                <div className="bg-light-surface p-3.5 rounded-DEFAULT border border-light-outline/60 mb-4 space-y-2">
                  <span className="text-body-sm text-light-on-surface-muted block font-medium">
                    Quick Student Reachout
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${formatWaPhone(
                        selectedTicket.contact
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-DEFAULT bg-success text-on-success font-label text-label-md hover:opacity-95 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        chat
                      </span>
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`tel:${selectedTicket.contact}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-DEFAULT bg-primary text-on-primary font-label text-label-md hover:bg-accent transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        call
                      </span>
                      <span>Call Student</span>
                    </a>
                  </div>
                  <div className="text-[12px] text-light-on-surface-muted flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="truncate">
                      Email:{" "}
                      <a
                        href={`mailto:${selectedTicket.email}`}
                        className="text-accent underline"
                      >
                        {selectedTicket.email}
                      </a>
                    </span>
                    <span>Batch: {selectedTicket.batch}</span>
                  </div>
                </div>

                {/* Ticket Payload Details */}
                <div className="space-y-3.5 mb-6 text-body-sm">
                  <div>
                    <span className="text-light-on-surface-muted block text-[12px]">
                      Curriculum &amp; Details
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-label text-label-md font-semibold text-light-on-surface">
                        {selectedTicket.domain}
                      </span>
                      {selectedTicket.projectType && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono text-[11px] font-semibold">
                          {selectedTicket.projectType}
                        </span>
                      )}
                      {selectedTicket.module &&
                        selectedTicket.module.split(",").map((m) => (
                          <span
                            key={m.trim()}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-semibold"
                          >
                            {m.trim().startsWith("Paper")
                              ? m.trim()
                              : `Mod ${m.trim()}`}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-light-on-surface-muted block text-[12px]">
                      Student Description
                    </span>
                    <div className="p-3 rounded-DEFAULT bg-light-surface border border-light-outline/60 mt-1 text-light-on-surface">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {selectedTicket.audioUrl && (
                    <div className="p-3 rounded-DEFAULT bg-accent/5 border border-accent/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label text-label-md text-primary flex items-center gap-1.5 font-bold">
                          <span className="material-symbols-outlined text-[18px]">
                            mic
                          </span>
                          Voice Note Attached
                        </span>
                        {selectedTicket.audioUrl !== "sample" && (
                          <a
                            href={selectedTicket.audioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] text-accent underline"
                          >
                            Open in Drive
                          </a>
                        )}
                      </div>
                      {selectedTicket.audioUrl !== "sample" && (
                        <audio
                          controls
                          src={selectedTicket.audioUrl}
                          className="w-full h-8"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mentor Resolution Actions */}
              <div className="pt-4 border-t border-light-outline/60 space-y-2.5">
                <select
                  value={draftStatus}
                  onChange={(e) =>
                    setDraftStatus(e.target.value as TicketStatus)
                  }
                  className="w-full py-2 px-3 rounded-DEFAULT border border-light-outline bg-light-surface text-body-sm text-light-on-surface focus:ring-accent focus:border-accent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className={`w-full py-2.5 px-4 rounded-DEFAULT text-on-primary font-label text-label-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    statusSaved
                      ? "bg-success"
                      : "bg-primary hover:bg-accent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {statusSaved ? "check" : "done_all"}
                  </span>
                  <span>
                    {statusSaved ? "Status Updated!" : "Update Ticket Status"}
                  </span>
                </button>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
