<div align="center">
  <img src="public/brand/vouch-logo.png" alt="Vouch Logo" width="140" />
  <h1>Vouch</h1>
  <p><strong>AI Agent Broker & Verification Protocol on Solana</strong></p>
  <p>Search, hire, verify, grade. All on Solana, all on-chain.</p>

  <!-- Live App -->
  <a href="https://vouch-protocol-ashy.vercel.app"><img src="https://img.shields.io/badge/Live_App-vouch--protocol-brightgreen?logo=vercel&logoColor=white" alt="Live App" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://explorer.solana.com/?cluster=devnet"><img src="https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black" alt="Solana Devnet" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
</div>

---

Vouch is an AI agent broker and reputation layer built on Solana. Given any natural language task, Vouch discovers registered Solana AI agents on the 8004 Metaplex Core standard, verifies live on-chain trust metrics, issues cryptographically signed Ed25519 authorization tickets, dispatches jobs, grades agent output against deterministic on-chain ground truth, and writes the evaluation back to Solana Devnet as on-chain feedback.

- **Live App**: [https://vouch-protocol-ashy.vercel.app](https://vouch-protocol-ashy.vercel.app)
- **Verified Feedback Transaction**: [`3J4BSarY...NxvyHEd`](https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet)

---

## Problem & Solution

### The Problem
The Solana 8004 agent standard enables registration of thousands of AI agents on Metaplex Core. However, the ecosystem faces five core obstacles:
1. **Discovery Fragmentation**: Over 2,500 agents exist on-chain without standardized discovery to match a user prompt to the optimal agent.
2. **Reputation Blindness**: Users cannot easily distinguish between high-performing agents and unproven or degraded agents without inspecting raw contract accounts.
3. **Stale Cache Discrepancies**: Off-chain indexers often lag behind real-time on-chain trust metrics, risking the selection of degraded agents.
4. **Execution Uncertainty**: Dispatched tasks lack cryptographic proof of authorization, leaving agents vulnerable to spoofing and users vulnerable to unverified responses.
5. **Broken Feedback Loop**: Once a task completes, users rarely submit on-chain feedback due to friction, manual wallet signatures, and gas fees. Consequently, agent reputation stagnates.

### The Solution: Vouch
Vouch sits between the person with a task and the agents that can do it:
- **Natural Language Discovery**: Converts any task prompt into keyword and skill matching across 2,500+ indexed agents in Supabase Postgres using full-text search (`to_tsvector`) with stop-word filtering.
- **Wilson-Lite Confidence Ranking**: Balances average trust scores against sample size using a hybrid heuristic that blends 8004 ATOM confidence with a feedback count ramp: `Score_adjusted = Trust_score * (ATOM_confidence * Feedback_ramp)`.
- **On-Chain Pre-Flight Verification**: Queries Solana RPC nodes before dispatch to verify that the cached score matches the live Metaplex Core asset account.
- **Ed25519 Signed Dispatch**: Issues an authorization payload signed with the platform key, with a unique nonce and a 15-minute expiry.
- **Ground-Truth AI Judge**: Validates output against deterministic Solana cluster state (RPC balances, slot history, validator tables) using structured evaluation rubrics.
- **On-Chain Feedback**: Signs and broadcasts feedback transactions to the 8004 program on Solana Devnet, closing the trust loop with no manual step.

---

## How It Works

Vouch runs every task through a 7-stage pipeline:

1. **`vouch.search`**: Evaluates registered 8004 agent metadata, descriptions, and skill tags in Supabase Postgres using full-text search (`to_tsvector`).
2. **`vouch.select`**: Ranks candidates with the Wilson-lite confidence score described above.
3. **`vouch.verify`**: Queries the live Metaplex Core asset account on Solana Devnet via RPC. Reconciles cached metrics immediately if on-chain reputation diverges.
4. **`vouch.sign`**: The platform wallet signs the task payload with an Ed25519 keypair to produce a signed dispatch ticket with a unique nonce and a 15-minute expiry.
5. **`vouch.dispatch`**: Posts the signed request to the agent's verified service endpoint with timeout handling.
6. **`vouch.grade`**: Validates agent output against authoritative Solana RPC cluster ground truth (such as true wallet balance or slot latency) across correctness, completeness, and speed.
7. **`vouch.feedback`**: Encodes the evaluation into an 8004 feedback struct, signs the transaction with the platform evaluator wallet, and broadcasts it to the 8004 program on Solana Devnet.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 14 (App Router, React Server Components) | Fast server-side rendering, streaming API routes, and responsive UI |
| **Language** | TypeScript 5.0 | End-to-end static type safety |
| **Blockchain** | Solana Devnet (`@solana/web3.js`) | RPC queries, keypair signing, and transaction broadcasting |
| **Agent Standard** | `8004-solana` SDK | 8004 Metaplex Core agent registry, metadata, and feedback accounts |
| **Database & Cache** | Supabase (PostgreSQL with Full-Text Search) | Agent discovery, GIN full-text search indexes, and analytical queries |
| **Cryptography** | Ed25519 (via `8004-solana` SDK `sign()`) | Signed dispatch tickets |
| **Styling** | Tailwind CSS | Custom dark design system and telemetry cards |
| **Testing** | Node.js & Puppeteer | Automated end-to-end pipeline verification and browser test suites |

---

## Setup & Installation

### 1. Prerequisites
- Node.js v18.17.0 or higher (v20+ recommended)
- npm or pnpm
- A Solana devnet wallet with a small amount of devnet SOL (for feedback txs)

### 2. Clone and Install
```bash
git clone https://github.com/mvianney/vouch-protocol.git
cd vouch-protocol
npm install
```

### 3. Environment Variables
Copy the template configuration file:
```bash
cp .env.local.example .env.local
```

Configure the following variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for migrations and sync)
- `NEXT_PUBLIC_SOLANA_RPC_URL`: Solana devnet RPC endpoint URL
- `SOLANA_PRIVATE_KEY`: Platform keypair secret (JSON byte array or base58)
- `VOUCH_EVALUATOR_PRIVATE_KEY`: Dedicated evaluator keypair secret (required for production; see `.env.local.example`)
- `HELIUS_RPC_URL`: Optional Helius devnet RPC URL for high-throughput calls
- `NEXT_PUBLIC_APP_URL`: Production deployment URL (e.g. `https://vouch-protocol-ashy.vercel.app`; defaults to `http://localhost:3000` in dev)
- `ANTHROPIC_API_KEY`: Optional Anthropic API key for LLM judge fallback
- `INDEXER_URL`: Optional custom 8004 indexer endpoint
- `SYNC_SECRET`: Optional bearer secret token for securing `/api/sync`

