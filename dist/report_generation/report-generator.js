"use strict";
/**
 * 报告生成器实现
 * 负责生成双语市场报告
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const errors_1 = require("@/utils/errors");
class ReportGenerator {
    logger;
    constructor(logger) {
        this.logger = logger.child({ component: 'ReportGenerator' });
    }
    /**
     * 生成市场报告
     */
    async generateMarketReport(data, language) {
        const startTime = Date.now();
        this.logger.info('生成市场报告', {
            language,
            currencyCount: Object.keys(data.currencies).length,
            trendCount: data.trends.length,
            anomalyCount: data.anomalies?.length || 0,
        });
        try {
            // 生成报告内容
            const content = await this.generateReportContent(data, language);
            // 生成图表数据
            const charts = this.generateChartData(data);
            // 构建完整报告
            const report = {
                id: this.generateReportId(),
                timestamp: new Date().toISOString(),
                language,
                format: 'markdown', // 默认格式
                content: {
                    ...content,
                    charts: charts.length > 0 ? charts : undefined,
                },
                metadata: {
                    generationTime: Date.now() - startTime,
                    dataSources: data.sources,
                    reportVersion: '1.0.0',
                    cacheHit: false,
                },
            };
            this.logger.info('报告生成完成', {
                reportId: report.id,
                generationTime: `${report.metadata.generationTime}ms`,
                language,
            });
            return report;
        }
        catch (error) {
            this.logger.error('生成市场报告失败', { error: error.message });
            throw errors_1.AppErrorFactory.createReportGenerationError(error, {
                language,
                dataSize: Object.keys(data.currencies).length,
            });
        }
    }
    /**
     * 生成报告摘要
     */
    generateSummary(data, language) {
        const currencyCount = Object.keys(data.currencies).length;
        const trendCount = data.trends.length;
        const anomalyCount = data.anomalies?.length || 0;
        if (language === 'zh-CN') {
            return `市场报告摘要：监控${currencyCount}种加密货币，识别${trendCount}个趋势${anomalyCount > 0 ? `，发现${anomalyCount}个异常情况` : ''}。`;
        }
        else {
            return `Market report summary: Monitoring ${currencyCount} cryptocurrencies, identified ${trendCount} trends${anomalyCount > 0 ? `, detected ${anomalyCount} anomalies` : ''}.`;
        }
    }
    /**
     * 生成详细分析
     */
    generateDetailedAnalysis(data, language) {
        const analysis = [];
        // 市场概况
        analysis.push(this.generateMarketOverview(data, language));
        // 主要货币表现
        analysis.push(this.generateTopPerformers(data, language));
        // 趋势分析
        if (data.trends.length > 0) {
            analysis.push(this.generateTrendAnalysis(data, language));
        }
        // 异常情况
        if (data.anomalies && data.anomalies.length > 0) {
            analysis.push(this.generateAnomalyAnalysis(data, language));
        }
        // 建议总结
        analysis.push(this.generateAnalysisSummary(data, language));
        return analysis;
    }
    /**
     * 识别关键发现
     */
    identifyKeyFindings(data) {
        const findings = [];
        // 1. 主要货币表现
        const topPerformers = this.getTopPerformers(data.currencies, 3);
        if (topPerformers.length > 0) {
            findings.push({
                title: '最佳表现货币',
                description: `${topPerformers.map(p => p.symbol).join(', ')} 在监测期内表现最佳`,
                impact: 'medium',
                evidence: topPerformers.map(p => `${p.symbol}: 价格$${p.currentPrice.toFixed(2)}，24h变化${p.priceChangePercentage24h > 0 ? '+' : ''}${p.priceChangePercentage24h.toFixed(2)}%`),
            });
        }
        // 2. 主要趋势
        const significantTrends = data.trends.filter(t => t.strength > 50);
        if (significantTrends.length > 0) {
            findings.push({
                title: '显著市场趋势',
                description: `发现${significantTrends.length}个强度超过50%的市场趋势`,
                impact: 'high',
                evidence: significantTrends.map(t => `${t.direction === 'up' ? '上涨' : '下跌'}趋势 (强度: ${t.strength.toFixed(1)}%): ${t.description}`),
            });
        }
        // 3. 市场异常
        if (data.anomalies && data.anomalies.length > 0) {
            const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
            if (criticalAnomalies.length > 0) {
                findings.push({
                    title: '严重市场异常',
                    description: `检测到${criticalAnomalies.length}个高严重性市场异常`,
                    impact: 'high',
                    evidence: criticalAnomalies.map(a => a.description),
                });
            }
        }
        // 4. 市场波动性
        const volatility = this.calculateMarketVolatility(data.currencies);
        if (volatility > 5) {
            findings.push({
                title: '高市场波动性',
                description: `市场波动性较高（${volatility.toFixed(1)}%），建议谨慎操作`,
                impact: 'medium',
                evidence: [`平均24小时价格变化: ${volatility.toFixed(2)}%`],
            });
        }
        return findings;
    }
    /**
     * 生成建议
     */
    generateRecommendations(data, language) {
        const recommendations = [];
        // 基于趋势的建议
        const upTrends = data.trends.filter(t => t.direction === 'up' && t.strength > 60);
        const downTrends = data.trends.filter(t => t.direction === 'down' && t.strength > 60);
        if (language === 'zh-CN') {
            if (upTrends.length > downTrends.length) {
                recommendations.push('市场整体呈现上涨趋势，可考虑分批建仓强势货币');
            }
            else if (downTrends.length > upTrends.length) {
                recommendations.push('市场整体呈现下跌趋势，建议观望或适当减仓');
            }
            // 基于异常的建议
            if (data.anomalies && data.anomalies.length > 0) {
                const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical');
                if (criticalAnomalies.length > 0) {
                    recommendations.push('检测到严重市场异常，建议暂时观望，避免大额操作');
                }
            }
            // 基于波动性的建议
            const volatility = this.calculateMarketVolatility(data.currencies);
            if (volatility > 8) {
                recommendations.push('市场波动性较高，建议设置止损止盈，控制风险');
            }
            recommendations.push('建议关注主要货币的技术指标和基本面变化');
            recommendations.push('定期查看市场报告，及时调整投资策略');
        }
        else {
            // English recommendations
            if (upTrends.length > downTrends.length) {
                recommendations.push('Market shows overall upward trend, consider gradual position building in strong cryptocurrencies');
            }
            else if (downTrends.length > upTrends.length) {
                recommendations.push('Market shows overall downward trend, recommend观望 or适当 reducing positions');
            }
            if (data.anomalies && data.anomalies.length > 0) {
                const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical');
                if (criticalAnomalies.length > 0) {
                    recommendations.push('Critical market anomalies detected,建议暂时观望 and avoid large transactions');
                }
            }
            const volatility = this.calculateMarketVolatility(data.currencies);
            if (volatility > 8) {
                recommendations.push('High market volatility detected,建议设置止损止盈 and control risk');
            }
            recommendations.push('Monitor technical indicators and fundamental changes of major cryptocurrencies');
            recommendations.push('Review market reports regularly and adjust investment strategies accordingly');
        }
        return recommendations;
    }
    /**
     * 生成图表数据
     */
    generateChartData(data) {
        const charts = [];
        try {
            // 1. 价格变化图表
            const priceChangeData = this.getPriceChangeChartData(data.currencies);
            if (priceChangeData.length > 0) {
                charts.push({
                    type: 'bar',
                    title: '24小时价格变化 (%)',
                    data: priceChangeData,
                    options: {
                        colorBy: 'data',
                        plugins: {
                            legend: { display: false },
                        },
                    },
                });
            }
            // 2. 市值分布图表
            const marketCapData = this.getMarketCapChartData(data.currencies);
            if (marketCapData.length > 0) {
                charts.push({
                    type: 'pie',
                    title: '市值分布',
                    data: marketCapData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right' },
                        },
                    },
                });
            }
            // 3. 交易量图表
            const volumeData = this.getVolumeChartData(data.currencies);
            if (volumeData.length > 0) {
                charts.push({
                    type: 'bar',
                    title: '24小时交易量 (百万美元)',
                    data: volumeData,
                    options: {
                        colorBy: 'data',
                        indexAxis: 'y',
                    },
                });
            }
            this.logger.debug('图表数据生成完成', { chartCount: charts.length });
        }
        catch (error) {
            this.logger.warn('图表数据生成失败', { error: error.message });
        }
        return charts;
    }
    /**
     * 格式化报告
     */
    formatReport(content, format) {
        switch (format) {
            case 'markdown':
                return this.formatAsMarkdown(content);
            case 'html':
                return this.formatAsHTML(content);
            case 'json':
                return JSON.stringify(content, null, 2);
            default:
                return this.formatAsMarkdown(content);
        }
    }
    // ================ 私有方法 ================
    /**
     * 生成报告ID
     */
    generateReportId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `report_${timestamp}_${random}`;
    }
    /**
     * 生成报告内容
     */
    async generateReportContent(data, language) {
        const summary = this.generateSummary(data, language);
        const detailedAnalysis = this.generateDetailedAnalysis(data, language);
        const keyFindings = this.identifyKeyFindings(data);
        const recommendations = this.generateRecommendations(data, language);
        return {
            summary,
            detailedAnalysis,
            keyFindings,
            recommendations: recommendations.length > 0 ? recommendations : undefined,
        };
    }
    /**
     * 生成市场概况
     */
    generateMarketOverview(data, language) {
        const currencies = Object.values(data.currencies);
        const totalMarketCap = currencies.reduce((sum, c) => sum + c.marketCap, 0);
        const totalVolume = currencies.reduce((sum, c) => sum + c.volume24h, 0);
        const avgChange = currencies.reduce((sum, c) => sum + c.priceChangePercentage24h, 0) / currencies.length;
        if (language === 'zh-CN') {
            return `市场概况：总市值$${(totalMarketCap / 1e12).toFixed(2)}万亿，24小时总交易量$${(totalVolume / 1e9).toFixed(2)}十亿，平均价格变化${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%。`;
        }
        else {
            return `Market overview: Total market cap $${(totalMarketCap / 1e12).toFixed(2)} trillion, 24h total volume $${(totalVolume / 1e9).toFixed(2)} billion, average price change ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%.`;
        }
    }
    /**
     * 生成最佳表现者分析
     */
    generateTopPerformers(data, language) {
        const topPerformers = this.getTopPerformers(data.currencies, 3);
        const worstPerformers = this.getWorstPerformers(data.currencies, 3);
        if (language === 'zh-CN') {
            let result = '主要货币表现：';
            if (topPerformers.length > 0) {
                result += `最佳表现：${topPerformers.map(p => `${p.symbol}(${p.priceChangePercentage24h > 0 ? '+' : ''}${p.priceChangePercentage24h.toFixed(2)}%)`).join('、')}`;
            }
            if (worstPerformers.length > 0) {
                result += `；最差表现：${worstPerformers.map(p => `${p.symbol}(${p.priceChangePercentage24h > 0 ? '+' : ''}${p.priceChangePercentage24h.toFixed(2)}%)`).join('、')}`;
            }
            return result;
        }
        else {
            let result = 'Top performers: ';
            if (topPerformers.length > 0) {
                result += `Best: ${topPerformers.map(p => `${p.symbol}(${p.priceChangePercentage24h > 0 ? '+' : ''}${p.priceChangePercentage24h.toFixed(2)}%)`).join(', ')}`;
            }
            if (worstPerformers.length > 0) {
                result += `; Worst: ${worstPerformers.map(p => `${p.symbol}(${p.priceChangePercentage24h > 0 ? '+' : ''}${p.priceChangePercentage24h.toFixed(2)}%)`).join(', ')}`;
            }
            return result;
        }
    }
    /**
     * 生成趋势分析
     */
    generateTrendAnalysis(data, language) {
        const strongTrends = data.trends.filter(t => t.strength > 70);
        const upTrends = data.trends.filter(t => t.direction === 'up');
        const downTrends = data.trends.filter(t => t.direction === 'down');
        if (language === 'zh-CN') {
            let result = '趋势分析：';
            if (strongTrends.length > 0) {
                result += `发现${strongTrends.length}个强趋势`;
            }
            result += `，其中上涨趋势${upTrends.length}个，下跌趋势${downTrends.length}个`;
            if (upTrends.length > downTrends.length * 1.5) {
                result += '，市场整体偏向乐观';
            }
            else if (downTrends.length > upTrends.length * 1.5) {
                result += '，市场整体偏向谨慎';
            }
            return result;
        }
        else {
            let result = 'Trend analysis: ';
            if (strongTrends.length > 0) {
                result += `Found ${strongTrends.length} strong trends`;
            }
            result += `, with ${upTrends.length} upward trends and ${downTrends.length} downward trends`;
            if (upTrends.length > downTrends.length * 1.5) {
                result += ', overall market sentiment is optimistic';
            }
            else if (downTrends.length > upTrends.length * 1.5) {
                result += ', overall market sentiment is cautious';
            }
            return result;
        }
    }
    /**
     * 生成异常分析
     */
    generateAnomalyAnalysis(data, language) {
        const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical');
        const highAnomalies = data.anomalies.filter(a => a.severity === 'high');
        if (language === 'zh-CN') {
            let result = '异常检测：';
            if (criticalAnomalies.length > 0) {
                result += `发现${criticalAnomalies.length}个严重异常`;
                const affected = [...new Set(criticalAnomalies.flatMap(a => a.affectedCurrencies))];
                result += `，影响货币：${affected.join('、')}`;
            }
            else if (highAnomalies.length > 0) {
                result += `发现${highAnomalies.length}个高等级异常`;
            }
            else {
                result += `发现${data.anomalies.length}个异常情况`;
            }
            return result;
        }
        else {
            let result = 'Anomaly detection: ';
            if (criticalAnomalies.length > 0) {
                result += `Found ${criticalAnomalies.length} critical anomalies`;
                const affected = [...new Set(criticalAnomalies.flatMap(a => a.affectedCurrencies))];
                result += `, affecting: ${affected.join(', ')}`;
            }
            else if (highAnomalies.length > 0) {
                result += `Found ${highAnomalies.length} high severity anomalies`;
            }
            else {
                result += `Found ${data.anomalies.length} anomalies`;
            }
            return result;
        }
    }
    /**
     * 生成分析总结
     */
    generateAnalysisSummary(data, language) {
        const volatility = this.calculateMarketVolatility(data.currencies);
        const trendStrength = data.trends.reduce((sum, t) => sum + t.strength, 0) / Math.max(data.trends.length, 1);
        if (language === 'zh-CN') {
            let result = '分析总结：';
            if (volatility > 8) {
                result += '市场波动性高，';
            }
            else if (volatility > 4) {
                result += '市场波动性中等，';
            }
            else {
                result += '市场波动性低，';
            }
            if (trendStrength > 70) {
                result += '趋势明显，市场方向明确';
            }
            else if (trendStrength > 40) {
                result += '趋势存在但不够明确';
            }
            else {
                result += '无明显趋势，市场处于盘整状态';
            }
            return result;
        }
        else {
            let result = 'Analysis summary: ';
            if (volatility > 8) {
                result += 'High market volatility, ';
            }
            else if (volatility > 4) {
                result += 'Moderate market volatility, ';
            }
            else {
                result += 'Low market volatility, ';
            }
            if (trendStrength > 70) {
                result += 'clear trends, market direction is definite';
            }
            else if (trendStrength > 40) {
                result += 'trends exist but not definitive';
            }
            else {
                result += 'no clear trends, market is consolidating';
            }
            return result;
        }
    }
    /**
     * 获取最佳表现者
     */
    getTopPerformers(currencies, limit) {
        return Object.values(currencies)
            .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
            .slice(0, limit);
    }
    /**
     * 获取最差表现者
     */
    getWorstPerformers(currencies, limit) {
        return Object.values(currencies)
            .sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)
            .slice(0, limit);
    }
    /**
     * 计算市场波动性
     */
    calculateMarketVolatility(currencies) {
        const changes = Object.values(currencies).map(c => Math.abs(c.priceChangePercentage24h));
        if (changes.length === 0)
            return 0;
        const sum = changes.reduce((a, b) => a + b, 0);
        return sum / changes.length;
    }
    /**
     * 获取价格变化图表数据
     */
    getPriceChangeChartData(currencies) {
        return Object.values(currencies)
            .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
            .slice(0, 10)
            .map(currency => ({
            currency: currency.symbol,
            change: currency.priceChangePercentage24h,
            color: currency.priceChangePercentage24h >= 0 ? '#10b981' : '#ef4444',
        }));
    }
    /**
     * 获取市值图表数据
     */
    getMarketCapChartData(currencies) {
        const sorted = Object.values(currencies)
            .sort((a, b) => b.marketCap - a.marketCap)
            .slice(0, 8);
        const othersMarketCap = Object.values(currencies)
            .slice(8)
            .reduce((sum, c) => sum + c.marketCap, 0);
        const result = sorted.map(currency => ({
            currency: currency.symbol,
            marketCap: currency.marketCap / 1e9, // 转换为十亿美元
        }));
        if (othersMarketCap > 0) {
            result.push({
                currency: 'Others',
                marketCap: othersMarketCap / 1e9,
            });
        }
        return result;
    }
    /**
     * 获取交易量图表数据
     */
    getVolumeChartData(currencies) {
        return Object.values(currencies)
            .sort((a, b) => b.volume24h - a.volume24h)
            .slice(0, 10)
            .map(currency => ({
            currency: currency.symbol,
            volume: currency.volume24h / 1e6, // 转换为百万美元
        }));
    }
    /**
     * 格式化为Markdown
     */
    formatAsMarkdown(content) {
        let markdown = `# 市场报告\n\n`;
        markdown += `## 摘要\n${content.summary}\n\n`;
        if (content.detailedAnalysis && content.detailedAnalysis.length > 0) {
            markdown += `## 详细分析\n`;
            content.detailedAnalysis.forEach((analysis, index) => {
                markdown += `${index + 1}. ${analysis}\n`;
            });
            markdown += '\n';
        }
        if (content.keyFindings && content.keyFindings.length > 0) {
            markdown += `## 关键发现\n`;
            content.keyFindings.forEach((finding, index) => {
                markdown += `### ${index + 1}. ${finding.title}\n`;
                markdown += `${finding.description}\n\n`;
                if (finding.evidence && finding.evidence.length > 0) {
                    markdown += `**证据**:\n`;
                    finding.evidence.forEach(evidence => {
                        markdown += `- ${evidence}\n`;
                    });
                    markdown += '\n';
                }
                markdown += `**影响等级**: ${this.getImpactEmoji(finding.impact)} ${finding.impact}\n\n`;
            });
        }
        if (content.recommendations && content.recommendations.length > 0) {
            markdown += `## 建议\n`;
            content.recommendations.forEach((recommendation, index) => {
                markdown += `${index + 1}. ${recommendation}\n`;
            });
            markdown += '\n';
        }
        if (content.charts && content.charts.length > 0) {
            markdown += `## 图表\n`;
            markdown += `*报告包含 ${content.charts.length} 个图表*\n\n`;
        }
        markdown += `---\n*报告生成时间: ${new Date().toISOString()}*\n`;
        return markdown;
    }
    /**
     * 格式化为HTML
     */
    formatAsHTML(content) {
        // 简化实现
        return `<html><body><h1>Market Report</h1><p>${content.summary}</p></body></html>`;
    }
    /**
     * 获取影响等级表情符号
     */
    getImpactEmoji(impact) {
        switch (impact) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=report-generator.js.map