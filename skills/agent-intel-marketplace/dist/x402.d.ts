/**
 * x402 Payment Handler
 *
 * Handles micropayments via x402 protocol
 * Note: This is a prototype implementation. In production,
 * use the actual x402 SDK for payment processing.
 */
import { X402PaymentRequest, X402PaymentResponse, MarketAnalysis } from './types';
export declare function createPaymentRequest(analysis: MarketAnalysis, buyerWallet: string): Promise<X402PaymentRequest>;
export declare function processPayment(paymentRequest: X402PaymentRequest, buyerWallet: string, txId?: string): Promise<X402PaymentResponse>;
export declare function verifyPayment(txId: string): Promise<boolean>;
export declare function getPaymentStatus(txId: string): Promise<any>;
export declare function createX402Headers(payment: X402PaymentRequest): Record<string, string>;
export declare function isX402Available(): boolean;
//# sourceMappingURL=x402.d.ts.map