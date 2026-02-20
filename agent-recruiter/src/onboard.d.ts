import { TargetAgent } from './discovery';
export declare class AgentOnboarder {
    private recruiterCode;
    private rpcUrl;
    constructor(recruiterCode: string, rpcUrl: string);
    executeOnboarding(agent: TargetAgent): Promise<boolean>;
    private step;
}
//# sourceMappingURL=onboard.d.ts.map