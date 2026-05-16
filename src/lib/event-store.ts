// Shared in-memory event store for SSE real-time delivery
// In production, replace with Redis pub/sub
export const eventStore: { ts: number; type: string; data: any }[] = [];

export function pushEvent(type: string, data: any) {
  eventStore.push({ ts: Date.now(), type, data });
  if (eventStore.length > 200) eventStore.shift();
}
