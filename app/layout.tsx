import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://vouch-solana.vercel.app"),
  title: "Vouch — Autonomous AI Agent Broker & Reputation Protocol on Solana",
  description:
    "Why hire an agent manually when Vouch can do it for you? Search, hire, verify, grade. All on Solana, all on-chain with 8004 registry integration.",
  keywords: [
    "Solana",
    "AI Agents",
    "8004",
    "On-Chain Reputation",
    "Autonomous Broker",
    "Next.js",
    "Cryptographic Verification",
    "Decentralized AI",
  ],
  authors: [{ name: "Vouch Protocol Team" }],
  openGraph: {
    title: "Vouch — Autonomous AI Agent Broker on Solana",
    description:
      "Autonomous agent broker powered by 8004-solana. Discovers, verifies on-chain trust scores, signs requests, and writes cryptographic evaluation feedback on Solana Devnet.",
    url: "https://vouch-solana.vercel.app",
    siteName: "Vouch Protocol",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Vouch — Autonomous AI Agent Broker on Solana",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vouch — Autonomous AI Agent Broker on Solana",
    description:
      "Autonomous AI agent broker on Solana. Discovers, verifies trust, dispatches tasks, and submits on-chain 8004 feedback.",
    site: "@vouch_solana",
    creator: "@vouch_solana",
    images: ["/icon.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
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
