"use strict";
/**
 * 报告生成模块主入口
 * 导出所有接口和实现类
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_MODULE_INFO = exports.ReportService = exports.ReportExporter = exports.ReportTemplateManager = exports.ReportGenerator = void 0;
exports.createReportService = createReportService;
// 导出接口
__exportStar(require("./interface"), exports);
// 导出实现类
var report_generator_1 = require("./report-generator");
Object.defineProperty(exports, "ReportGenerator", { enumerable: true, get: function () { return report_generator_1.ReportGenerator; } });
var template_manager_1 = require("./template-manager");
Object.defineProperty(exports, "ReportTemplateManager", { enumerable: true, get: function () { return template_manager_1.ReportTemplateManager; } });
var report_exporter_1 = require("./report-exporter");
Object.defineProperty(exports, "ReportExporter", { enumerable: true, get: function () { return report_exporter_1.ReportExporter; } });
var report_service_1 = require("./report-service");
Object.defineProperty(exports, "ReportService", { enumerable: true, get: function () { return report_service_1.ReportService; } });
// 导出工具函数
__exportStar(require("./utils"), exports);
const report_service_2 = require("./report-service");
/**
 * 创建报告服务实例
 */
function createReportService(logger, config = {}) {
    return new report_service_2.ReportService(logger, config);
}
/**
 * 报告生成模块版本信息
 */
exports.REPORT_MODULE_INFO = {
    name: 'Night Kitchen Report Generation Module',
    version: '1.0.0',
    description: '双语市场报告生成、模板管理、导出和发送',
    author: 'Night Kitchen Agent Team',
    features: [
        '双语报告生成 (英文/中文)',
        '智能报告模板管理',
        '多种格式导出 (Markdown/HTML/JSON)',
        '多渠道发送 (Discord/Telegram/Email/Webhook)',
        '报告历史记录和统计',
        '配置化管理',
        '缓存支持',
    ],
    dependencies: {
        typescript: '^5.3.0',
    },
};
//# sourceMappingURL=index.js.map