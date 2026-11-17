"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both admin email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid credentials.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-surface text-light-on-surface font-body antialiased flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-primary text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[22px]">
              admin_panel_settings
            </span>
          </div>
          <div>
            <h1 className="font-headline text-headline-sm text-light-on-surface font-bold tracking-tight">
              Technical Support Console
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-muted">
              Admin / Mentor Sign In
            </p>
          </div>
        </div>

        <div className="bg-light-surface-card border border-light-outline/70 rounded-lg shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-secondary" />
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-DEFAULT bg-error/10 border border-error/30 text-error text-body-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-email"
                  className="font-label text-label-md text-light-on-surface"
                >
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="w-full px-3.5 py-2.5 rounded-DEFAULT border border-light-outline bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-password"
                  className="font-label text-label-md text-light-on-surface"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-DEFAULT border border-light-outline bg-light-surface-card text-light-on-surface font-body text-body-md placeholder:text-light-on-surface-muted/50 focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-light-on-surface-muted hover:text-light-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-DEFAULT bg-primary text-on-primary font-label text-label-lg shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                <span>{loading ? "Signing in..." : "Sign In to Console"}</span>
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-light-outline/60 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-body-sm text-light-on-surface-muted hover:text-accent transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  arrow_back
                </span>
                <span>Back to Student Support Form</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
