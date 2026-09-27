# Vouch — Hackathon Submission Summaries

Ready-to-paste submission drafts for hackathon form submission.

---

## 📋 TRACK 1 SUBMISSION FORM

### 1. Problem
The Solana 8004 agent standard enables any autonomous agent to be registered on Metaplex Core, creating a vibrant directory of over 2,500+ on-chain agents. However, using these agents presents severe roadblocks:
- **Zero Discoverability**: Users and dApps have no semantic way to find which agent matches a specific task.
- **Unverified Reputation**: Off-chain directories show cached numbers that frequently diverge from live on-chain truth, and raw score averages are susceptible to low-sample gaming.
- **Unchecked Execution**: Agents can hallucinate or fail silently with zero objective validation.
- **Broken Feedback Loop**: Because submitting feedback requires an on-chain transaction and gas fees, users almost never write reviews. As a result, on-chain agent reputation remains dormant.

### 2. User
- **Web3 Protocols & dApps**: Needing reliable, autonomous Solana offloading (e.g. validator performance monitoring, liquid staking yield scouting, token holdings analysis) without manual oversight.
- **AI Agent Networks**: Autonomous swarms needing to discover and delegate specialized sub-tasks to other vetted on-chain agents with cryptographic certainty.
- **Solana Power Users**: Looking for a reliable concierge to execute complex Solana queries and audits safely.

### 3. Product
**Vouch** is an autonomous AI agent broker and verification protocol on Solana. Users simply provide a natural language prompt (e.g., *"check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT"*). Vouch executes an end-to-end 7-stage pipeline:
1. **Search**: High-speed hybrid vector and semantic search across 2,500+ indexed agents.
2. **Select**: Confidence-weighted ranking balancing raw reputation against sample count (Wilson-score lower bound).
3. **Verify**: Pre-flight Solana RPC check verifying the agent's live Metaplex Core asset state against the cache.
4. **Sign**: Issues an Ed25519 cryptographic authorization ticket stamped with a unique nonce and short-lived expiration TTL.
5. **Dispatch**: Dispatches the task to the agent's verified service endpoint.
6. **Grade**: Dual verification evaluating the agent's output against deterministic Solana RPC ground truth and a multi-factor rubric (correctness, completeness, speed).
7. **Feedback**: Automatically constructs, signs, and broadcasts an on-chain transaction to the 8004 program on Solana Devnet, permanently recording verified performance.

### 4. AI
- **Semantic Intent Routing**: Natural language parsing that extracts target parameters, network requirements, and capability filters to match appropriate agent skills.
- **Wilson-Score Statistical Ranking**: Penalizes small sample sizes so an agent with 1 five-star review cannot outrank an agent with 500 four-star reviews.
- **Ground-Truth AI Judge**: Evaluates agent outputs against authoritative Solana cluster data, computing structured correctness percentages, latency metrics, and discrepancy diffs.

### 5. Solana Layer
- **8004 Standard Integration**: Full integration with the Metaplex Core 8004 agent registry program (`8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`).
- **Cryptographic Authorization**: Native Ed25519 signing using Solana keypairs to create tamper-proof dispatch envelopes.
- **Real-Time RPC Verification**: Direct on-chain queries to Solana Devnet RPC nodes verifying asset existence and reputation state before dispatch.
- **Autonomous Feedback Transactions**: Every completed job broadcasts an on-chain Solana transaction that writes feedback index records and updates agent reputation on-chain.

### 6. Distribution
- **Interactive Web Broker Console**: Clean, cyberpunk-styled dashboard (`vouch-solana.vercel.app/app`) providing real-time telemetry and comparison tables.
- **Developer API**: REST endpoints (`/api/hire`, `/api/agents/search`, `/api/stats`) allowing any Telegram bot, Discord bot, or frontend to broker agent tasks through Vouch.
- **Autonomous Sync Worker**: Background cron synchronization keeping Supabase aligned with the public 8004 indexer and Solana RPC state.

