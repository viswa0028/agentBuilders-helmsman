# HelmsMan — Autonomous Kubernetes Remediation (NitroStack MCP server)

An MCP server that lets two agents (a cost-cutting **FinOps Agent** and an adversarial
**Availability Guardian**) negotiate over a **live Kubernetes cluster**. The Guardian's veto is not a
label — the server reads `PodDisruptionBudget.status` live and **refuses unsafe scale-downs in code**.

## Prerequisites
Node ≥ 18 · Docker Desktop · kind · kubectl · `npm i -g @nitrostack/cli` · NitroStudio · an OpenAI/Gemini key.

## Quick start
```bash
# 1. Live cluster + guarded workload  (needs Docker running)
powershell -File scripts/setup-cluster.ps1
#    or manually:
#    kind create cluster --name helmsman
#    kubectl create namespace shop
#    kubectl apply -f manifests/demo.yaml

# 2. Dependencies  (needs network)
npm install

# 3. Pin check — MUST be 1.x
npm ls @kubernetes/client-node

# 4. Verify the safety math first (no cluster needed)
npm run build && npm run test:safety      # -> safety self-check: OK

# 5. Run the MCP server, then open NitroStudio -> Select Project -> this folder -> Connect
npm run dev
```

## Files
- `src/modules/k8s/safety.ts` — the pure veto function (verified by `safety.test.ts`).
- `src/modules/k8s/k8s.tools.ts` — 6 tools incl. the server-side safety gate on `scale_deployment`.
- `src/modules/k8s/k8s.resources.ts` — 3 resources (topology, disruption-budgets, actions log).
- `src/modules/k8s/k8s.prompts.ts` — `cluster_health_brief`, `change_record`.
- `manifests/demo.yaml` — over-provisioned `checkout-service` (5 replicas) + PDB `minAvailable: 3`.

## The demo money-shot
In NitroStudio → Tools → `scale_deployment(name="checkout-service", replicas=1)` →
server returns `rejected:true` citing the live PDB. No AI required to prove the veto is real.
Then run the `change_record` prompt to show it logged under **Blocked Changes**.

Full step-by-step: see `../HELMSMAN_BUILD_GUIDE.md`.
