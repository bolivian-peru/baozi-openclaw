"use strict";
/**
 * 报告模板管理器实现
 * 负责加载、保存和管理报告模板
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportTemplateManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("@/utils/errors");
class ReportTemplateManager {
    logger;
    templateDir;
    templates;
    defaultTemplates;
    constructor(logger, templateDir = './templates') {
        this.logger = logger.child({ component: 'ReportTemplateManager' });
        this.templateDir = templateDir;
        this.templates = new Map();
        this.defaultTemplates = this.createDefaultTemplates();
        this.logger.info('报告模板管理器初始化', { templateDir });
    }
    /**
     * 加载模板
     */
    async loadTemplate(templateId, language) {
        this.logger.info('加载模板', { templateId, language });
        try {
            // 先检查内存缓存
            const cachedTemplate = this.templates.get(this.getTemplateKey(templateId, language));
            if (cachedTemplate) {
                this.logger.debug('从缓存加载模板', { templateId, language });
                return cachedTemplate;
            }
            // 尝试从文件系统加载
            const template = await this.loadFromFileSystem(templateId, language);
            if (template) {
                this.templates.set(this.getTemplateKey(templateId, language), template);
                return template;
            }
            // 使用默认模板
            const defaultTemplate = this.getDefaultTemplate(templateId, language);
            if (defaultTemplate) {
                this.logger.info('使用默认模板', { templateId, language });
                this.templates.set(this.getTemplateKey(templateId, language), defaultTemplate);
                return defaultTemplate;
            }
            // 创建新模板
            const newTemplate = this.createNewTemplate(templateId, language);
            this.templates.set(this.getTemplateKey(templateId, language), newTemplate);
            this.logger.info('创建新模板', { templateId, language });
            return newTemplate;
        }
        catch (error) {
            this.logger.error('加载模板失败', { templateId, language, error: error.message });
            throw errors_1.AppErrorFactory.createTemplateError(error, {
                operation: 'loadTemplate',
                templateId,
                language,
            });
        }
    }
    /**
     * 保存模板
     */
    async saveTemplate(template) {
        this.logger.info('保存模板', {
            templateId: template.id,
            language: template.language,
        });
        try {
            // 验证模板
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                throw new Error(`模板验证失败: ${validation.errors.join(', ')}`);
            }
            // 保存到内存缓存
            const key = this.getTemplateKey(template.id, template.language);
            this.templates.set(key, template);
            // 保存到文件系统
            await this.saveToFileSystem(template);
            this.logger.info('模板保存成功', { templateId: template.id });
        }
        catch (error) {
            this.logger.error('保存模板失败', {
                templateId: template.id,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createTemplateError(error, {
                operation: 'saveTemplate',
                templateId: template.id,
            });
        }
    }
    /**
     * 列出可用模板
     */
    async listTemplates() {
        this.logger.debug('列出模板');
        try {
            const result = [];
            // 从内存缓存获取
            for (const [key, template] of this.templates.entries()) {
                const existing = result.find(t => t.id === template.id);
                if (existing) {
                    existing.languages.push(template.language);
                }
                else {
                    result.push({
                        id: template.id,
                        name: template.name,
                        languages: [template.language],
                    });
                }
            }
            // 从文件系统获取
            try {
                const fileTemplates = await this.listFromFileSystem();
                for (const template of fileTemplates) {
                    const existing = result.find(t => t.id === template.id);
                    if (existing) {
                        if (!existing.languages.includes(template.language)) {
                            existing.languages.push(template.language);
                        }
                    }
                    else {
                        result.push({
                            id: template.id,
                            name: template.name,
                            languages: [template.language],
                        });
                    }
                }
            }
            catch (error) {
                this.logger.warn('从文件系统列出模板失败', { error: error.message });
            }
            // 添加默认模板
            for (const template of this.defaultTemplates) {
                const existing = result.find(t => t.id === template.id);
                if (existing) {
                    if (!existing.languages.includes(template.language)) {
                        existing.languages.push(template.language);
                    }
                }
                else {
                    result.push({
                        id: template.id,
                        name: template.name,
                        languages: [template.language],
                    });
                }
            }
            this.logger.debug('模板列表获取完成', { count: result.length });
            return result;
        }
        catch (error) {
            this.logger.error('列出模板失败', { error: error.message });
            throw errors_1.AppErrorFactory.createTemplateError(error, {
                operation: 'listTemplates',
            });
        }
    }
    /**
     * 删除模板
     */
    async deleteTemplate(templateId) {
        this.logger.info('删除模板', { templateId });
        try {
            // 从内存缓存删除
            for (const [key, template] of this.templates.entries()) {
                if (template.id === templateId) {
                    this.templates.delete(key);
                }
            }
            // 从文件系统删除
            await this.deleteFromFileSystem(templateId);
            this.logger.info('模板删除成功', { templateId });
        }
        catch (error) {
            this.logger.error('删除模板失败', { templateId, error: error.message });
            throw errors_1.AppErrorFactory.createTemplateError(error, {
                operation: 'deleteTemplate',
                templateId,
            });
        }
    }
    /**
     * 验证模板
     */
    validateTemplate(template) {
        const errors = [];
        // 检查必需字段
        if (!template.id)
            errors.push('缺少模板ID');
        if (!template.name)
            errors.push('缺少模板名称');
        if (!template.language)
            errors.push('缺少语言设置');
        if (!template.content)
            errors.push('缺少模板内容');
        // 验证ID格式
        if (template.id && !/^[a-zA-Z0-9_-]+$/.test(template.id)) {
            errors.push('模板ID只能包含字母、数字、下划线和连字符');
        }
        // 验证语言
        if (template.language && !['en', 'zh-CN'].includes(template.language)) {
            errors.push('不支持的语言，仅支持 en 或 zh-CN');
        }
        // 验证内容结构
        if (template.content) {
            if (!template.content.sections || !Array.isArray(template.content.sections)) {
                errors.push('模板内容缺少sections数组');
            }
            else {
                template.content.sections.forEach((section, index) => {
                    if (!section.id)
                        errors.push(`section[${index}] 缺少ID`);
                    if (!section.title)
                        errors.push(`section[${index}] 缺少标题`);
                });
            }
            if (template.content.variables && !Array.isArray(template.content.variables)) {
                errors.push('variables必须是数组');
            }
        }
        // 验证版本
        if (template.version && !/^\d+\.\d+\.\d+$/.test(template.version)) {
            errors.push('版本号格式不正确，应为 x.y.z');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ================ 私有方法 ================
    /**
     * 创建默认模板
     */
    createDefaultTemplates() {
        const templates = [];
        // 默认市场报告模板 (英文)
        templates.push({
            id: 'market-report',
            name: '市场报告模板',
            language: 'en',
            version: '1.0.0',
            // @ts-ignore
            content: {
                sections: [
                    {
                        id: 'summary',
                        title: 'Executive Summary',
                        template: '# Market Report\n\n## Summary\n{{summary}}\n\n',
                    },
                    {
                        id: 'analysis',
                        title: 'Detailed Analysis',
                        template: '## Analysis\n{{#each analysis}}{{this}}\n\n{{/each}}',
                    },
                    {
                        id: 'findings',
                        title: 'Key Findings',
                        template: '## Key Findings\n{{#each findings}}### {{title}}\n{{description}}\n\n**Evidence**:\n{{#each evidence}}- {{this}}\n{{/each}}\n\n**Impact**: {{impact}}\n\n{{/each}}',
                    },
                    {
                        id: 'recommendations',
                        title: 'Recommendations',
                        template: '## Recommendations\n{{#each recommendations}}{{@index1}}. {{this}}\n{{/each}}',
                    },
                ],
                variables: ['summary', 'analysis', 'findings', 'recommendations'],
            },
            metadata: {
                created: new Date().toISOString(),
                author: 'Night Kitchen Agent',
                category: 'market',
            },
        });
        // 默认市场报告模板 (中文)
        templates.push({
            id: 'market-report',
            name: '市场报告模板',
            language: 'zh-CN',
            version: '1.0.0',
            content: {
                sections: [
                    {
                        id: 'summary',
                        title: '执行摘要',
                        template: '# 市场报告\n\n## 摘要\n{{summary}}\n\n',
                    },
                    {
                        id: 'analysis',
                        title: '详细分析',
                        template: '## 分析\n{{#each analysis}}{{this}}\n\n{{/each}}',
                    },
                    {
                        id: 'findings',
                        title: '关键发现',
                        template: '## 关键发现\n{{#each findings}}### {{title}}\n{{description}}\n\n**证据**:\n{{#each evidence}}- {{this}}\n{{/each}}\n\n**影响**: {{impact}}\n\n{{/each}}',
                    },
                    {
                        id: 'recommendations',
                        title: '建议',
                        template: '## 建议\n{{#each recommendations}}{{@index1}}. {{this}}\n{{/each}}',
                    },
                ],
                variables: ['summary', 'analysis', 'findings', 'recommendations'],
            },
            metadata: {
                created: new Date().toISOString(),
                author: '夜厨房代理',
                category: 'market',
            },
        });
        // 简单报告模板 (英文)
        templates.push({
            id: 'simple-report',
            name: '简单报告模板',
            language: 'en',
            version: '1.0.0',
            content: {
                sections: [
                    {
                        id: 'summary',
                        title: 'Summary',
                        template: '# Report\n\n{{summary}}\n\n## Key Points\n{{#each analysis}}- {{this}}\n{{/each}}\n\n## Recommendations\n{{#each recommendations}}- {{this}}\n{{/each}}',
                    },
                ],
                variables: ['summary', 'analysis', 'recommendations'],
            },
            metadata: {
                created: new Date().toISOString(),
                author: 'Night Kitchen Agent',
                category: 'simple',
            },
        });
        return templates;
    }
    /**
     * 获取默认模板
     */
    getDefaultTemplate(templateId, language) {
        return this.defaultTemplates.find(t => t.id === templateId && t.language === language) || null;
    }
    /**
     * 创建新模板
     */
    createNewTemplate(templateId, language) {
        const baseTemplate = this.getDefaultTemplate('market-report', language) ||
            this.defaultTemplates[0];
        return {
            ...baseTemplate,
            id: templateId,
            name: `Custom Template - ${templateId}`,
            metadata: {
                ...baseTemplate.metadata,
                created: new Date().toISOString(),
                isCustom: true,
            },
        };
    }
    /**
     * 获取模板键
     */
    getTemplateKey(templateId, language) {
        return `${templateId}_${language}`;
    }
    /**
     * 从文件系统加载模板
     */
    async loadFromFileSystem(templateId, language) {
        try {
            await promises_1.default.access(this.templateDir);
            const fileName = `${templateId}_${language}.json`;
            const filePath = path_1.default.join(this.templateDir, fileName);
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const template = JSON.parse(content);
            // 验证模板
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                this.logger.warn('文件模板验证失败', {
                    templateId,
                    language,
                    errors: validation.errors,
                });
                return null;
            }
            return template;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            this.logger.warn('从文件系统加载模板失败', {
                templateId,
                language,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * 保存到文件系统
     */
    async saveToFileSystem(template) {
        try {
            // 确保目录存在
            await promises_1.default.mkdir(this.templateDir, { recursive: true });
            const fileName = `${template.id}_${template.language}.json`;
            const filePath = path_1.default.join(this.templateDir, fileName);
            const content = JSON.stringify(template, null, 2);
            await promises_1.default.writeFile(filePath, content, 'utf-8');
            this.logger.debug('模板保存到文件系统', {
                templateId: template.id,
                filePath,
            });
        }
        catch (error) {
            throw new Error(`保存到文件系统失败: ${error.message}`);
        }
    }
    /**
     * 从文件系统列出模板
     */
    async listFromFileSystem() {
        const templates = [];
        try {
            await promises_1.default.access(this.templateDir);
            const files = await promises_1.default.readdir(this.templateDir);
            const templateFiles = files.filter(f => f.endsWith('.json'));
            for (const file of templateFiles) {
                try {
                    const filePath = path_1.default.join(this.templateDir, file);
                    const content = await promises_1.default.readFile(filePath, 'utf-8');
                    const template = JSON.parse(content);
                    const validation = this.validateTemplate(template);
                    if (validation.valid) {
                        templates.push(template);
                    }
                }
                catch (error) {
                    this.logger.warn('解析模板文件失败', { file, error: error.message });
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.warn('访问模板目录失败', { error: error.message });
            }
        }
        return templates;
    }
    /**
     * 从文件系统删除模板
     */
    async deleteFromFileSystem(templateId) {
        try {
            await promises_1.default.access(this.templateDir);
            const files = await promises_1.default.readdir(this.templateDir);
            const templateFiles = files.filter(f => f.startsWith(`${templateId}_`));
            for (const file of templateFiles) {
                try {
                    const filePath = path_1.default.join(this.templateDir, file);
                    await promises_1.default.unlink(filePath);
                    this.logger.debug('删除模板文件', { filePath });
                }
                catch (error) {
                    this.logger.warn('删除模板文件失败', { file, error: error.message });
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.warn('访问模板目录失败', { error: error.message });
            }
        }
    }
    /**
     * 确保模板目录存在
     */
    async ensureTemplateDirectory() {
        try {
            await promises_1.default.access(this.templateDir);
        }
        catch {
            await promises_1.default.mkdir(this.templateDir, { recursive: true });
            this.logger.info('创建模板目录', { directory: this.templateDir });
        }
    }
}
exports.ReportTemplateManager = ReportTemplateManager;
//# sourceMappingURL=template-manager.js.map