### 7. Future
- **Mainnet-Beta Launch**: Migration to the 8004 mainnet program (`8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`).
- **Conditional Escrow Contracts**: Program-enforced micro-payments held in escrow and released to the agent only if Vouch AI Judge confirms a passing grade (>80%).
- **Multi-Node Evaluator Consensus**: Decentralized quorum of evaluators signing off on grading verdicts for high-value enterprise queries.

### 8. Team
- **Michael Vianney** (`mvianney`): Full-stack Solana and AI engineer. Built Vouch end-to-end including 8004 SDK integration, cryptographic ticket signing, Next.js 14 frontend, Supabase hybrid search, and on-chain feedback broadcast.

---

## 📋 TRACK 2 SUBMISSION FORM

### Project Name & Tagline
- **Project Name**: Vouch
- **Tagline**: Autonomous AI Agent Broker & Reputation Protocol on Solana

### Problem & Product
- **Problem**: Over 2,500 AI agents are registered on Solana's 8004 registry, but users have no autonomous way to discover them, no way to verify if their on-chain reputation is genuine, and no guarantee that their responses are accurate. Additionally, because on-chain feedback requires gas and wallet signatures, almost no post-task feedback is ever submitted.
- **Product**: Vouch is an autonomous agent broker that closes the loop. It takes any user prompt, semantically searches the 8004 registry, verifies live on-chain trust scores, issues Ed25519-signed dispatch tickets, grades responses against Solana RPC ground truth, and autonomously broadcasts feedback transactions back to the Solana 8004 program.

### Solana Integration
- **Framework**: `8004-solana` SDK on Metaplex Core.
- **Devnet Program ID**: `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`.
- **Pre-Flight RPC Check**: Real-time read of the agent's Metaplex Core asset account prior to task execution.
- **Ed25519 Signatures**: Cryptographic platform tickets generated using TweetNaCl / Ed25519 keypairs.
- **On-Chain Feedback**: Direct on-chain instructions broadcasting evaluation feedback, score updates, and category tags to Solana Devnet.

### Live MVP / Test Link
- **Live Application**: [https://vouch-solana.vercel.app](https://vouch-solana.vercel.app)
- **Interactive Broker Console**: [https://vouch-solana.vercel.app/app](https://vouch-solana.vercel.app/app)
- **Official X**: [@vouch_solana](https://x.com/vouch_solana)
- **GitHub Repository**: [https://github.com/mvianney/vouch-solana](https://github.com/mvianney/vouch-solana)

#### Confirmed On-Chain Devnet Transactions
- [Feedback Tx #1 (3J4BSarY...NxvyHEd)](https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet)
- [Feedback Tx #2 (4iCjpX1W...sw3A)](https://explorer.solana.com/tx/4iCjpX1WMBQKLPauFemp8HuEEbz2y7Jn8aQnVZPLkKTx1mBfuKuhxTknFNu33VUeb1toW8JVogMyyy6GzCQ9sw3A?cluster=devnet)

### Deployment Details
- **Frontend / Hosting**: Next.js 14 on Vercel
- **Database**: Supabase PostgreSQL with vector indexing (`pgvector`)
- **Network**: Solana Devnet
- **5 Registered 8004 Demo Agents (Devnet Asset IDs)**:
  1. `Solana Balance Sentinel`: `JCtB7oTM9f3jznZEcb48B6XwuRXWSokhqUFmMyT3nBL`
  2. `Stake Yield Radar`: `AnUGbXTFGAsLP68CN6KjGiWx6AaaHtJhTYLyL7RbG3wY`
  3. `Token Portfolio Scout`: `AF2Yw8Gxky72ikmpM9REuP7yDQLjERMAcDDDq3YQZXTy`
  4. `Solana Pulse Oracle`: `5qybGrmXUHuPVJ2zYzbFL6i3gpcb4cX1144eBczkZNh3`
  5. `Transaction Chronicle`: `9jmNAojVw2HGsyv7hxb3P1smWFiF23dgxkSVmJetjCK9`
- **Platform Signer Pubkey**: `4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT`
- **Evaluator Pubkey**: `dm5qRPzrSb1y5QcZGUZ8hZNKzDYsowpru4YayrofwJV`
