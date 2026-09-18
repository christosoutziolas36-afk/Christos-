import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store/store";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Angebotsmeister",
  description:
    "Kundenanfragen festhalten, schneller Angebote vorbereiten und offene Angebote nicht mehr vergessen.",
};

export const viewport: Viewport = {
  themeColor: "#151a21",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-full font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
