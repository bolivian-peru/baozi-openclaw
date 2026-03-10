"use strict";
/**
 * 日志工具
 * 提供结构化的日志记录功能
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.createDefaultLogger = createDefaultLogger;
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
class Logger {
    static instance;
    logger;
    constructor(config) {
        const transports = [];
        // 控制台输出
        if (config.console) {
            transports.push(new winston_1.default.transports.Console({
                format: config.format === 'json'
                    ? winston_1.default.format.json()
                    : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                        const metaStr = Object.keys(meta).length
                            ? ` ${JSON.stringify(meta)}`
                            : '';
                        return `[${timestamp}] ${level}: ${message}${metaStr}`;
                    })),
            }));
        }
        // 文件输出
        if (config.file) {
            const logDir = path.dirname(config.file);
            try {
                // 确保日志目录存在
                require('fs').mkdirSync(logDir, { recursive: true });
            }
            catch (error) {
                // 目录创建失败，继续使用控制台日志
                console.error(`Failed to create log directory: ${error}`);
            }
            transports.push(new winston_1.default.transports.File({
                filename: config.file,
                format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }));
        }
        this.logger = winston_1.default.createLogger({
            level: config.level,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
            transports,
            exceptionHandlers: [
                new winston_1.default.transports.File({ filename: 'logs/exceptions.log' }),
            ],
            rejectionHandlers: [
                new winston_1.default.transports.File({ filename: 'logs/rejections.log' }),
            ],
        });
    }
    /**
     * 获取Logger实例
     */
    static getInstance(config) {
        if (!Logger.instance) {
            if (!config) {
                throw new Error('Logger configuration is required for initialization');
            }
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }
    /**
     * 记录错误日志
     */
    error(message, meta) {
        this.logger.error(message, meta);
    }
    /**
     * 记录警告日志
     */
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    /**
     * 记录信息日志
     */
    info(message, meta) {
        this.logger.info(message, meta);
    }
    /**
     * 记录调试日志
     */
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    /**
     * 记录HTTP请求日志
     */
    http(message, meta) {
        this.logger.http(message, meta);
    }
    /**
     * 创建子上下文日志器
     */
    child(meta) {
        const parent = this;
        // @ts-ignore
        return {
            // 添加logger属性指向原始winston记录器
            get logger() {
                return parent.getRawLogger();
            },
            error: (message, childMeta) => parent.error(message, { ...meta, ...childMeta }),
            warn: (message, childMeta) => parent.warn(message, { ...meta, ...childMeta }),
            info: (message, childMeta) => parent.info(message, { ...meta, ...childMeta }),
            debug: (message, childMeta) => parent.debug(message, { ...meta, ...childMeta }),
            http: (message, childMeta) => parent.http(message, { ...meta, ...childMeta }),
            child: (childMeta) => parent.child({ ...meta, ...childMeta }),
            getRawLogger: () => parent.getRawLogger(),
        };
    }
    /**
     * 获取原始Winston记录器
     */
    getRawLogger() {
        return this.logger;
    }
}
exports.Logger = Logger;
/**
 * 创建默认日志器（用于测试和快速启动）
 */
function createDefaultLogger() {
    return Logger.getInstance({
        level: 'info',
        file: './logs/night_kitchen.log',
        console: true,
        format: 'text',
    });
}
//# sourceMappingURL=logger.js.map