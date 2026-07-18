var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ResourceDecorator as Resource } from '@nitrostack/core';
import { core, apps, policy } from './client.js';
import { OPS_POLICY } from './policy.data.js';
import { getActionLog } from './audit.js';
export class K8sResources {
    async topology(uri, _ctx) {
        const [nodes, deps] = await Promise.all([core.listNode(), apps.listDeploymentForAllNamespaces()]);
        const body = {
            nodes: nodes.items.map((n) => ({
                name: n.metadata?.name,
                unschedulable: n.spec?.unschedulable ?? false,
            })),
            deployments: deps.items.map((d) => ({
                name: d.metadata?.name,
                namespace: d.metadata?.namespace,
                replicas: d.spec?.replicas,
                ready: d.status?.readyReplicas,
            })),
        };
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
    }
    async budgets(uri, _ctx) {
        const pdbs = await policy.listPodDisruptionBudgetForAllNamespaces();
        const body = {
            policyFloors: OPS_POLICY.minReplicas,
            pdbs: pdbs.items.map((b) => ({
                name: b.metadata?.name,
                namespace: b.metadata?.namespace,
                minAvailable: b.spec?.minAvailable,
                desiredHealthy: b.status?.desiredHealthy,
                currentHealthy: b.status?.currentHealthy,
                disruptionsAllowed: b.status?.disruptionsAllowed,
            })),
        };
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
    }
    async actions(uri, _ctx) {
        return {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getActionLog(), null, 2) }],
        };
    }
}
__decorate([
    Resource({
        uri: 'k8s://cluster/topology',
        name: 'Cluster Topology',
        description: 'Live nodes, namespaces, and deployments — the shared map both agents reason over.',
        mimeType: 'application/json',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], K8sResources.prototype, "topology", null);
__decorate([
    Resource({
        uri: 'k8s://policy/disruption-budgets',
        name: 'Disruption Budgets & Floors',
        description: 'Live PodDisruptionBudget status plus ops policy min-replica floors — the veto basis.',
        mimeType: 'application/json',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], K8sResources.prototype, "budgets", null);
__decorate([
    Resource({
        uri: 'k8s://actions/log',
        name: 'Remediation Audit Log',
        description: 'Append-only log of every executed and rejected action with rationale.',
        mimeType: 'application/json',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], K8sResources.prototype, "actions", null);
