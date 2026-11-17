"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SupportMode = "tech" | "project";
type FieldKey =
  | "fullName"
  | "email"
  | "contact"
  | "batch"
  | "domain"
  | "module"
  | "projectType"
  | "description";

interface AudioPayload {
  name: string;
  mimeType: string;
  data: string;
}

interface BannerState {
  type: "success" | "error";
  title: string;
  message: string;
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
const SAVED_EMAIL_KEY = "support_portal_saved_email";

function decodeJwtPayload(token: string): { email?: string; name?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const DOMAINS = [
  "ACE Additional Task",
  "Blockchain",
  "Cyber Security",
  "Data Analyst",
  "Data Engineering",
  "Data Science",
  "Data Structures and Algorithms",
  "DevOps",
  "FDE",
  "FDE Basics",
  "FDE Pro",
  "Frontend Development Using React",
  "Game Development using Unity",
  "Game Development using Unreal Engine",
  "Machine Learning",
  "Media Course",
  "Mobile Development using Android Kotlin",
  "Mobile Development using Flutter",
  "Mobile Development using React Native",
  "Mobile Development using Swift",
  "Solution First Development Using MERN Stack",
  "Solution First Development Using Python Django + React",
  "Web development using .NET",
  "Web Development using Golang",
  "Web Development using Java Spring Boot",
  "Web Development using Java Spring Boot and Angular",
  "Web Development using Low Code and No Code",
  "Web development using MEAN Stack",
  "Web development using MERN Stack",
  "Web Development using Node.js Express",
  "Web development using Python Django",
  "Web Development using Python Django and Angular",
  "Web development using Python Django and React",
  "Web development using Ruby on Rails",
  "Other",
];

const PROJECT_TYPES = ["First Project", "Second Project", "Other"] as const;

function normalizeModuleToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();

  if (lower === "p1" || lower === "paper1" || lower === "paper 1") {
    return "Paper 1";
  }
  if (lower === "p2" || lower === "paper2" || lower === "paper 2") {
    return "Paper 2";
  }

  const modMatch = lower.match(/^(?:mod(?:ule)?\s*|m)?(\d+)$/i);
  if (modMatch) {
    return modMatch[1];
  }

  return trimmed;
}

export default function SupportPortalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode: SupportMode =
    searchParams.get("type") === "project" ? "project" : "tech";