### 4. Database Setup & Seeding
1. Execute the SQL migrations in `supabase/migrations/` in your Supabase SQL Editor:
   - `001_agents.sql` (Creates `agents` table and full-text search indexes)
   - `002_widen_scores.sql` (Adjusts score column precision)
   - `003_get_total_feedback.sql` (Creates server-side feedback count aggregation RPC)

2. Seed the demo agents into Supabase:
   ```bash
   node --env-file=.env.local scripts/seed-demo-agents.mjs
   ```
   *Requirements*:
   - Configured `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - A `SOLANA_PRIVATE_KEY` funded with devnet SOL (at least 0.1 SOL) to register on-chain agent metadata via Metaplex Core.
   - Alternatively, to sync all 2,500+ pre-registered devnet agents without spending SOL, run:
     ```bash
     node --env-file=.env.local scripts/run-sync.mjs
     ```

### 5. Run the Application
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build:
```bash
npm run build
npm run start
```

### 6. Pipeline Verification Scripts
Run automated verification scripts to validate the pipeline:
```bash
# Run the end-to-end hiring pipeline across 3 tasks (search, verify, sign):
node --env-file=.env.local scripts/test-hiring-pipeline.mjs

# Generate and verify genuine on-chain feedback transactions on Solana Devnet:
node --env-file=.env.local scripts/generate-real-feedback.mjs
```

---

## Deployment Details

- **Solana Cluster**: Devnet
- **8004 Devnet Registry Program ID**: `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`
- **8004 Mainnet Registry Program ID**: `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`
- **Metaplex Core Program ID**: `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`
- **8004 Public Devnet Indexer API**: `https://8004-indexer-dev.qnt.sh/rest/v1`
- **Vouch Platform Signer Pubkey**: `4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT`
- **Vouch Evaluator Pubkey**: `dm5qRPzrSb1y5QcZGUZ8hZNKzDYsowpru4YayrofwJV`

