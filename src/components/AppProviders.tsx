"use client";

import { EmailTemplateModalProvider } from "@/components/EmailTemplateModal";
import { AppNavbar } from "@/components/AppNavbar";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <EmailTemplateModalProvider>
      <AppNavbar />
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-8 md:px-8">
        {children}
      </div>
    </EmailTemplateModalProvider>
  );
}
