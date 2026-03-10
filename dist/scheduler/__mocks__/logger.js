"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/// <reference types="jest" />
// Mock logger for scheduler tests
exports.Logger = {
    getInstance: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        http: jest.fn(),
        child: jest.fn(() => exports.Logger.getInstance())
    })
};
//# sourceMappingURL=logger.js.map