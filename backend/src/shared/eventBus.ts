export type EventHandler<T = any> = (payload: T) => void

class InMemoryEventBus {
  private subs = new Map<string, Set<EventHandler>>()

  publish<T>(topic: string, payload: T) {
    const handlers = this.subs.get(topic)
    if (!handlers) return
    for (const handler of handlers) handler(payload)
  }

  subscribe<T>(topic: string, handler: EventHandler<T>) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set())
    this.subs.get(topic)!.add(handler as EventHandler)
    return () => this.subs.get(topic)!.delete(handler as EventHandler)
  }
}

export const EventBus = new InMemoryEventBus()
