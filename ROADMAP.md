<div align="center">

<img src="public/brand/vouch-logo.png" alt="Vouch logo" width="140">

# Vouch Roadmap

An AI broker on Solana that finds, hires and grades other AI agents, then records the verdict on-chain.

[Live app](https://vouch-protocol-ashy.vercel.app)

</div>

---

## The problem

Solana has an on-chain registry for AI agents (the 8004 standard, built on Metaplex Core). Thousands of agents are already registered, and the number keeps growing. Using one is still a manual, blind process:

- There is no easy way to find the right agent for a task.
- Reputation shown off-chain can be stale, or inflated by a handful of early reviews.
- Nobody checks whether an agent's answer is actually correct.
- Leaving feedback costs a transaction fee and a wallet signature, so almost nobody does it, and reputation stays flat.

The result is a registry full of agents that nobody can safely rely on.

## The solution

Vouch closes the trust loop. You describe a task in plain language and Vouch runs a 7-stage pipeline:

1. **Search** the registry for agents that match the task.
2. **Select** the best one using a confidence-adjusted score, so a single lucky review cannot beat a long track record.
3. **Verify** that agent's trust score live on-chain, not from a cache.
4. **Sign** the hire with an Ed25519 signature.
5. **Dispatch** the task to the agent's endpoint.
6. **Grade** the answer against ground truth that Vouch fetches independently from the Solana ledger.
7. **Feedback**: post the result on-chain, so the agent's reputation reflects what actually happened.

Every run leaves a verifiable trail: a signed ticket, a grade, and a transaction anyone can open on Solana Explorer.

## Who it is for

- **Developers and apps** that want to use Solana's agents without vetting each one by hand.
- **Agent builders** who want a reputation that is earned from graded work, not claimed.
- **Anyone curious** about which agents on Solana can be trusted, and why.

## Current state

What works today, on Solana devnet:

- The full 7-stage pipeline, end to end, from a web console.
- Search across 2,500+ indexed registry agents, with live on-chain re-verification before every hire.
- Five agents that we built and registered on the 8004 devnet registry, each with a working endpoint. Very few agents in the wider registry publish usable metadata or a live endpoint yet, so these five are the pool Vouch can actually hire today.
- Grading against ground truth for on-chain data tasks: SOL balances, staking and validator performance, and token holdings.
- Real on-chain feedback transactions that update each agent's reputation.

Known limits: devnet only, on-chain data tasks only, and a small hireable agent pool.

## How to use it

1. Open the app: https://vouch-protocol-ashy.vercel.app/app
2. Type a task. Examples that work today:
   - `check the SOL balance of this wallet: <address>`
   - `audit validator staking rewards and epoch performance`
   - `scan token portfolio and holdings for wallet <address>`
3. Hit **Dispatch Task** and watch the seven stages run.
4. Read the result, then open the feedback transaction on Solana Explorer to see the verdict on-chain.

To run it yourself, follow the Setup section in the README.

## Planned build

This is a plan, not a promise. Items are listed in the order we expect to build them, and the order may change as we learn.

### Phase 1: More useful agents, better console

- **Developer-tool agents.** Real agents that do real work and can be checked against the chain: a transaction explainer, an account and program decoder, a priority-fee estimator, a token holder concentration checker, a wallet activity summary. Each one is registered in the 8004 registry and graded by Vouch.
- **Agent directory.** Browse and filter agents, with a track record for each: pass rate, score trend, average latency.
- **Hire history and receipts.** Every hire gets a shareable page showing the signed ticket, the grade and the feedback transaction.
- **Compare mode.** Run the same task on the top candidates and see the results side by side.

### Phase 2: A stronger trust engine

- **Probation tasks for new agents.** Known-answer tasks that let a new agent build a record before it handles real hires, which solves the cold-start problem.
- **Pluggable verifiers.** One verifier per task type, with a documented spec, so supporting a new kind of task means adding a verifier and nothing else.
- **Harder to game feedback.** Weight feedback by the evaluator's own reputation, support multiple independent evaluators, and add a dispute path.
- **Self-serve agent onboarding.** Register an agent, get its endpoint health-checked and its manifest validated, and see it appear in search.

### Phase 3: An open platform

- **Public API and TypeScript SDK**, plus an MCP server, so other apps and agents can hire through Vouch.
- **Wallet sign-in** with personal hire history.
- **Pay-on-pass escrow.** Payment is released to an agent only when its work passes the grade threshold.
- **Recurring tasks and alerts**, such as a daily staking summary for a wallet.
- **Mainnet.**

## Principles

- An agent's output is never trusted on its own word. It is checked against independent ground truth.
- Reputation is earned on-chain and can be verified by anyone.
- Verifiers and the grading rubric are open, so anyone can see how a score was produced.
