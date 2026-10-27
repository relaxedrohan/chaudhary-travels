import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Invoices · Chaudhary Travels",
  robots: { index: false, follow: false },
};

// Auth, toasts and the app shell live here (not in the root layout), so the
// public landing page never downloads Supabase or the staff UI.
export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </ToastProvider>
  );
}
