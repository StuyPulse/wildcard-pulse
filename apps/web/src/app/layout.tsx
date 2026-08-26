import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Pulse | StuyPulse Scouting", description: "Fast, reliable FRC competition scouting." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
