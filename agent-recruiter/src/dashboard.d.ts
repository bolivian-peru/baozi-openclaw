export interface RecruiterStats {
    agentsOnboarded: number;
    totalVolumeSol: number;
    totalCommissionsSol: number;
}
export declare class RecruiterDashboard {
    private stats;
    recordOnboarding(betSizeSol: number): void;
    render(): void;
}
//# sourceMappingURL=dashboard.d.ts.map