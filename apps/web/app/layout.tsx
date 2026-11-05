import { PerformanceMonitor } from "@/src/components/performance-monitor";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "codaryn",
  description: "An evidence-backed architecture map of your codebase.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <PerformanceMonitor />
        {children}
      </body>
    </html>
  );
}
