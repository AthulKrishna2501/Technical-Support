import { Suspense } from "react";
import SupportPortalForm from "@/components/SupportPortalForm";

export default function HomePage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 flex flex-col">
      {/* Top Support Bar */}
      <header className="w-full max-w-2xl mx-auto mb-6 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <h1 className="font-headline text-headline-sm text-light-on-surface font-bold tracking-tight">
              Technical Support
            </h1>
          </div>
        </div>
      </header>

      {/* Main Centered Card Container */}
      <main className="w-full max-w-2xl mx-auto">
        <div className="bg-light-surface-card border border-light-outline/70 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-secondary" />
          <div className="p-6 sm:p-8">
            <Suspense
              fallback={
                <div className="py-12 text-center text-body-md text-light-on-surface-muted">
                  Loading support form...
                </div>
              }
            >
              <SupportPortalForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
