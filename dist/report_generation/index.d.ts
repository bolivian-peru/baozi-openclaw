/**
 * 报告生成模块主入口
 * 导出所有接口和实现类
 */
export * from './interface';
export { ReportGenerator } from './report-generator';
export { ReportTemplateManager } from './template-manager';
export { ReportExporter } from './report-exporter';
export { ReportService } from './report-service';
export * from './utils';
import { Logger } from '@/utils/logger';
import { ReportService } from './report-service';
import { ReportConfig } from './interface';
/**
 * 创建报告服务实例
 */
export declare function createReportService(logger: Logger, config?: Partial<ReportConfig>): ReportService;
/**
 * 报告生成模块版本信息
 */
export declare const REPORT_MODULE_INFO: {
    name: string;
    version: string;
    description: string;
    author: string;
    features: string[];
    dependencies: {
        typescript: string;
    };
};
//# sourceMappingURL=index.d.ts.map