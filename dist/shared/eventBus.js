class InMemoryEventBus {
    subs = new Map();
    publish(topic, payload) {
        const handlers = this.subs.get(topic);
        if (!handlers)
            return;
        for (const handler of handlers)
            handler(payload);
    }
    subscribe(topic, handler) {
        if (!this.subs.has(topic))
            this.subs.set(topic, new Set());
        this.subs.get(topic).add(handler);
        return () => this.subs.get(topic).delete(handler);
    }
}
export const EventBus = new InMemoryEventBus();