  const [mode, setMode] = useState<SupportMode>(initialMode);
  const [announcement, setAnnouncement] = useState("");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    mode: SupportMode;
  } | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Shared Form Values
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [recordAccountEmail, setRecordAccountEmail] = useState(false);
  const [contact, setContact] = useState("");
  const [batch, setBatch] = useState("");
  const [domain, setDomain] = useState("");
  const [domainQuery, setDomainQuery] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  const [activeDomainIdx, setActiveDomainIdx] = useState(-1);
  const [projectType, setProjectType] = useState("");
  const [description, setDescription] = useState("");

  // Smart Module Tag Picker
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleDraft, setModuleDraft] = useState("");

  // Audio Upload (Tech Support only)
  const [audioPayload, setAudioPayload] = useState<AudioPayload | null>(null);
  const [audioFileMeta, setAudioFileMeta] = useState<{
    name: string;
    sizeMb: string;
    previewUrl: string;
  } | null>(null);
  const [audioError, setAudioError] = useState("");

  // Post-interaction validation tracking
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());

  const formRef = useRef<HTMLFormElement>(null);
  const domainBoxRef = useRef<HTMLDivElement>(null);
  const moduleInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const tabTechRef = useRef<HTMLButtonElement>(null);
  const tabProjectRef = useRef<HTMLButtonElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Restore saved email & initialize Google Identity Services (Chrome One-Tap / Sign-In)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) {
        setAccountEmail(saved);
        setRecordAccountEmail(true);
        setEmail(saved);
      }
    } catch {
      // ignore storage errors
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) return;

    const initGsi = () => {
      const g = (
        window as unknown as {
          google?: {
            accounts?: {
              id?: {
                initialize: (cfg: Record<string, unknown>) => void;
                prompt: () => void;
                renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
              };
            };
          };
        }
      ).google;

      if (!g?.accounts?.id) return;

      g.accounts.id.initialize({
        client_id: clientId,
        auto_select: true,
        callback: (response: { credential?: string }) => {
          if (!response.credential) return;
          const claims = decodeJwtPayload(response.credential);
          if (claims?.email) {
            setAccountEmail(claims.email);
            setRecordAccountEmail(true);
            setEmail(claims.email);
            try {
              window.localStorage.setItem(SAVED_EMAIL_KEY, claims.email);
            } catch {
              // ignore
            }
          }
          if (claims?.name) {
            setFullName((prev) => (prev.trim() ? prev : claims.name!));
          }
        },
      });

      g.accounts.id.prompt();
      if (googleBtnRef.current) {
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "medium",
          text: "continue_with",
        });
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existingScript) {
      initGsi();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);
  }, []);

  const filteredDomains = domainQuery.trim()
    ? DOMAINS.filter((d) =>
        d.toLowerCase().includes(domainQuery.trim().toLowerCase())
      )
    : DOMAINS;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        domainBoxRef.current &&
        !domainBoxRef.current.contains(e.target as Node)
      ) {
        setDomainOpen(false);
        setActiveDomainIdx(-1);
        setDomainQuery(domain);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [domain]);

  const selectDomain = (value: string) => {
    setDomain(value);
    setDomainQuery(value);
    setDomainOpen(false);
    setActiveDomainIdx(-1);
    markTouched("domain");
  };

  // Sync mode if URL query changes externally
  useEffect(() => {
    const param = searchParams.get("type");
    if (param === "project" || param === "tech") {
      setMode(param);
    }
  }, [searchParams]);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (audioFileMeta?.previewUrl) {
        URL.revokeObjectURL(audioFileMeta.previewUrl);
      }
    };
  }, [audioFileMeta]);

  const switchMode = (nextMode: SupportMode) => {
    setMode(nextMode);
    setAnnouncement(
      nextMode === "tech"
        ? "Switched to Technical Support mode."
        : "Switched to Project Support mode."
    );
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", nextMode);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextMode: SupportMode = mode === "tech" ? "project" : "tech";
      switchMode(nextMode);
      (nextMode === "tech" ? tabTechRef : tabProjectRef).current?.focus();
    }
  };

  // Module Tag Helpers (either numbered modules OR a single Paper)
  const applyModuleTokens = (prev: string[], raw: string): string[] => {
    const parts = raw.split(",");
    let next = [...prev];

    for (const part of parts) {
      const normalized = normalizeModuleToken(part);
      if (!normalized) continue;

      if (normalized.startsWith("Paper ")) {
        // Only 1 paper allowed, and cannot mix with numbered modules
        next = [normalized];
      } else {
        // Numbered module: remove any selected paper first
        next = next.filter((m) => !m.startsWith("Paper "));
        if (!next.includes(normalized)) {
          next.push(normalized);
        }
      }
    }

    return next;
  };

  const addModulesFromString = (raw: string) => {
    setSelectedModules((prev) => applyModuleTokens(prev, raw));
  };

  const commitModuleDraft = (): string[] => {
    const trimmed = moduleDraft.trim();
    if (!trimmed) return selectedModules;

    const next = applyModuleTokens(selectedModules, trimmed);
    setSelectedModules(next);
    setModuleDraft("");
    return next;
  };

  const removeModuleTag = (tag: string) => {
    setSelectedModules((prev) => prev.filter((m) => m !== tag));
    moduleInputRef.current?.focus();
  };

  const handleModuleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (moduleDraft.trim()) {
        addModulesFromString(moduleDraft);
        setModuleDraft("");
      }
    } else if (
      e.key === "Backspace" &&
      moduleDraft === "" &&
      selectedModules.length > 0
    ) {
      setSelectedModules((prev) => prev.slice(0, -1));
    }
  };

  // Validation Helpers
  const markTouched = (field: FieldKey) => {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  };

  const isFieldValid = (
    field: FieldKey,
    modulesOverride?: string[]
  ): boolean => {
    switch (field) {
      case "fullName":
        return fullName.trim().length >= 2;
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      case "contact":
        return contact.replace(/\D/g, "").length >= 7;
      case "batch":
        return batch.trim().length >= 2;
      case "domain":
        return Boolean(domain);
      case "module": {
        const list = modulesOverride ?? selectedModules;
        return list.length > 0 || moduleDraft.trim().length > 0;
      }
      case "projectType":
        return mode === "project" ? Boolean(projectType) : true;
      case "description":
        return description.trim().length >= 15;
    }
  };

  const hasError = (field: FieldKey) =>
    touched.has(field) && !isFieldValid(field);

  // Audio Handling
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAudioError("");

    if (!file) {
      clearAudio();
      return;
    }

    if (file.size > MAX_AUDIO_BYTES) {
      setAudioError("File exceeds the 15 MB maximum size limit.");
      clearAudio(false);
      return;
    }

    if (audioFileMeta?.previewUrl) {
      URL.revokeObjectURL(audioFileMeta.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAudioFileMeta({
      name: file.name,
      sizeMb: (file.size / (1024 * 1024)).toFixed(2),
      previewUrl,
    });

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || "";
      setAudioPayload({
        name: file.name,
        mimeType: file.type || "audio/mpeg",
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAudio = (clearErr = true) => {
    if (audioFileMeta?.previewUrl) {
      URL.revokeObjectURL(audioFileMeta.previewUrl);
    }
    setAudioPayload(null);
    setAudioFileMeta(null);
    if (clearErr) setAudioError("");
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setContact("");
    setBatch("");
    setDomain("");
    setDomainQuery("");
    setDomainOpen(false);
    setActiveDomainIdx(-1);
    setProjectType("");
    setDescription("");
    setSelectedModules([]);
    setModuleDraft("");
    clearAudio();
    setTouched(new Set());
    setBanner(null);
    setAnnouncement("Form inputs reset to default.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const committedModules = mode === "tech" ? commitModuleDraft() : [];

    const allFields: FieldKey[] = [
      "fullName",
      "email",
      "contact",
      "batch",
      "domain",
      ...(mode === "tech" ? (["module"] as FieldKey[]) : []),
      "description",
      ...(mode === "project" ? (["projectType"] as FieldKey[]) : []),
    ];

    setTouched(new Set(allFields));

    const allValid = allFields.every((f) =>
      isFieldValid(f, f === "module" ? committedModules : undefined)
    );

    if (!allValid) {
      setBanner(null);
      setAnnouncement(
        "Form submission failed due to validation errors. Please review the highlighted fields."
      );
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]'
        );
        firstInvalid?.focus();
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setBanner(null);

    const moduleString = mode === "tech" ? committedModules.join(", ") : "";
    const payload = {
      formType: mode,
      name: fullName.trim(),
      email: email.trim(),
      contact: contact.trim(),
      batch: batch.trim(),
      domain,
      projectType: mode === "project" ? projectType : "",
      module: moduleString,
      description: description.trim(),
      audio: mode === "tech" ? audioPayload : null,
    };

    const endpointUrl =
      (mode === "tech"
        ? process.env.NEXT_PUBLIC_TECH_APPS_SCRIPT_URL?.trim()
        : process.env.NEXT_PUBLIC_PROJECT_APPS_SCRIPT_URL?.trim()) ||
      process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim();

    try {
      try {
        window.localStorage.setItem(SAVED_EMAIL_KEY, payload.email);
        setAccountEmail(payload.email);
      } catch {
        // ignore storage errors
      }

      const ticketId = `STU-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!endpointUrl) {
        // Local preview fallback when NEXT_PUBLIC_APPS_SCRIPT_URL is not configured yet
        await new Promise((r) => setTimeout(r, 450));
        handleResetPreservingBanner();
        setSubmittedTicket({ id: ticketId, mode });
        return;
      }

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      setAnnouncement("Your ticket was submitted successfully.");
      handleResetPreservingBanner();
      setSubmittedTicket({ id: ticketId, mode });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setBanner({
        type: "error",
        title: "Submission Failed",
        message: `Could not submit request: ${msg}`,
      });
      setAnnouncement(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPreservingBanner = () => {
    setFullName("");
    setEmail("");
    setContact("");
    setBatch("");
    setDomain("");
    setDomainQuery("");
    setDomainOpen(false);
    setActiveDomainIdx(-1);
    setProjectType("");
    setDescription("");
    setSelectedModules([]);
    setModuleDraft("");
    clearAudio();
    setTouched(new Set());
  };

  if (submittedTicket) {
    return (
      <div>
        {/* Success Hero Badge & Header */}
        <div className="text-center pb-6 border-b border-light-outline/60">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success mb-4 shadow-sm ring-8 ring-success/5 animate-pulse">
            <span
              className="material-symbols-outlined text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <h2 className="font-headline text-headline-lg text-light-on-surface mb-2">
            Ticket Submitted Successfully!
          </h2>
          <p className="font-body text-body-md text-light-on-surface-muted max-w-lg mx-auto">
            Your ticket has been assigned to the concerned officials.
          </p>

          {/* Reference ID Pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-light-surface border border-light-outline font-mono text-mono-sm">
            <span className="text-light-on-surface-muted">Ticket ID:</span>
            <span className="font-bold text-primary tracking-wide">
              #{submittedTicket.id}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(submittedTicket.id)
                  .then(() => {
                    setCopiedTicket(true);
                    setTimeout(() => setCopiedTicket(false), 2000);
                  })
                  .catch(() => {});
              }}
              className="ml-1 text-light-on-surface-muted hover:text-accent focus-visible:outline-none transition-colors cursor-pointer"
              title="Copy Ticket ID"
              aria-label="Copy Ticket ID to clipboard"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  copiedTicket ? "text-success" : ""
                }`}
              >
                {copiedTicket ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* Connection Notice Banner */}
        <section
          className="py-6 border-b border-light-outline/60"
          aria-label="Connection Notice"
        >
          <div className="p-6 rounded-DEFAULT bg-primary/5 border border-primary/20 flex flex-col items-center text-center gap-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                support_agent
              </span>
            </div>
            <div>
              <p className="font-headline text-headline-sm text-light-on-surface font-semibold">
                Our expert will connect with you within 1 Hr
              </p>
              <p className="font-body text-body-sm text-light-on-surface-muted mt-1 max-w-md mx-auto">
                A dedicated mentor is reviewing your ticket and will reach out
                via phone or WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* Actions Footer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSubmittedTicket(null);
              setBanner(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-DEFAULT border border-light-outline bg-light-surface text-light-on-surface font-label text-label-md hover:bg-light-surface-card hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              add_circle
            </span>
            <span>Submit Another Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmittedTicket(null);
              setBanner(null);
              switchMode("project");
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-DEFAULT bg-primary text-on-primary font-label text-label-lg shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all cursor-pointer"
          >
            <span>View Project Desk</span>
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mode Switcher: Segmented Tab Toggle */}
      <section aria-labelledby="mode-toggle-heading" className="mb-8">
        <h2 id="mode-toggle-heading" className="sr-only">
          Select Support Mode
        </h2>
        <div
          role="tablist"
          aria-label="Support Type"
          className="grid grid-cols-2 p-1.5 bg-light-surface border border-light-outline/80 rounded-DEFAULT gap-1.5"
        >
          <button
            ref={tabTechRef}
            type="button"
            role="tab"
            id="tab-tech"
            aria-selected={mode === "tech"}
            aria-controls="support-portal-form"
            tabIndex={mode === "tech" ? 0 : -1}
            onClick={() => switchMode("tech")}
            onKeyDown={handleTabKeyDown}
            className={
              mode === "tech"
                ? "flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-label text-label-md bg-light-surface-card text-primary shadow-sm font-bold border border-light-outline/50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                : "flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-label text-label-md text-light-on-surface-muted hover:text-light-on-surface transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              terminal
            </span>
            <span>Technical Support</span>
          </button>

          <button
            ref={tabProjectRef}
            type="button"
            role="tab"
            id="tab-project"
            aria-selected={mode === "project"}
            aria-controls="support-portal-form"
            tabIndex={mode === "project" ? 0 : -1}
            onClick={() => switchMode("project")}
            onKeyDown={handleTabKeyDown}
            className={
              mode === "project"
                ? "flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-label text-label-md bg-light-surface-card text-primary shadow-sm font-bold border border-light-outline/50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                : "flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-label text-label-md text-light-on-surface-muted hover:text-light-on-surface transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              assignment_turned_in
            </span>
            <span>Project Support</span>
          </button>
        </div>
      </section>

      {/* Screen-reader live region */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Feedback Alert Banner */}
      {banner && (
        <div
          className={`mb-6 p-4 rounded-DEFAULT border text-body-md ${
            banner.type === "success"
              ? "bg-success/10 border-success/30"
              : "bg-error/10 border-error/30"
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span
              className={`material-symbols-outlined text-[20px] mt-0.5 ${
                banner.type === "success" ? "text-success" : "text-error"
              }`}
            >
              {banner.type === "success" ? "check_circle" : "report"}
            </span>
            <div className="flex-1">
              <h3
                className={`font-headline text-headline-sm font-bold ${
                  banner.type === "success" ? "text-success" : "text-error"
                }`}
              >
                {banner.title}
              </h3>
              <p className="text-body-sm mt-0.5 text-light-on-surface">
                {banner.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-light-on-surface-muted hover:text-light-on-surface"
              aria-label="Dismiss banner"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Unified Support Form */}
      <form
        ref={formRef}
        id="support-portal-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6"
      >
        {/* Record Email (Chrome Google Account / Saved Email Auto-Fill) */}
        {(accountEmail || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && (
          <div className="p-3.5 rounded-DEFAULT bg-light-surface border border-light-outline/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {accountEmail ? (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordAccountEmail}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRecordAccountEmail(checked);
                    if (checked) {
                      setEmail(accountEmail);
                    } else {
                      setEmail("");
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded-sm border-light-outline text-accent focus:ring-accent"
                />
                <span className="font-body text-body-md text-light-on-surface">
                  Record{" "}
                  <strong className="font-semibold text-primary">
                    {accountEmail}
                  </strong>{" "}
                  as the email to be included with my response
                </span>
              </label>
            ) : (
              <span className="font-body text-body-sm text-light-on-surface-muted">
                Sign in with your Google account to auto-fill your email.
              </span>
            )}

            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div ref={googleBtnRef} className="shrink-0" />
            )}
          </div>
        )}

        {/* Student Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fullName"
              className="font-label text-label-md text-light-on-surface"
            >
              Full Name <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="name"
              required
              autoComplete="name"
              placeholder="e.g. Maya Chen"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => markTouched("fullName")}
              aria-describedby="fullName-error"
              aria-invalid={hasError("fullName")}
              className={`w-full px-3.5 py-2.5 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                hasError("fullName") ? "border-error" : "border-light-outline"
              }`}
            />
            {hasError("fullName") && (
              <span
                id="fullName-error"
                className="font-body text-body-sm text-error flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                Full Name is required.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-label text-label-md text-light-on-surface"
            >
              Email <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              placeholder="student@example.edu"
              value={email}
              onChange={(e) => {
                const val = e.target.value;
                setEmail(val);
                if (accountEmail) {
                  setRecordAccountEmail(val.trim() === accountEmail);
                }
              }}
              onBlur={() => markTouched("email")}
              aria-describedby="email-error"
              aria-invalid={hasError("email")}
              className={`w-full px-3.5 py-2.5 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                hasError("email") ? "border-error" : "border-light-outline"
              }`}
            />
            {hasError("email") && (
              <span
                id="email-error"
                className="font-body text-body-sm text-error flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                Please enter a valid email address.
              </span>
            )}
          </div>
        </div>

        {/* Contact & Batch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contact"
              className="font-label text-label-md text-light-on-surface"
            >
              Contact No <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              type="tel"
              id="contact"
              name="contact"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onBlur={() => markTouched("contact")}
              aria-describedby="contact-error"
              aria-invalid={hasError("contact")}
              className={`w-full px-3.5 py-2.5 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                hasError("contact") ? "border-error" : "border-light-outline"
              }`}
            />
            {hasError("contact") && (
              <span
                id="contact-error"
                className="font-body text-body-sm text-error flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                Contact number is required (min 7 digits).
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="batch"
              className="font-label text-label-md text-light-on-surface"
            >
              Batch No <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="batch"
              name="batch"
              required
              placeholder="e.g. BCE203"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              onBlur={() => markTouched("batch")}
              aria-describedby="batch-error"
              aria-invalid={hasError("batch")}
              className={`w-full px-3.5 py-2.5 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                hasError("batch") ? "border-error" : "border-light-outline"
              }`}
            />
            {hasError("batch") && (
              <span
                id="batch-error"
                className="font-body text-body-sm text-error flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                Batch number is required.
              </span>
            )}
          </div>
        </div>

        {/* Domain (Searchable Combobox) */}
        <div className="flex flex-col gap-1.5" ref={domainBoxRef}>
          <label
            htmlFor="domain"
            className="font-label text-label-md text-light-on-surface"
          >
            Domain <span className="text-error" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="domain"
              name="domain"
              role="combobox"
              aria-expanded={domainOpen}
              aria-controls="domain-listbox"
              aria-autocomplete="list"
              autoComplete="off"
              required
              placeholder="Choose or type to search domain..."
              value={domainOpen ? domainQuery : domain}
              onFocus={() => {
                setDomainQuery("");
                setDomainOpen(true);
                setActiveDomainIdx(-1);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setDomainQuery(val);
                setDomainOpen(true);
                setActiveDomainIdx(val.trim() ? 0 : -1);
                if (!val.trim()) setDomain("");
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setDomainOpen(true);
                  setActiveDomainIdx((prev) =>
                    filteredDomains.length === 0
                      ? -1
                      : (prev + 1) % filteredDomains.length
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setDomainOpen(true);
                  setActiveDomainIdx((prev) =>
                    filteredDomains.length === 0
                      ? -1
                      : prev <= 0
                      ? filteredDomains.length - 1
                      : prev - 1
                  );
                } else if (e.key === "Enter" && domainOpen) {
                  e.preventDefault();
                  if (
                    activeDomainIdx >= 0 &&
                    filteredDomains[activeDomainIdx]
                  ) {
                    selectDomain(filteredDomains[activeDomainIdx]);
                  } else if (filteredDomains.length === 1) {
                    selectDomain(filteredDomains[0]);
                  }
                } else if (e.key === "Escape") {
                  setDomainOpen(false);
                  setActiveDomainIdx(-1);
                  setDomainQuery(domain);
                }
              }}
              onBlur={() => {
                markTouched("domain");
              }}
              aria-describedby="domain-error"
              aria-invalid={hasError("domain")}
              className={`w-full px-3.5 py-2.5 pr-10 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                hasError("domain") ? "border-error" : "border-light-outline"
              }`}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle domain options"
              onMouseDown={(e) => {
                e.preventDefault();
                if (domainOpen) {
                  setDomainOpen(false);
                  setActiveDomainIdx(-1);
                } else {
                  setDomainQuery("");
                  setDomainOpen(true);
                  setActiveDomainIdx(-1);
                }
              }}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-light-on-surface-muted hover:text-light-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {domainOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {domainOpen && (
              <ul
                id="domain-listbox"
                role="listbox"
                className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-DEFAULT border border-light-outline bg-light-surface-card py-1 shadow-lg"
              >
                {filteredDomains.length === 0 ? (
                  <li className="px-3.5 py-2.5 text-body-sm text-light-on-surface-muted">
                    No matching domains found
                  </li>
                ) : (
                  filteredDomains.map((d, idx) => {
                    const isSelected = domain === d;
                    const isHighlighted = idx === activeDomainIdx;
                    return (
                      <li
                        key={d}
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectDomain(d);
                        }}
                        className={`px-3.5 py-2 text-body-md cursor-pointer flex items-center justify-between transition-colors ${
                          isHighlighted
                            ? "bg-primary/10 text-primary font-medium"
                            : isSelected
                            ? "text-primary font-medium"
                            : "text-light-on-surface hover:bg-light-surface"
                        }`}
                      >
                        <span>{d}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            check
                          </span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
          {hasError("domain") && (
            <span
              id="domain-error"
              className="font-body text-body-sm text-error flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                error
              </span>
              Please select your domain.
            </span>
          )}
        </div>

        {/* Smart Module Tag Picker (Technical Support Only) */}
        {mode === "tech" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="module-input"
              className="font-label text-label-md text-light-on-surface"
            >
              Module <span className="text-error" aria-hidden="true">*</span>
            </label>
            <span className="font-body text-body-sm text-light-on-surface-muted">
              Enter number(s) or select 1 paper
            </span>
          </div>

          <div
            onClick={() => moduleInputRef.current?.focus()}
            className={`w-full min-h-[46px] p-2 rounded-DEFAULT border bg-light-surface-card flex flex-wrap items-center gap-1.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors cursor-text ${
              hasError("module") ? "border-error" : "border-light-outline"
            }`}
          >
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="list"
              aria-label="Selected Modules"
            >
              {selectedModules.map((tag) => {
                const isPaper = tag.startsWith("Paper");
                return (
                  <span
                    key={tag}
                    role="listitem"
                    className={
                      isPaper
                        ? "inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary font-mono text-mono-sm font-semibold leading-none"
                        : "inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-mono-sm leading-none"
                    }
                  >
                    <span>{isPaper ? tag : `Mod ${tag}`}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeModuleTag(tag);
                      }}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 focus-visible:outline-none transition-colors shrink-0"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M3 3l6 6M9 3l-6 6" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>

            <input
              ref={moduleInputRef}
              type="text"
              id="module-input"
              value={moduleDraft}
              onChange={(e) => setModuleDraft(e.target.value)}
              onKeyDown={handleModuleKeyDown}
              onBlur={() => {
                commitModuleDraft();
                markTouched("module");
              }}
              placeholder="Type module (e.g. 13, 23) and press Enter..."
              aria-describedby="module-error"
              aria-invalid={hasError("module")}
              className="flex-1 min-w-[200px] border-none p-1 text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:outline-none focus:ring-0 bg-transparent"
            />
          </div>

          {hasError("module") && (
            <span
              id="module-error"
              className="font-body text-body-sm text-error flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                error
              </span>
              At least one module or paper is required.
            </span>
          )}
        </div>
        )}

        {/* Project Support Only: Which project is this? */}
        {mode === "project" && (
          <div className="flex flex-col gap-2 p-4 rounded-DEFAULT bg-light-surface border border-light-outline/80">
            <fieldset className="space-y-2">
              <legend className="font-label text-label-md text-light-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  folder
                </span>
                <span>
                  Which project is this?{" "}
                  <span className="text-error" aria-hidden="true">
                    *
                  </span>
                </span>
              </legend>
              <p className="text-body-sm text-light-on-surface-muted">
                Select the milestone review or project category.
              </p>

              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
                role="radiogroup"
                aria-describedby="project-error"
              >
                {PROJECT_TYPES.map((pt) => (
                  <label
                    key={pt}
                    className={`flex items-center gap-3 p-3 rounded-DEFAULT border bg-light-surface-card cursor-pointer hover:border-accent transition-colors ${
                      projectType === pt
                        ? "border-accent ring-1 ring-accent/30"
                        : "border-light-outline"
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectType"
                      value={pt}
                      checked={projectType === pt}
                      onChange={(e) => {
                        setProjectType(e.target.value);
                        markTouched("projectType");
                      }}
                      className="text-accent focus:ring-accent h-4 w-4"
                    />
                    <span className="font-body text-body-md text-light-on-surface font-medium">
                      {pt}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {hasError("projectType") && (
              <span
                id="project-error"
                className="font-body text-body-sm text-error flex items-center gap-1 mt-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                Please specify which project milestone this inquiry belongs to.
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="font-label text-label-md text-light-on-surface flex items-center justify-between"
          >
            <span>
              {mode === "project" ? "Detailed Description" : "Description"}{" "}
              <span className="text-error" aria-hidden="true">
                *
              </span>
            </span>
            <span className="font-body text-body-sm text-light-on-surface-muted">
              {description.length} chars
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => markTouched("description")}
            placeholder="Describe the issue you are facing..."
            aria-describedby={hasError("description") ? "description-error" : undefined}
            aria-invalid={hasError("description")}
            className={`w-full px-3.5 py-2.5 rounded-DEFAULT border bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y min-h-[110px] ${
              hasError("description")
                ? "border-error"
                : "border-light-outline"
            }`}
          />
          {hasError("description") && (
            <span
              id="description-error"
              className="font-body text-body-sm text-error flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                error
              </span>
              Description is required (min 15 characters).
            </span>
          )}
        </div>

        {/* Technical Support Only: Optional Audio File */}
        {mode === "tech" && (
          <div className="flex flex-col gap-3 p-4 rounded-DEFAULT bg-light-surface border border-light-outline/80">
            <label
              htmlFor="audioFile"
              className="font-label text-label-md text-light-on-surface flex items-center gap-2 leading-none"
            >
              <span className="material-symbols-outlined text-accent text-[18px] leading-none shrink-0">
                mic
              </span>
              <span className="flex flex-wrap items-baseline gap-1.5">
                <span>Voice Note / Audio Explanation</span>
                <span className="font-normal text-body-sm text-light-on-surface-muted">
                  (Optional, max 15 MB)
                </span>
              </span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                ref={audioInputRef}
                type="file"
                id="audioFile"
                name="audio"
                accept="audio/*"
                onChange={handleAudioChange}
                aria-describedby={audioError ? "audio-error" : undefined}
                className="block w-full p-0 border-0 bg-transparent text-body-sm text-light-on-surface-muted file:mr-3 file:py-2 file:px-4 file:rounded-DEFAULT file:border-0 file:text-label-md file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer focus:outline-none"
              />
              {audioFileMeta && (
                <button
                  type="button"
                  onClick={() => clearAudio()}
                  className="text-body-sm text-error hover:underline self-start sm:self-center cursor-pointer whitespace-nowrap"
                >
                  Clear audio
                </button>
              )}
            </div>

            {audioFileMeta && (
              <div className="mt-1 p-2 rounded-DEFAULT bg-light-surface-card border border-light-outline text-body-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    audio_file
                  </span>
                  <span className="font-medium text-light-on-surface truncate">
                    {audioFileMeta.name}
                  </span>
                  <span className="text-light-on-surface-muted text-body-sm">
                    ({audioFileMeta.sizeMb} MB)
                  </span>
                </div>
                <audio
                  src={audioFileMeta.previewUrl}
                  controls
                  className="h-7 w-48 hidden sm:block"
                />
              </div>
            )}

            {audioError && (
              <span
                id="audio-error"
                className="font-body text-body-sm text-error flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  error
                </span>
                {audioError}
              </span>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="pt-4 border-t border-light-outline/60 flex items-center justify-end gap-3">
          <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-DEFAULT text-light-on-surface-muted hover:text-light-on-surface font-label text-label-md transition-colors cursor-pointer"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-DEFAULT bg-primary text-on-primary font-label text-label-lg shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-on-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Ticket</span>
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                </>
              )}
            </button>
        </div>
      </form>
    </>
  );
}
