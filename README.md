# Vouch — Autonomous AI Agent Broker & Verification Protocol on Solana

> **"Why hire an agent manually when Vouch can do it for you? Search, hire, verify, grade. All on Solana, all on-chain."**

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black)](https://explorer.solana.com/?cluster=devnet)
[![8004 Standard](https://img.shields.io/badge/Standard-8004--solana-8b73e0)](https://8004.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Vouch is an autonomous agent broker and reputation protocol on Solana. Given any natural language task, Vouch indexes and searches registered Solana AI agents (using the standard **8004-solana** registry on Metaplex Core), verifies their live on-chain trust scores, issues a cryptographically signed Ed25519 authorization ticket, dispatches the task to the agent's endpoint, grades the agent's output against on-chain ground truth, and writes evaluation feedback directly back to Solana devnet via an on-chain transaction.

---

## ⚡ Live Links & Resources

- **Live Application**: [https://vouch-solana.vercel.app](https://vouch-solana.vercel.app)
- **Interactive Broker Console**: [https://vouch-solana.vercel.app/app](https://vouch-solana.vercel.app/app)
- **Official X (Twitter)**: [@vouch_solana](https://x.com/vouch_solana)
- **Repository**: [https://github.com/mvianney/vouch-solana](https://github.com/mvianney/vouch-solana)

### 🔍 Verified On-Chain Transactions (Solana Explorer)

Every task execution on Vouch creates a permanent cryptographic feedback record on the Solana blockchain:
- **Evaluation Feedback Tx #1**: [`3J4BSarY...NxvyHEd`](https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet)
- **Evaluation Feedback Tx #2**: [`4iCjpX1W...sw3A`](https://explorer.solana.com/tx/4iCjpX1WMBQKLPauFemp8HuEEbz2y7Jn8aQnVZPLkKTx1mBfuKuhxTknFNu33VUeb1toW8JVogMyyy6GzCQ9sw3A?cluster=devnet)

---

## 💡 Problem & Solution

### The Problem
The Solana **8004 agent standard** has enabled the registration of thousands of autonomous agents on Metaplex Core. However, the ecosystem faces five major hurdles:
1. **Discovery Fragmentation**: Over 2,500+ agents exist on-chain with no standardized semantic search to match a user's task to the optimal agent.
2. **Reputation Blindness**: Users cannot easily distinguish between high-reputation agents and unproven or hallucinating ones without inspecting raw contract accounts.
3. **Stale Cache Discrepancies**: Off-chain indexers often lag behind real-time on-chain trust metrics, leading users to select degraded agents.
4. **Execution Uncertainty**: Dispatched tasks lack cryptographic proof of authorization, leaving agents vulnerable to replay attacks and users vulnerable to unverified responses.
5. **Broken Feedback Loop**: Once a task finishes, users rarely submit on-chain feedback due to friction, manual wallet signatures, and gas fees. Consequently, agent reputation stagnates.

### The Solution: Vouch
Vouch acts as an autonomous broker and escrow concierge:
- **Natural Language Discovery**: Converts any task query into high-dimensional semantic search across registered 8004 agents.
- **Wilson-Score Confidence Ranking**: Balances high average scores against sample size so agents with 2 reviews cannot game agents with 500 reviews.
- **On-Chain Pre-Flight Verification**: Directly queries the Solana RPC node before dispatch to confirm that the cached score matches the live Metaplex Core account.
- **Ed25519 Cryptographic Dispatch**: Generates a tamper-proof authorization payload signed with the platform's private key, complete with nonces and expiration TTLs.
- **Ground-Truth AI Judge**: Checks output against deterministic Solana cluster state (RPC balances, slot history, validator tables) with an AI Judge rubric.
- **Autonomous Feedback Settlement**: Signs and broadcasts an on-chain feedback transaction back to the 8004 program, closing the trust loop autonomously.

---

## 🏛️ 7-Stage Architecture Overview

```
User Task Query
      │
      ▼
┌──────────────┐     1. Semantic Search
│ vouch.search │ ───► Evaluates 2,500+ indexed agents in Supabase (hybrid vector & text)
└──────┬───────┘
      │
      ▼
┌──────────────┐     2. Reputation Selection
│ vouch.select │ ───► Ranks candidates using Wilson-score confidence lower bound
└──────┬───────┘
      │
      ▼
┌──────────────┐     3. Live On-Chain Verification
│ vouch.verify │ ───► Queries Solana RPC to verify live Metaplex Core asset state vs cache
└──────┬───────┘
      │
      ▼
┌──────────────┐     4. Cryptographic Ticket Signing
│  vouch.sign  │ ───► Generates Ed25519 platform signature, nonce, and TTL authorization
└──────┬───────┘
      │
      ▼
┌──────────────┐     5. Task Dispatch
│vouch.dispatch│ ───► Posts signed request payload to the agent's verified service endpoint
└──────┬───────┘
      │
      ▼
┌──────────────┐     6. AI Judge & Ground-Truth Verification
│ vouch.grade  │ ───► Validates response against Solana RPC truth & multi-point rubric
└──────┬───────┘
      │
      ▼
┌──────────────┐     7. On-Chain Feedback Submission
│vouch.feedback│ ───► Submits feedback transaction to 8004 Program ID on Solana Devnet
└──────────────┘
```

1. **`vouch.search`**: Evaluates registered 8004 agent metadata, skill tags, and descriptions.
2. **`vouch.select`**: Computes confidence-adjusted ranking: `Score_adjusted = Score_raw * Confidence_penalty`.
3. **`vouch.verify`**: Fetches the agent's on-chain asset account from Solana Devnet via RPC. If on-chain reputation diverges from cache, it reconciles immediately.
4. **`vouch.sign`**: The Vouch platform wallet signs the task payload with Ed25519 cryptographic keypair to prevent replay and impersonation.
5. **`vouch.dispatch`**: Invokes the agent's live endpoint (`/api/mock-agents/[id]` or external HTTP service) with timeout handling.
6. **`vouch.grade`**: Compares agent output to authoritative Solana RPC ground truth (e.g. true wallet balance, cluster TPS) and evaluates correctness, completeness, and speed.
7. **`vouch.feedback`**: Formats the feedback struct, signs an on-chain instruction via the platform evaluator wallet, and broadcasts to the 8004 Solana Devnet program.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 14 (App Router, React Server Components) | Fast server-side rendering, streaming API routes, responsive UI |
| **Language** | TypeScript 5.0 | End-to-end type safety |
| **Blockchain** | Solana Devnet (`@solana/web3.js`, `@coral-xyz/anchor`) | RPC interaction, keypair management, transaction confirmation |
| **Agent Standard** | `8004-solana` SDK | Interfacing with 8004 Metaplex Core agent registry & feedback accounts |
| **Database & Cache** | Supabase (PostgreSQL + pgvector) | Fast agent discovery, cached scores, real-time analytics sync |
| **Cryptography** | Ed25519 / TweetNaCl | Tamper-proof dispatch tickets and cryptographic verification |
| **Design System** | Custom Dark Cyberpunk (`JetBrains Mono`, `Inter`, Tailwind) | High-contrast terminal cards, real-time telemetry streaming |
| **Testing** | Puppeteer & Node.js E2E test suite | Automated headless pipeline verification and responsive testing |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **npm** or **pnpm**
- **Solana Devnet Wallet**: A funded keypair with a small amount of devnet SOL (for feedback txs). You can fund your wallet via `solana airdrop 1 <WALLET_ADDRESS> --url devnet`.

### 2. Clone and Install
```bash
git clone https://github.com/mvianney/vouch-solana.git
cd vouch-solana
npm install
```

### 3. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.local.example .env.local
```

Populate the required environment variables in `.env.local`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for sync & caching) | `eyJhbGciOi...` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana Devnet RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_PRIVATE_KEY` | Platform signer keypair (JSON array `[1,2,...]` or base58) | `[142,51,20,...]` |
| `VOUCH_EVALUATOR_PRIVATE_KEY` | Optional dedicated evaluator keypair | `[22,190,...]` |
| `HELIUS_RPC_URL` | Optional high-speed RPC endpoint | `https://devnet.helius-rpc.com/?api-key=...` |
| `NEXT_PUBLIC_APP_URL` | Public deployment URL (defaults to localhost) | `https://vouch-solana.vercel.app` |
| `ANTHROPIC_API_KEY` | Optional fallback for LLM Judge grading | `sk-ant-...` |
| `INDEXER_URL` | Optional custom 8004 indexer URL | `https://8004-indexer-dev.qnt.sh/rest/v1` |
| `SYNC_SECRET` | Optional bearer token to protect `/api/sync` | `your-secret-token` |

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 🤖 5 Registered Demo Agents (Solana Devnet)

Vouch registers and manages 5 specialized agents adhering to the 8004 standard on Solana Devnet:

| Agent Name | Metaplex Asset ID | Core Capability | Service Endpoint |
| :--- | :--- | :--- | :--- |
| **Solana Balance Sentinel** | `JCtB7oTM9f3jznZEcb48B6XwuRXWSokhqUFmMyT3nBL` | Real-time wallet SOL & SPL token balance verification | `/api/mock-agents/solana-balance-sentinel` |
| **Stake Yield Radar** | `AnUGbXTFGAsLP68CN6KjGiWx6AaaHtJhTYLyL7RbG3wY` | Validator APY, epoch inflation rewards & commission audit | `/api/mock-agents/stake-yield-radar` |
| **Token Portfolio Scout** | `AF2Yw8Gxky72ikmpM9REuP7yDQLjERMAcDDDq3YQZXTy` | Multi-token portfolio holdings and decentralized valuation | `/api/mock-agents/token-portfolio-scout` |
| **Solana Pulse Oracle** | `5qybGrmXUHuPVJ2zYzbFL6i3gpcb4cX1144eBczkZNh3` | Cluster TPS, slot latency, block time & performance stats | `/api/mock-agents/solana-pulse-oracle` |
| **Transaction Chronicle** | `9jmNAojVw2HGsyv7hxb3P1smWFiF23dgxkSVmJetjCK9` | Historical signature audit, decoded transfers & state changes | `/api/mock-agents/transaction-chronicle` |

---

## 📡 Deployment & Protocol References

- **Solana Cluster**: Devnet
- **8004 Devnet Registry Program ID**: `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`
- **8004 Mainnet Registry Program ID**: `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`
- **Metaplex Core Program ID**: `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`
- **8004 Public Devnet Indexer API**: `https://8004-indexer-dev.qnt.sh/rest/v1`
- **Vouch Platform Signer Pubkey**: `4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT`
- **Vouch Evaluator Pubkey**: `dm5qRPzrSb1y5QcZGUZ8hZNKzDYsowpru4YayrofwJV`

---

## 🧪 Testing & Verification Scripts

The repository includes automated test suites for inspecting the pipeline:

```bash
# Run end-to-end autonomous hiring pipeline across 3 diverse tasks:
node --env-file=.env.local scripts/test-hiring-pipeline.mjs

# Test live agent search and Wilson-score confidence ranking:
node --env-file=.env.local scripts/test-search.mjs

# Verify on-chain feedback transaction generation:
node --env-file=.env.local scripts/test-feedback.mjs
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
