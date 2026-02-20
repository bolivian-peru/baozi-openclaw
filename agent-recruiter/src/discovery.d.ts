export type AgentType = 'crypto' | 'trading' | 'social' | 'general';
export interface TargetAgent {
    id: string;
    name: string;
    type: AgentType;
    platform: string;
    bio: string;
}
export declare class AgentDiscoveryEngine {
    discoverTargets(count?: number): Promise<TargetAgent[]>;
}
//# sourceMappingURL=discovery.d.ts.map