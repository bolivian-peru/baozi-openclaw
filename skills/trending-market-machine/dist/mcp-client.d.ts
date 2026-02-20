export declare class McpClient {
    private process;
    private requestId;
    private pendingRequests;
    private buffer;
    private initialized;
    start(): Promise<void>;
    private processBuffer;
    private send;
    call(method: string, params?: any, timeoutMs?: number): Promise<any>;
    /**
     * Call an MCP tool by name.
     */
    callTool(name: string, args?: Record<string, any>): Promise<any>;
    /**
     * Build a create lab market transaction via MCP.
     */
    buildCreateLabMarketTransaction(params: {
        question: string;
        closingTime: string;
        creatorWallet: string;
        resolutionMode?: string;
        councilMembers?: string[];
    }): Promise<{
        transaction: string;
        marketPda: string;
    }>;
    /**
     * Validate a market question against v6.3 rules.
     */
    validateMarketQuestion(question: string): Promise<{
        valid: boolean;
        issues: string[];
    }>;
    /**
     * Get pari-mutuel rules.
     */
    getParimutuelRules(): Promise<any>;
    /**
     * Get timing rules.
     */
    getTimingRules(): Promise<any>;
    stop(): Promise<void>;
}
