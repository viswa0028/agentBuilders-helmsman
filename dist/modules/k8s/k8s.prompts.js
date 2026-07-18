var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PromptDecorator as Prompt } from '@nitrostack/core';
import { getActionLog } from './audit.js';
export class K8sPrompts {
    async healthBrief(args, _ctx) {
        return [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `You are the HelmsMan platform analyst. First call get_cluster_state and get_pod_health, then write a
brief for ${args.lead_name ?? 'the Platform Lead'} using these headers:
## Posture (one line: healthy/degraded)
## Cost (total est INR/hr, and any over-provisioned deployments)
## Risks (pods not Ready, restart storms, cordoned nodes)
## Recommendation (one right-sizing or reliability action)
Use only real tool data. Do not invent numbers.`,
                },
            },
        ];
    }
    async changeRecord(_args, _ctx) {
        return [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Produce a change record from this audit log. Headers:
## Executed Changes (action, target, rationale)
## Blocked Changes (action, target, and the exact PDB/policy veto reason — emphasize availability protection)
## Net Effect (replicas/cost before vs after)
Audit log JSON:
${JSON.stringify(getActionLog(), null, 2)}`,
                },
            },
        ];
    }
}
__decorate([
    Prompt({
        name: 'cluster_health_brief',
        description: 'Executive cluster health + cost brief for the platform lead.',
        arguments: [{ name: 'lead_name', description: 'Who to address', required: false }],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], K8sPrompts.prototype, "healthBrief", null);
__decorate([
    Prompt({
        name: 'change_record',
        description: 'Turn the remediation audit log into a formal change record, highlighting vetoes.',
        arguments: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], K8sPrompts.prototype, "changeRecord", null);
