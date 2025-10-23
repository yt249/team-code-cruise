class InMemoryQuoteStore {
    quotes = new Map();
    async save(record) {
        this.cleanup();
        this.quotes.set(record.id, record);
    }
    async get(id) {
        this.cleanup();
        return this.quotes.get(id);
    }
    async delete(id) {
        this.quotes.delete(id);
    }
    async clear() {
        this.quotes.clear();
    }
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.quotes.entries()) {
            if (value.expiresAt.getTime() <= now)
                this.quotes.delete(key);
        }
    }
}
export const QuoteStore = new InMemoryQuoteStore();
