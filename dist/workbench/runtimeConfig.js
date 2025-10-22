export const DATA_MODE_MEMORY = 'memory';
export function getDataMode() {
    return process.env.RB_DATA_MODE?.toLowerCase() === DATA_MODE_MEMORY ? DATA_MODE_MEMORY : 'prisma';
}
export function isMemoryMode() {
    return getDataMode() === DATA_MODE_MEMORY;
}
