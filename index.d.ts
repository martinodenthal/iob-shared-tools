export type NotificationPriority = 'info' | 'success' | 'warning' | 'alert';

export type NotificationChannelConfig = boolean | {
    priority?: NotificationPriority;
    users?: string | string[];
    rooms?: string | string[];
    title?: string;
    file?: string;
    timeout?: number;
    message?: string;
};

export type NotificationOptions = {
    message: string;
    priority?: NotificationPriority;
    vis?: NotificationChannelConfig;
    alexa?: NotificationChannelConfig;
    pushover?: NotificationChannelConfig;
    gong?: boolean;
};

export type IobApi = {
    log: Function;
    getState: Function;
    setState: Function;
    sendTo: Function;
    schedule: Function;
    $: Function;
};

export class Notifier {
    static readonly visAlerts: string;

    static readonly priority: {
        info: 'info';
        success: 'success';
        warning: 'warning';
        alert: 'alert';
    };

    constructor(api?: IobApi, options?: Record<string, any>);

    notify(options: NotificationOptions): void;
    info(message: string, options?: Omit<NotificationOptions, 'message'>): void;
    success(message: string, options?: Omit<NotificationOptions, 'message'>): void;
    warning(message: string, options?: Omit<NotificationOptions, 'message'>): void;
    alert(message: string, options?: Omit<NotificationOptions, 'message'>): void;
}



export type SchedulerTime =
| Date
| {
    type: 'time';
    time: string;
}
| {
    type: 'sun';
    event: 'sunrise' | 'sunset';
    angle?: number;
}
| {
    type: 'delay';
    milliseconds: number;
};

export type SchedulerApi = {
    schedule: Function;
    clearSchedule: Function;
};

export class Scheduler {
    constructor(
        api?: {
            schedule?: Function;
            clearSchedule?: Function;
            getObject?: Function;
            setTimeout?: Function;
            clearTimeout?: Function;
        },
        options?: {
            latitude?: number;
            longitude?: number;
        }
    );
    
    clear(id: string): void;
    remove(id: string): void;
    empty(): void;
    exists(id: string): boolean;
    
    set(
        id: string,
        at: SchedulerTime,
        callback: (id: string, action: any) => void,
        action?: any
    ): boolean;
    
    setDelay(
        id: string,
        milliseconds: number,
        callback: (id: string, action: any) => void,
        action?: any
    ): boolean;
    
    setPair(
        id: string,
        on:  SchedulerTime | null,
        off: SchedulerTime | null,
        callback: (id: string, action: any, state: boolean) => void,
        action?: any
    ): boolean;

    resolveTime(definition: SchedulerTime): Date | null;

    getSunPosition(date?: Date): {
        azimuth:   number;  // Kompass-Grad: 0° = Nord, 90° = Ost, 180° = Süd, 270° = West
        elevation: number;  // Grad über dem Horizont
    };

    resolveAzimuthWindow(
        azimuthMin:   number,
        azimuthMax:   number,
        elevationMin: number
    ): {
        enterTime: Date | null;
        exitTime:  Date | null;
    };
}

export class States {
    constructor(api?: {
        getState?: Function;
        setState?: Function;
        existsState?: Function;
        createState?: Function;
    });
    get(id: string, fallback?: any): any;
    getJson(id: string, fallback?: any): any;
    set(id: string, value: any, ack?: boolean): void;
    createIfMissing(id: string, value: any, common: Record<string, any>): void;
    createOrSet(id: string, value: any, common: Record<string, any>): void;
}