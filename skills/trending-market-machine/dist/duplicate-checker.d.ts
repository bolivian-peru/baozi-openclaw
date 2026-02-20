/**
 * Check if a proposed question is too similar to any existing market
 */
export declare function isMarketDuplicate(question: string): Promise<{
    isDuplicate: boolean;
    reason?: string;
    similarMarket?: string;
}>;
/**
 * Filter proposals, removing duplicates
 */
export declare function filterDuplicates(proposals: Array<{
    question: string;
    [key: string]: any;
}>): Promise<Array<{
    question: string;
    [key: string]: any;
}>>;
