/**
 * MCP请求构建器实现
 */
import { IMCPRequestBuilder } from './interface';
import { MarketData, Report } from '@/types';
export declare class MCPRequestBuilder implements IMCPRequestBuilder {
    buildMarketDataRequest(currencyIds: string[], timeframe: string): any;
    buildReportGenerationRequest(data: MarketData, language: string): any;
    buildReportSendRequest(report: Report, channel: string): any;
    validateRequest(params: any): void;
    private validateCurrencyIds;
    private validateTimeframe;
    private validateMarketData;
    private validateLanguage;
    private validateReport;
    private validateChannel;
    private normalizeTimeframe;
    private normalizeLanguage;
    private normalizeChannel;
    private prepareReportContent;
    private getChannelConfig;
    private formatMarkdownContent;
    private formatHtmlContent;
    private getReportStyles;
}
//# sourceMappingURL=request-builder.d.ts.map