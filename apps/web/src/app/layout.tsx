import type { Metadata } from "next";
import "./globals.css";
import { AdaptivePageTitle } from "@/components/adaptive-page-title";

export const metadata: Metadata = { title: "Wildcard | StuyPulse Scouting", description: "Fast, reliable FRC competition scouting.", icons: { icon: "/694-logo.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AdaptivePageTitle/>{children}</body></html>;
}
