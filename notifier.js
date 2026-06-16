class Notifier {
    static visAlerts = 'javascript.0.Vis.Status.Alerts';

    static priority = {
        info: 'info',
        success: 'success',
        warning: 'warning',
        alert: 'alert'
    };

    static priorityConfig = {
        info: {
            vis: {
                backgroundColor: '#202020',
                borderColor: '#505050',
                icon: 'information-outline',
                iconColor: '#0077ee',
                timeout: 30
            },
            alexaMode: 'speak',
            pushoverPriority: -1
        },
        success: {
            vis: {
                backgroundColor: '#008000',
                borderColor: '#00F000',
                icon: 'check-circle-outline',
                iconColor: '#00F000',
                timeout: 30
            },
            alexaMode: 'announcement',
            pushoverPriority: -1
        },
        warning: {
            vis: {
                backgroundColor: '#FFD700',
                borderColor: '#FFF700',
                icon: 'alert-outline',
                iconColor: '#FFF700',
                timeout: 12 * 60
            },
            alexaMode: 'speak',
            pushoverPriority: 1
        },
        alert: {
            vis: {
                backgroundColor: '#B22222',
                borderColor: '#F33333',
                icon: 'alert-octagon',
                iconColor: '#F33333',
                timeout: 0
            },
            alexaMode: 'announcement',
            pushoverPriority: 2
        }
    };

    constructor(api = {}, options = {}) {
        this.api = api;
        this.options = options;
    }

    normalizeArray(value) {
        if (value === undefined || value === null) return null;
        return Array.isArray(value) ? value : [value];
    }

    getChannelConfig(config) {
        return (config && typeof config === 'object') ? config : {};
    }

    getVisNotifications() {
        try {
            const raw = this.api.getState(Notifier.visAlerts).val;
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    formatTimestamp(ts) {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    getVisStyle(priority) {
        return Notifier.priorityConfig[priority].vis;
    }

    getAlexaMode(priority) {
        return Notifier.priorityConfig[priority].alexaMode;
    }

    getPushoverPriority(priority) {
        return Notifier.priorityConfig[priority].pushoverPriority;
    }

    removeFromVis(ts) {
        const notifications = this.getVisNotifications();
        const idx = notifications.findIndex((note) => note.ts === ts);

        if (idx >= 0) {
            notifications.splice(idx, 1);
            this.api.setState(Notifier.visAlerts, JSON.stringify(notifications));
        }
    }

    sendToVis(message, priority = 'info', timeout) {
        const style = this.getVisStyle(priority);
        const ts = Date.now();
        const timeStampText = this.formatTimestamp(ts);

        const params = {
            text: `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <span>${message}</span>
                        <span style="font-size:0.75em; opacity:0.75; white-space:nowrap;">${timeStampText}</span>
                   </div>`,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            icon: style.icon,
            iconColor: style.iconColor,
            fontColor: '#ffffff',
            ts: ts
        };

        const notifications = this.getVisNotifications();
        notifications.unshift(params);
        notifications.splice(20);
        this.api.setState(Notifier.visAlerts, JSON.stringify(notifications));

        const effectiveTimeout = timeout ?? style.timeout;
        if (effectiveTimeout > 0) {
            const when = new Date(Date.now() + (effectiveTimeout * 60 * 1000));
            this.api.schedule(when, () => this.removeFromVis(ts));
        }
    }

    sendToAlexa(message, priority, device) {
        if (device.includes('.Echo-Devices.')) {
            const mode = this.getAlexaMode(priority);
            this.api.setState(`${device}.Commands.${mode}`, `40;${message}`);
        } else {
            this.api.setState(`${device}.textMessage`, message);
        }
    }

    sendToPushover(message, priority, title, devices, file) {
        const params = {
            message: message,
            priority: this.getPushoverPriority(priority),
            html: 1
        };

        if (title) params.title = title;
        if (file) params.file = file;

        const deviceList = this.normalizeArray(devices);
        if (deviceList) {
            deviceList.forEach(device => {
                params.device = device;
                this.api.sendTo('pushover.0', params);
            });
        } else {
            this.api.sendTo('pushover.0', params);
        }
    }

    sendToGong() {
        const params = {
            device: 'hm-rpc.2.00152269987B03',
            channel: '2',
            sound: 'SOUNDFILE_243',
            level: 10
        };

        this.api.setState(`${params.device}.${params.channel}.SOUNDFILE`, params.sound);
        this.api.setState(`${params.device}.${params.channel}.LEVEL`, params.level);
    }

    notifyAlexa(message, config) {
        const priority = config.priority ?? 'info';
        const users = this.normalizeArray(config.users);
        const rooms = this.normalizeArray(config.rooms);

        if (users) {
            users.forEach(user => {
                if (rooms) {
                    rooms.forEach(room => {
                        this.api.$(`[id=0_userdata.0.Residents.${user}.push.alexa.${room}]`).each((id) => {
                            this.sendToAlexa(message, priority, this.api.getState(id).val);
                        });
                    });
                } else {
                    this.api.$(`[id=0_userdata.0.Residents.${user}.push.alexa*]`).each((id) => {
                        this.sendToAlexa(message, priority, this.api.getState(id).val);
                    });
                }
            });
        } else {
            if (rooms) {
                rooms.forEach(room => {
                    this.api.$(`[id=0_userdata.0.Residents.*.push.alexa.${room}]`).each((id) => {
                        this.sendToAlexa(message, priority, this.api.getState(id).val);
                    });
                });
            } else {
                this.api.$(`[id=0_userdata.0.Residents.*.push.alexa*]`).each((id) => {
                    this.sendToAlexa(message, priority, this.api.getState(id).val);
                });
            }
        }
    }

    notifyPushover(message, config) {
        const priority = config.priority ?? 'info';
        const title = config.title;
        const file = config.file;
        const users = this.normalizeArray(config.users);

        if (users) {
            users.forEach(user => {
                this.api.$(`[id=0_userdata.0.Residents.${user}.push.pushover]`).each((id) => {
                    const devices = this.api.getState(id).val;
                    this.sendToPushover(message, priority, title, devices, file);
                });
            });
        } else {
            this.sendToPushover(message, priority, title, undefined, file);
        }
    }

    notify(options) {
        if (!options.message) return;

        const defaultPriority = options.priority ?? 'info';

        if (options.vis) {
            const config = this.getChannelConfig(options.vis);
            this.sendToVis(
                config.message ?? options.message,
                config.priority ?? defaultPriority,
                config.timeout
            );
        }

        if (options.alexa) {
            const config = this.getChannelConfig(options.alexa);
            this.notifyAlexa(
                config.message ?? options.message,
                {
                    ...config,
                    priority: config.priority ?? defaultPriority
                }
            );
        }

        if (options.pushover) {
            const config = this.getChannelConfig(options.pushover);
            this.notifyPushover(
                config.message ?? options.message,
                {
                    ...config,
                    priority: config.priority ?? defaultPriority
                }
            );
        }

        if (options.gong) {
            this.sendToGong();
        }
    }

    info(message, options = {}) {
        this.notifyWithDefaultPriority('info', message, options);
    }

    success(message, options = {}) {
        this.notifyWithDefaultPriority('success', message, options);
    }

    warning(message, options = {}) {
        this.notifyWithDefaultPriority('warning', message, options);
    }

    alert(message, options = {}) {
        this.notifyWithDefaultPriority('alert', message, options);
    }

    notifyWithDefaultPriority(defaultPriority, message, options) {
        this.notify({
            message,
            priority: options.priority ?? defaultPriority,
            vis: options.vis,
            alexa: options.alexa,
            pushover: options.pushover,
            gong: options.gong
        });
    }
}

module.exports = { Notifier };