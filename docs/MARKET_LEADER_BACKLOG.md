# Lucrum Market-Leader Backlog (AI CFO)

This is the execution backlog for making Lucrum the best AI CFO platform for small SaaS companies.

Status key:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed

## North-Star Outcomes

- Increase founder cash survival: median runway uplift >= 20%.
- Protect recurring revenue: MRR at risk reduced >= 15%.
- Prove direct ROI: tracked savings + protected revenue > platform cost by 10x.

## Workstreams (All 20)

1. `[ ]` Real benchmark context
- Compare each company to peer cohorts by stage, ARPU, churn, and growth.
- Build anonymized benchmark model and percentile ranking endpoints.

2. `[ ]` Decision-grade forecasts
- Deliver probabilistic forecasts (P10/P50/P90) for runway and cash.
- Keep scenario confidence and calibration accuracy visible.

3. `[ ]` Unified data layer
- Ingest Stripe, bank feeds, ad spend, payroll, and SaaS vendor spend.
- Normalize to one financial fact model and canonical timeline.

4. `[ ]` Causal "why" engine
- Detect metric deltas and attribute likely drivers (price, churn, volume, fees, refunds).
- Return plain-language causality summaries with supporting numbers.

5. `[ ]` Action execution loop
- Convert recommendations into executable actions.
- Track execution outcome and feed result back into ranking logic.

6. `[ ]` Scenario copilot
- Natural-language what-if input with finance-safe assumptions.
- Persist scenarios, compare outcomes, and allow share/export.

7. `[ ]` Cash accuracy engine
- Model daily cash timing, Stripe payout delays, failed payments, and refund timing.
- Improve short-horizon forecast error with reconciliation jobs.

8. `[ ]` Churn early warning
- Account-level churn risk scoring with expected MRR at risk.
- Trigger retention playbooks before cancellation events.

9. `[ ]` Pricing intelligence
- Recommend pricing/packaging updates with expected LTV, churn, and margin impact.
- Simulate upside/downside before rollout.

10. `[ ]` Spend efficiency controls
- Detect waste by channel, vendor, and team.
- Add budget guardrails and alerting on variance thresholds.

11. `[ ]` Cohort economics clarity
- Show retention, CAC payback, CAC/LTV by segment and acquisition source.
- Support month, channel, and plan cohorts.

12. `[ ]` Confidence transparency
- Expose uncertainty bounds, data quality score, and assumption sensitivity.
- Block overconfident recommendations when data quality is weak.

13. `[ ]` Founder-mode UX
- Keep recommendations blunt, short, and decision-first.
- Every recommendation must include one next action and expected dollar impact.

14. `[ ]` Role-based outputs
- Produce founder summary, operator checklist, and board-ready monthly packet.
- Tailor tone, detail depth, and KPIs by role.

15. `[ ]` Continuous close
- Build near real-time mini-close with rolling reconciled ledgers.
- Remove lag between transactions and financial decision context.

16. `[ ]` Automated anomaly triage
- Detect and prioritize leaks, fraud signals, billing issues, and broken flows.
- Route anomalies by urgency and expected impact.

17. `[ ]` AI memory of prior decisions
- Persist recommendations, actions taken, and measured outcomes.
- Use memory to avoid repeated bad advice and improve future ranking.

18. `[ ]` Compliance by default
- Add approval workflows, immutable audit logs, least-privilege access, and SOC2-ready controls.
- Enforce data retention and access review policies.

19. `[ ]` Human-in-the-loop workflows
- Add CPA/revops review gates for high-impact actions.
- Support comment, approve, reject, and override loops.

20. `[ ]` Outcome leaderboard
- Show saved cash, runway extended, and MRR protected by action and time period.
- Use verified outcomes as product proof and growth loop.

## Build Order (Aggressive)

## Phase A (Weeks 1-3): Data + Forecast Core

- `#2` Decision-grade forecasts
- `#3` Unified data layer
- `#7` Cash accuracy engine
- `#12` Confidence transparency

## Phase B (Weeks 4-6): Diagnostics + Decisioning

- `#4` Causal "why" engine
- `#6` Scenario copilot
- `#8` Churn early warning
- `#11` Cohort economics clarity
- `#16` Automated anomaly triage

## Phase C (Weeks 7-9): Action + Monetization Intelligence

- `#5` Action execution loop
- `#9` Pricing intelligence
- `#10` Spend efficiency controls
- `#17` AI memory of prior decisions
- `#20` Outcome leaderboard

## Phase D (Weeks 10-12): Product Maturity + Trust

- `#1` Real benchmark context
- `#13` Founder-mode UX
- `#14` Role-based outputs
- `#15` Continuous close
- `#18` Compliance by default
- `#19` Human-in-the-loop workflows

## Delivery Discipline

- Every feature ships with:
  - clear input contracts
  - confidence and quality metadata
  - one measurable business KPI
- No recommendation ships without a tracked expected dollar impact.
