import { HealthCheck } from '../models/HealthCheck';
export declare class HealthMonitor {
    private static instance;
    private isRunning;
    private constructor();
    static getInstance(): HealthMonitor;
    start(): void;
    stop(): void;
    private runHealthChecks;
    private checkServiceHealth;
    checkService(serviceId: string): Promise<void>;
    getHealthHistory(serviceId: string, limit?: number): Promise<HealthCheck[]>;
    cleanupOldHealthChecks(): Promise<void>;
}
//# sourceMappingURL=healthMonitor.d.ts.map