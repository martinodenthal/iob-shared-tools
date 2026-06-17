class States {
    static get(id, fallback = null) {
        try {
            const state = getState(id);
            return (state && state.val !== null) ? state.val : fallback;
        } catch {
            return fallback;
        }
    }

    static getJson(id, fallback = null) {
        try {
            const state = getState(id);
            if (!state || state.val === null || state.val === undefined) return fallback;
            const val = state.val;
            if (typeof val === 'object') return val;
            if (typeof val === 'string') return JSON.parse(val);
            return fallback;
        } catch (e) {
            return fallback;
        }
    }

    static set(id, value, ack = false) {
        try {
            if (existsState(id)) {
                setState(id, value, ack);
            }
        } catch {
            // State existiert nicht oder Fehler beim Schreiben
        }
    }

    static createIfMissing(id, value, common) {
        try {
            if (!existsState(id)) {
                createState(id, value, common);
            }
        } catch {
            // Fehler beim Anlegen ignorieren
        }
    }

    static createOrSet(id, value, common) {
        try {
            if (!existsState(id)) {
                createState(id, value, common);
            } else {
                setState(id, value);
            }
        } catch {
            // Fehler ignorieren
        }
    }
}

module.exports = { States };