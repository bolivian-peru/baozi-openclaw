"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMessage = signMessage;
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("./config");
let keypair = null;
function getKeypair() {
    if (!keypair) {
        if (!config_1.config.privateKey) {
            throw new Error('PRIVATE_KEY not set in environment');
        }
        const secretKey = bs58_1.default.decode(config_1.config.privateKey);
        keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    return keypair;
}
function signMessage(messageText) {
    const kp = getKeypair();
    const messageBytes = new TextEncoder().encode(messageText);
    const signatureBytes = tweetnacl_1.default.sign.detached(messageBytes, kp.secretKey);
    return {
        signature: bs58_1.default.encode(signatureBytes),
        message: messageText,
    };
}
