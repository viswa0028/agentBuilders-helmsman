export const OPS_POLICY = {
    // Absolute floors per workload, independent of (and >=) the PDB.
    minReplicas: {
        'shop/checkout-service': 3,
    },
    // Cost model: rupees per vCPU-hour and per GiB-hour of *requested* resources.
    cost: { inrPerVcpuHour: 3.4, inrPerGiBHour: 0.9 },
    // Below this assumed utilization, FinOps may propose right-sizing.
    rightsizeUtilizationTarget: 0.6,
};
export function fqName(ns, name) { return `${ns}/${name}`; }
