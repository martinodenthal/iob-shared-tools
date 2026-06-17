class States {
    static get(id, fallback = null) {
        const state = getState(id);
        return (state && state.val !== null) ? state.val : fallback;
    }

    static getJson(id, fallback = null) {
        const val = States.get(id);
        if (val === null) return fallback;
        try {
            return JSON.parse(val);
        } catch {
            return fallback;
        }
    }

    static set(id, value, ack = false) {
        if (existsState(id)) {
            setState(id, value, ack);
        }
    }

    static createIfMissing(id, value, common) {
        if (!existsState(id)) {
            createState(id, value, common);
        }
    }

    static createOrSet(id, value, common) {
        if (!existsState(id)) {
            createState(id, value, common);
        } else {
            setState(id, value);
        }
    }
}

module.exports = { States };