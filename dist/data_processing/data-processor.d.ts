/**
 * 数据处理器实现
 * 负责市场数据的分析、清理、验证和趋势检测
 */
import { IDataProcessor } from './interface';
import { CurrencyData, MarketTrend, MarketAnomaly } from '@/types';
import { Logger } from '@/utils/logger';
export declare class DataProcessor implements IDataProcessor {
    private logger;
    constructor(logger: Logger);
    /**
     * 合并多个数据源的数据
     * 使用加权平均算法，根据数据源优先级和时效性
     */
    mergeData(data: Record<string, CurrencyData[]>): CurrencyData[];
    /**
     * 分析市场趋势
     */
    analyzeTrends(data: CurrencyData[]): MarketTrend[];
    /**
     * 检测市场异常
     */
    detectAnomalies(data: CurrencyData[]): MarketAnomaly[];
    /**
     * 验证数据质量
     */
    validateData(data: CurrencyData[]): {
        isValid: boolean;
        issues: string[];
    };
    /**
     * 清洗和转换数据
     */
    cleanData(data: CurrencyData[]): CurrencyData[];
    /**
     * 计算数据源权重
     */
    private calculateSourceWeights;
    /**
     * 合并货币记录（加权平均）
     */
    private mergeCurrencyRecord;
    /**
     * 分析每日趋势
     */
    private analyzeDailyTrend;
    /**
     * 分析小时趋势
     */
    private analyzeHourlyTrend;
    /**
     * 识别强势货币
     */
    private identifyStrongCurrencies;
    /**
     * 识别弱势货币
     */
    private identifyWeakCurrencies;
    /**
     * 计算强度分数
     */
    private calculateStrengthScore;
    /**
     * 检测价格异常波动
     */
    private detectPriceSpikes;
    /**
     * 检测交易量异常
     */
    private detectVolumeSurges;
    /**
     * 检测价格暴跌
     */
    private detectPriceDrops;
    /**
     * 验证单条记录
     */
    private validateRecord;
    /**
     * 检查数据一致性
     */
    private checkDataConsistency;
    /**
     * 清洗单条记录
     */
    private cleanRecord;
    /**
     * 计算数据质量分数
     */
    private calculateDataQuality;
    /**
     * 计算时间权重
     */
    private calculateTimeWeight;
}
//# sourceMappingURL=data-processor.d.ts.map