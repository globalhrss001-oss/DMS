import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Global HR DMS",
  description: "Document Management System for Global HR Staffing Services Pte., Ltd.",
};

// This app is auth-gated and data-driven; render dynamically at request time
// rather than statically prerendering at build (Firebase needs runtime config).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
