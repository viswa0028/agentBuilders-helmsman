import { core, apps, policy } from '../modules/k8s/client.js';
import { OPS_POLICY, fqName } from '../modules/k8s/policy.data.js';
import { evaluateScale } from '../modules/k8s/safety.js';
import { recordAction, getActionLog } from '../modules/k8s/audit.js';
// ── helpers (same as k8s.tools.ts) ──────────────────
function cpuToVcpu(req) {
    if (!req)
        return 0;
    return req.endsWith('m') ? parseInt(req) / 1000 : parseFloat(req);
}
function memToGiB(req) {
    if (!req)
        return 0;
    if (req.endsWith('Mi'))
        return parseInt(req) / 1024;
    if (req.endsWith('Gi'))
        return parseFloat(req);
    return 0;
}
// ── tool dispatch ───────────────────────────────────
export async function executeTool(name, input) {
    switch (name) {
        case 'get_cluster_state':
            return getClusterState(input);
        case 'get_pod_health':
            return getPodHealth(input);
        case 'check_disruption_safety':
            return checkDisruptionSafety(input);
        case 'scale_deployment':
            return scaleDeployment(input);
        case 'rollback_deployment':
            return rollbackDeployment(input);
        case 'cordon_node':
            return cordonNode(input);
        default:
            return { error: `Unknown tool: ${name}` };
    }
}
// ── tool implementations ────────────────────────────
async function getClusterState(input) {
    const ns = input.namespace ?? 'shop';
    const nodeList = await core.listNode();
    const depList = await apps.listNamespacedDeployment({ namespace: ns });
    const nodes = nodeList.items.map((n) => ({
        name: n.metadata?.name,
        unschedulable: n.spec?.unschedulable ?? false,
        allocatableCpu: n.status?.allocatable?.['cpu'],
        allocatableMem: n.status?.allocatable?.['memory'],
    }));
    const deployments = depList.items.map((d) => {
        const replicas = d.spec?.replicas ?? 0;
        const c = d.spec?.template?.spec?.containers?.[0];
        const vcpu = cpuToVcpu(c?.resources?.requests?.['cpu']);
        const gib = memToGiB(c?.resources?.requests?.['memory']);
        const costPerHr = replicas * (vcpu * OPS_POLICY.cost.inrPerVcpuHour + gib * OPS_POLICY.cost.inrPerGiBHour);
        return {
            name: d.metadata?.name,
            namespace: ns,
            replicas,
            readyReplicas: d.status?.readyReplicas ?? 0,
            requestPerPod: { vcpu, gib },
            estCostInrPerHr: Number(costPerHr.toFixed(2)),
            minReplicasPolicy: OPS_POLICY.minReplicas[fqName(ns, d.metadata?.name ?? '')] ?? 1,
        };
    });
    return { namespace: ns, nodes, deployments, totalDeployments: deployments.length };
}
async function getPodHealth(input) {
    const ns = input.namespace ?? 'shop';
    const pods = await core.listNamespacedPod({ namespace: ns });
    return {
        namespace: ns,
        pods: pods.items.map((p) => ({
            name: p.metadata?.name,
            phase: p.status?.phase,
            ready: p.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True',
            restarts: p.status?.containerStatuses?.reduce((a, cs) => a + (cs.restartCount ?? 0), 0) ?? 0,
            node: p.spec?.nodeName,
        })),
    };
}
async function checkDisruptionSafety(input) {
    const ns = input.namespace ?? 'shop';
    const name = input.name;
    const targetReplicas = input.targetReplicas;
    const dep = await apps.readNamespacedDeployment({ name, namespace: ns });
    const current = dep.spec?.replicas ?? 0;
    const pdbs = await policy.listNamespacedPodDisruptionBudget({ namespace: ns });
    const appLabel = dep.spec?.selector?.matchLabels?.['app'];
    const pdb = pdbs.items.find((b) => b.spec?.selector?.matchLabels?.['app'] === appLabel);
    const decision = evaluateScale({
        currentReplicas: current,
        targetReplicas: targetReplicas,
        minReplicasPolicy: OPS_POLICY.minReplicas[fqName(ns, name)] ?? 1,
        pdbDesiredHealthy: pdb?.status?.desiredHealthy ?? 0,
        pdbDisruptionsAllowed: pdb?.status?.disruptionsAllowed ?? 0,
    });
    return {
        deployment: fqName(ns, name),
        currentReplicas: current,
        targetReplicas,
        pdb: pdb
            ? {
                name: pdb.metadata?.name,
                desiredHealthy: pdb.status?.desiredHealthy,
                disruptionsAllowed: pdb.status?.disruptionsAllowed,
                currentHealthy: pdb.status?.currentHealthy,
            }
            : null,
        decision,
    };
}
async function scaleDeployment(input) {
    const ns = input.namespace ?? 'shop';
    const name = input.name;
    const replicas = input.replicas;
    const rationale = input.rationale ?? '';
    const proposedBy = input.proposedBy ?? 'FinOpsAgent';
    // safety gate
    const safety = await checkDisruptionSafety({ name, namespace: ns, targetReplicas: replicas });
    const decision = safety.decision;
    if (!decision.allowed) {
        const rec = {
            timestamp: new Date().toISOString(),
            action: 'scale_deployment',
            target: fqName(ns, name),
            detail: { replicas, pdb: safety.pdb },
            proposedBy,
            status: 'REJECTED',
            reason: decision.reason,
        };
        recordAction(rec);
        return { ok: false, rejected: true, reason: decision.reason, safety };
    }
    const scale = await apps.readNamespacedDeploymentScale({ name, namespace: ns });
    scale.spec = { replicas };
    await apps.replaceNamespacedDeploymentScale({ name, namespace: ns, body: scale });
    const rec = {
        timestamp: new Date().toISOString(),
        action: 'scale_deployment',
        target: fqName(ns, name),
        detail: { replicas, rationale },
        proposedBy,
        status: 'EXECUTED',
    };
    recordAction(rec);
    return { ok: true, scaledTo: replicas, auditLogSize: getActionLog().length };
}
async function rollbackDeployment(input) {
    const ns = input.namespace ?? 'shop';
    const name = input.name;
    const dep = await apps.readNamespacedDeployment({ name, namespace: ns });
    const selector = Object.entries(dep.spec?.selector?.matchLabels ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
    const rsList = await apps.listNamespacedReplicaSet({ namespace: ns, labelSelector: selector });
    const owned = rsList.items
        .filter((rs) => rs.metadata?.ownerReferences?.some((o) => o.name === name))
        .sort((a, b) => Number(b.metadata?.annotations?.['deployment.kubernetes.io/revision'] ?? 0) -
        Number(a.metadata?.annotations?.['deployment.kubernetes.io/revision'] ?? 0));
    const prev = owned[1];
    if (!prev?.spec?.template)
        return { ok: false, reason: 'No previous revision.' };
    dep.spec.template = prev.spec.template;
    await apps.replaceNamespacedDeployment({ name, namespace: ns, body: dep });
    recordAction({
        timestamp: new Date().toISOString(),
        action: 'rollback_deployment',
        target: fqName(ns, name),
        detail: { toRevision: prev.metadata?.annotations?.['deployment.kubernetes.io/revision'] },
        proposedBy: 'Operator',
        status: 'EXECUTED',
    });
    return { ok: true, rolledBackTo: prev.metadata?.annotations?.['deployment.kubernetes.io/revision'] };
}
async function cordonNode(input) {
    const nodeName = input.node;
    const rationale = input.rationale ?? '';
    const nodes = await core.listNode();
    const schedulable = nodes.items.filter((n) => !n.spec?.unschedulable);
    const already = nodes.items.find((n) => n.metadata?.name === nodeName)?.spec?.unschedulable;
    if (schedulable.length <= 1 && !already) {
        const reason = 'VETO: cordoning the last schedulable node would strand all workloads.';
        recordAction({
            timestamp: new Date().toISOString(),
            action: 'cordon_node',
            target: nodeName,
            detail: {},
            proposedBy: 'Operator',
            status: 'REJECTED',
            reason,
        });
        return { ok: false, rejected: true, reason };
    }
    const node = await core.readNode({ name: nodeName });
    node.spec = { ...node.spec, unschedulable: true };
    await core.replaceNode({ name: nodeName, body: node });
    recordAction({
        timestamp: new Date().toISOString(),
        action: 'cordon_node',
        target: nodeName,
        detail: { rationale },
        proposedBy: 'Operator',
        status: 'EXECUTED',
    });
    return { ok: true, cordoned: nodeName };
}
