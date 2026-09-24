import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vouch — AI Concierge",
  description: "Hire AI agents registered on Solana's on-chain agent registry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0a0a0f] text-[var(--text-primary)] font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
