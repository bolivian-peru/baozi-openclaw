import type { AffiliateLinkRecord } from "../types.ts";
import { nowIso, slugify } from "./utils.ts";

export interface AffiliateToolPatternResult {
  ok: boolean;
  tool: string;
  payload: Record<string, string>;
  warnings: string[];
  message: string;
}

export interface AffiliateStubClient {
  generateAffiliateLink(args: {
    handle: string;
    campaign: string;
    source: string;
    affiliateBaseUrl: string;
  }): Promise<{ record: AffiliateLinkRecord; patternCheck: AffiliateToolPatternResult }>;

  checkAffiliateLink(args: {
    link: AffiliateLinkRecord;
  }): Promise<AffiliateToolPatternResult>;
}

function encodePayload(payload: Record<string, string>): string {
  return Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export class BaoziMcpAffiliateStubClient implements AffiliateStubClient {
  async generateAffiliateLink(args: {
    handle: string;
    campaign: string;
    source: string;
    affiliateBaseUrl: string;
  }): Promise<{ record: AffiliateLinkRecord; patternCheck: AffiliateToolPatternResult }> {
    const code = `${slugify(args.handle)}-${Date.now().toString(36)}`;
    const payload = {
      tool: "build_affiliate_link",
      handle: args.handle,
      campaign: args.campaign,
      source: args.source,
      code,
    };
    const url = `${args.affiliateBaseUrl}?${encodePayload(payload)}`;
    const patternCheck = this.createPatternCheck("build_affiliate_link", payload, url);

    const record: AffiliateLinkRecord = {
      code,
      url,
      generatedAt: nowIso(),
      checkedAt: patternCheck.ok ? nowIso() : undefined,
      isValid: patternCheck.ok,
      lastError: patternCheck.ok ? undefined : patternCheck.message,
    };

    return { record, patternCheck };
  }

  async checkAffiliateLink(args: { link: AffiliateLinkRecord }): Promise<AffiliateToolPatternResult> {
    const url = new URL(args.link.url);
    const payload = {
      tool: url.searchParams.get("tool") ?? "",
      handle: url.searchParams.get("handle") ?? "",
      campaign: url.searchParams.get("campaign") ?? "",
      source: url.searchParams.get("source") ?? "",
      code: url.searchParams.get("code") ?? "",
    };

    return this.createPatternCheck("check_affiliate_link", payload, args.link.url);
  }

  private createPatternCheck(
    toolName: string,
    payload: Record<string, string>,
    url: string,
  ): AffiliateToolPatternResult {
    const warnings: string[] = [];
    if (!payload.handle) {
      warnings.push("handle is missing");
    }
    if (!payload.campaign) {
      warnings.push("campaign is missing");
    }
    if (!payload.code || payload.code.length < 8) {
      warnings.push("code length looks too short");
    }

    const hostOk = (() => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    })();

    if (!hostOk) {
      warnings.push("url is not parseable");
    }

    return {
      ok: warnings.length === 0,
      tool: toolName,
      payload,
      warnings,
      message:
        warnings.length === 0
          ? "Stub validated against Baozi MCP tool payload shape"
          : `Pattern check failed: ${warnings.join("; ")}`,
    };
  }
}
