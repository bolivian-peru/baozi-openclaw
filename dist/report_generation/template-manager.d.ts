/**
 * 报告模板管理器实现
 * 负责加载、保存和管理报告模板
 */
import { IReportTemplateManager, ReportTemplate } from './interface';
import { Logger } from '@/utils/logger';
export declare class ReportTemplateManager implements IReportTemplateManager {
    private logger;
    private templateDir;
    private templates;
    private defaultTemplates;
    constructor(logger: Logger, templateDir?: string);
    /**
     * 加载模板
     */
    loadTemplate(templateId: string, language: 'en' | 'zh-CN'): Promise<ReportTemplate>;
    /**
     * 保存模板
     */
    saveTemplate(template: ReportTemplate): Promise<void>;
    /**
     * 列出可用模板
     */
    listTemplates(): Promise<Array<{
        id: string;
        name: string;
        languages: string[];
    }>>;
    /**
     * 删除模板
     */
    deleteTemplate(templateId: string): Promise<void>;
    /**
     * 验证模板
     */
    validateTemplate(template: ReportTemplate): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 创建默认模板
     */
    private createDefaultTemplates;
    /**
     * 获取默认模板
     */
    private getDefaultTemplate;
    /**
     * 创建新模板
     */
    private createNewTemplate;
    /**
     * 获取模板键
     */
    private getTemplateKey;
    /**
     * 从文件系统加载模板
     */
    private loadFromFileSystem;
    /**
     * 保存到文件系统
     */
    private saveToFileSystem;
    /**
     * 从文件系统列出模板
     */
    private listFromFileSystem;
    /**
     * 从文件系统删除模板
     */
    private deleteFromFileSystem;
    /**
     * 确保模板目录存在
     */
    private ensureTemplateDirectory;
}
//# sourceMappingURL=template-manager.d.ts.map