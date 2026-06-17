const SunCalc = require('suncalc');

// Globale Registry – einmal pro Node.js-Prozess, verhindert doppelte addTime-Aufrufe
const _registeredAngles = new Map();

function _getSunCalcKeys(angle) {
    if (!_registeredAngles.has(angle)) {
        const riseKey = `iobRise${angle}`;
        const setKey  = `iobSet${angle}`;
        SunCalc.addTime(angle, riseKey, setKey);
        _registeredAngles.set(angle, { riseKey, setKey });
    }
    return _registeredAngles.get(angle);
}

class Scheduler {
    constructor(api = {}, options = {}) {
        this.api = api;
        this.options = options;
        this.timers = {};

        const jsInstance = typeof getObject === 'function'
            ? getObject('system.adapter.javascript.0')
            : null;

        this.latitude =
            options.latitude ??
            jsInstance?.native?.latitude ??
            0;

        this.longitude =
            options.longitude ??
            jsInstance?.native?.longitude ??
            0;
    }

    clear(id) {
        if (!this.timers[id]) return;
        if (this.timers[id].primaryHandle) {
            this.api.clearSchedule(this.timers[id].primaryHandle);
            this.timers[id].primaryHandle = null;
        }
        if (this.timers[id].secondaryHandle) {
            this.api.clearSchedule(this.timers[id].secondaryHandle);
            this.timers[id].secondaryHandle = null;
        }
    }

    remove(id) {
        this.clear(id);
        if (this.timers[id]) {
            delete this.timers[id];
        }
    }

    empty() {
        Object.keys(this.timers).forEach(id => this.remove(id));
    }

    exists(id) {
        return !!this.timers[id];
    }

    set(id, at, callback, action) {
        this.clear(id);
        const runAt = this.resolveTime(at);
        if (!runAt) return false;
        const now = new Date();
        if (runAt <= now) return false;
        this.timers[id] = {
            mode: 'single',
            primaryHandle: this.api.schedule(runAt, () => {
                callback(id, action);
            }),
            secondaryHandle: null,
            action,
            at: runAt
        };
        return true;
    }

    setDelay(id, milliseconds, callback, action) {
        return this.set(
            id,
            { type: 'delay', milliseconds },
            callback,
            action
        );
    }

    setPair(id, on, off, callback, action) {
        this.clear(id);
        const onTime  = this.resolveTime(on);
        const offTime = this.resolveTime(off);
        if (!onTime && !offTime) return false;
        const now = new Date();
        this.timers[id] = {
            mode: 'pair',
            primaryHandle: null,
            secondaryHandle: null,
            action,
            on: onTime,
            off: offTime
        };
        if (onTime && onTime > now) {
            this.timers[id].primaryHandle = this.api.schedule(onTime, () => {
                callback(id, action, true);
            });
        }
        if (offTime && offTime > now) {
            this.timers[id].secondaryHandle = this.api.schedule(offTime, () => {
                callback(id, action, false);
            });
        }
        return this._isBetween(onTime, offTime, now);
    }

    resolveTime(definition) {
        if (!definition) return null;
        if (definition instanceof Date) return definition;
        if (typeof definition !== 'object' || !definition.type) return null;

        switch (definition.type) {
            case 'delay':
                if (typeof definition.milliseconds !== 'number' || definition.milliseconds <= 0) return null;
                return new Date(Date.now() + definition.milliseconds);
            case 'time':
                return this._resolveClockTime(definition.time);
            case 'sun':
                return this._resolveSunTime(definition.event, definition.angle ?? 0);
            default:
                return null;
        }
    }

    _resolveClockTime(timeString) {
        if (typeof timeString !== 'string') return null;
        const parts = timeString.split(':');
        if (parts.length < 2) return null;
        const hours   = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
        const dt = new Date();
        dt.setHours(hours, minutes, 0, 0);
        if (dt <= new Date()) {
            dt.setDate(dt.getDate() + 1);
        }
        return dt;
    }

    _resolveSunTime(event, angle) {
        if (!['sunrise', 'sunset'].includes(event)) return null;

        const { riseKey, setKey } = _getSunCalcKeys(angle);
        const key = event === 'sunrise' ? riseKey : setKey;

        const times = SunCalc.getTimes(new Date(), this.latitude, this.longitude);
        let dt = times[key];

        if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;

        if (dt <= new Date()) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const timesTomorrow = SunCalc.getTimes(tomorrow, this.latitude, this.longitude);
            dt = timesTomorrow[key];
        }

        return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
    }

    _isBetween(on, off, now = new Date()) {
        if (on instanceof Date && off instanceof Date) return now >= on && now < off;
        if (on instanceof Date && !off) return now >= on;
        if (!on && off instanceof Date) return now < off;
        return false;
    }
}

module.exports = { Scheduler };