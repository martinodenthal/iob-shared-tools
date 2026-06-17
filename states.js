class States {
    constructor(api = {}) {
        this.getState = api.getState ?? getState;
        this.setState = api.setState ?? setState;
        this.existsState = api.existsState ?? existsState;
        this.createState = api.createState ?? createState;
    }

    get(id, fallback = null) {
        try {
            const state = this.getState(id);
            if (!state || state.val === null || state.val === undefined) return fallback;
            return state.val;
        } catch {
            return fallback;
        }
    }

    getJson(id, fallback = null) {
        try {
            const state = this.getState(id);
            if (!state || state.val === null || state.val === undefined) return fallback;
            const val = state.val;
            if (typeof val === 'object') return val;
            if (typeof val === 'string') return JSON.parse(val);
            return fallback;
        } catch {
            return fallback;
        }
    }

    set(id, value, ack = false) {
        try {
            if (this.existsState(id)) {
                this.setState(id, value, ack);
            }
        } catch {
            // ignorieren
        }
    }

    createIfMissing(id, value, common) {
        try {
            if (!this.existsState(id)) {
                this.createState(id, value, common);
            }
        } catch {
            // ignorieren
        }
    }

    createOrSet(id, value, common) {
        try {
            if (!this.existsState(id)) {
                this.createState(id, value, common);
            } else {
                this.setState(id, value);
            }
        } catch {
            // ignorieren
        }
    }
}

module.exports = { States };