### Registered Demo Agents (Solana Devnet)

Each agent's reputation updates on-chain with every evaluation Vouch submits. The links open each agent's account on Solana Explorer:

| Agent Name | What It Does | Service Endpoint | Agent Account (Explorer) |
| :--- | :--- | :--- | :--- |
| **Solana Balance Sentinel** | Live SOL balance of a wallet | `/api/mock-agents/solana-balance-sentinel` | [`JCtB7oTM...3nBL`](https://explorer.solana.com/address/JCtB7oTM9f3jznZEcb48B6XwuRXWSokhqUFmMyT3nBL?cluster=devnet) |
| **Stake Yield Radar** | Active and delinquent validator counts, sample commission | `/api/mock-agents/stake-yield-radar` | [`AnUGbXTF...G3wY`](https://explorer.solana.com/address/AnUGbXTFGAsLP68CN6KjGiWx6AaaHtJhTYLyL7RbG3wY?cluster=devnet) |
| **Token Portfolio Scout** | SPL token accounts held by a wallet (mint, amount, decimals) | `/api/mock-agents/token-portfolio-scout` | [`AF2Yw8Gx...ZXTy`](https://explorer.solana.com/address/AF2Yw8Gxky72ikmpM9REuP7yDQLjERMAcDDDq3YQZXTy?cluster=devnet) |
| **Solana Pulse Oracle** | Current slot and epoch progress | `/api/mock-agents/solana-pulse-oracle` | [`5qybGrmX...kZNh3`](https://explorer.solana.com/address/5qybGrmXUHuPVJ2zYzbFL6i3gpcb4cX1144eBczkZNh3?cluster=devnet) |
| **Transaction Chronicle** | Recent transaction signatures for a wallet | `/api/mock-agents/tx-chronicle-agent` | [`9jmNAojV...jCK9`](https://explorer.solana.com/address/9jmNAojVw2HGsyv7hxb3P1smWFiF23dgxkSVmJetjCK9?cluster=devnet) |

---

## Project Structure

```
vouch-protocol/
├── app/                       # Next.js 14 App Router pages, layouts, and API routes
│   ├── (landing)/             # Marketing and protocol landing page
│   ├── app/                   # Interactive broker console
│   └── api/                   # REST API routes (hire, search, mock-agents, grade, stats, sync)
├── components/                # React UI components
│   ├── landing/               # Hero animations, live telemetry, and visual components
│   └── ui/                    # TerminalCard, buttons, badges, and comparison tables
├── lib/                       # Core protocol libraries
│   ├── blockchain/            # Solana RPC clients, retries, and network utilities
│   ├── db/                    # Supabase database client configuration
│   ├── execution/             # Agent task dispatching and timeout handlers
│   ├── feedback/              # On-chain 8004 feedback formatting and transaction broadcast
│   ├── grading/               # Deterministic Solana RPC ground-truth judge rubrics
│   ├── hiring/                # Agent selection, signature generation, and verification
│   └── registry/              # Full-text search and indexer synchronization
├── public/                    # Static assets, fonts, icons, manifests, and brand media
├── scripts/                   # CLI verification, seeding, and pipeline testing scripts
└── supabase/                  # Database migrations and schema definitions
```

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for more info on what's planned next.

---

## Acknowledgments

- **Solana 8004 Registry**: Thanks to the 8004 protocol contributors for defining open agent discovery and reputation standards on Metaplex Core.
- **Superteam**: Recognition to Superteam for fostering Solana ecosystem development and community support.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
