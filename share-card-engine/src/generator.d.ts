import { MarketEvent } from './detector';
export declare class ShareCardGenerator {
    private wallet;
    private refCode;
    constructor(wallet: string, refCode: string);
    generateCard(event: MarketEvent): Promise<{
        imageUrl: string;
        caption: string;
    }>;
}
//# sourceMappingURL=generator.d.ts.map