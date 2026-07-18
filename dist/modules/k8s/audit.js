// ponytail: module-scoped array — persists within one warm instance, resets on restart.
// Upgrade path if durable audit is needed: swap these three functions for NitroCloud KV / Redis.
const log = [];
export const recordAction = (r) => { log.push(r); };
export const getActionLog = () => log;
