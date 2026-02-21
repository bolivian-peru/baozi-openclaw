/**
 * Market validation module
 * Validates proposals against Baozi rules before creation
 */

import type { MarketProposal, ValidationResult, MachineConfig } from "./types/index.js";
import { execMcpTool } from "./mcp-client.js";

/**
 * Validate a market proposal locally before hitting the API
 */
export function validateProposalLocally(
  proposal: MarketProposal,
  config: MachineConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Question validation
  if (proposal.question.length < 10) {
    errors.push(`Question too short: ${proposal.question.length} chars (min 10)`);
  }
  if (proposal.question.length > 200) {
    errors.push(`Question too long: ${proposal.question.length} chars (max 200)`);
  }
  if (!proposal.question.endsWith("?")) {
    errors.push("Question must end with a question mark");
  }

  // 2. No subjective terms
  const subjectiveTerms = ["best", "worst", "exciting", "amazing", "terrible",
    "great", "good", "bad", "popular", "famous", "cool", "hot"];
  const questionLower = proposal.question.toLowerCase();
  for (const term of subjectiveTerms) {
    if (new RegExp(`\\b${term}\\b`).test(questionLower)) {
      errors.push(`Subjective term "${term}" found in question — REJECTED`);
    }
  }

  // 3. Timing validation
  const closeTime = new Date(proposal.closeTime);
  const now = new Date();

  if (isNaN(closeTime.getTime())) {
    errors.push("Invalid close time");
  } else {
    const hoursUntilClose = (closeTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilClose < config.minHoursUntilClose) {
      errors.push(`Close time too soon: ${hoursUntilClose.toFixed(1)}h (min ${config.minHoursUntilClose}h)`);
    }

    const daysUntilClose = hoursUntilClose / 24;
    if (daysUntilClose > config.maxDaysUntilClose) {
      errors.push(`Close time too far: ${daysUntilClose.toFixed(1)} days (max ${config.maxDaysUntilClose})`);
    }

    // Warn if close time is less than 3 days
    if (daysUntilClose < 3 && daysUntilClose >= config.minHoursUntilClose / 24) {
      warnings.push(`Close time is only ${daysUntilClose.toFixed(1)} days away — may have low volume`);
    }
  }

  // 4. No past events
  const pastPatterns = [
    /\bwho won\b/i,
    /\bwho scored\b/i,
    /\byesterday\b/i,
    /\blast (week|month|year)\b/i,
    /\balready\b/i,
    /\bhappened\b/i,
  ];
  for (const pattern of pastPatterns) {
    if (pattern.test(proposal.question)) {
      errors.push(`Question appears to reference a past event: ${pattern.source}`);
    }
  }

  // 5. Data source required
  if (!proposal.dataSource || proposal.dataSource.trim().length === 0) {
    errors.push("Data source is required for resolution");
  }

  // 6. Resolution criteria required
  if (!proposal.resolutionCriteria || proposal.resolutionCriteria.trim().length < 20) {
    errors.push("Resolution criteria must be specified (min 20 chars)");
  }

  // 7. Description validation
  if (!proposal.description || proposal.description.trim().length < 10) {
    warnings.push("Description is very short — consider adding more context");
  }

  // 8. Category should be set
  if (proposal.category === "other") {
    warnings.push("Category is 'other' — consider a more specific category for discoverability");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate against Baozi using the real MCP validate_market_params handler,
 * falling back to HTTP API if needed
 */
export async function validateWithBaoziApi(
  proposal: MarketProposal,
  config: MachineConfig
): Promise<ValidationResult> {
  // First try the real MCP handler
  try {
    const closingTime = proposal.closeTime;

    const result = await execMcpTool("validate_market_params", {
      question: proposal.question,
      closing_time: closingTime,
      market_type: proposal.marketType === "A" ? "event" : "measurement",
      event_time: proposal.eventTime,
      measurement_start: proposal.measurementStart,
      measurement_end: proposal.closeTime,
    });

    if (result.success) {
      const data = result.data as Record<string, unknown>;
      const validation = (data?.validation || data) as Record<string, unknown>;
      const valid = validation?.valid !== false;
      const errors = (validation?.errors as string[]) || [];
      const warnings = (validation?.warnings as string[]) || [];
      return { valid: valid && errors.length === 0, errors, warnings };
    }
    // If MCP validation fails, fall through to HTTP
    console.log(`[validator] MCP validate_market_params returned error: ${result.error}, trying HTTP API...`);
  } catch (err) {
    console.log(`[validator] MCP validation error: ${err}, trying HTTP API...`);
  }

  // Fallback: HTTP API
  try {
    const resp = await fetch(`${config.baoziBaseUrl}/api/markets/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendingMarketMachine/1.0",
      },
      body: JSON.stringify({
        question: proposal.question,
        closingTime: proposal.closeTime,
        marketType: `type${proposal.marketType}`,
        ...(proposal.measurementStart ? { measurementStart: proposal.measurementStart } : {}),
        ...(proposal.eventTime ? { eventTime: proposal.eventTime } : {}),
        description: proposal.description,
        dataSource: proposal.dataSource,
        resolutionCriteria: proposal.resolutionCriteria,
        category: proposal.category,
        tags: proposal.tags,
        isRaceMarket: proposal.isRaceMarket,
        outcomes: proposal.outcomes,
      }),
    });

    const data = await resp.json();

    // Baozi validation API returns { approved, violations, recommendations, summary }
    if (!resp.ok || data.approved === false) {
      const criticalViolations = (data.violations || [])
        .filter((v: any) => v.severity === "critical")
        .map((v: any) => v.message);
      const warningViolations = (data.violations || [])
        .filter((v: any) => v.severity === "warning")
        .map((v: any) => v.message);

      return {
        valid: criticalViolations.length === 0 && data.approved !== false,
        errors: criticalViolations.length > 0 ? criticalViolations : (data.approved === false ? [data.summary || "Rejected by Baozi API"] : []),
        warnings: warningViolations,
      };
    }

    return {
      valid: true,
      errors: [],
      warnings: (data.violations || [])
        .filter((v: any) => v.severity === "warning")
        .map((v: any) => v.message),
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Baozi API unreachable: ${err}`],
      warnings: ["Falling back to local validation only"],
    };
  }
}

/**
 * Full validation pipeline: local + API
 */
export async function validateProposal(
  proposal: MarketProposal,
  config: MachineConfig
): Promise<ValidationResult> {
  // Local validation first (fast, no network)
  const local = validateProposalLocally(proposal, config);
  if (!local.valid) {
    return local;
  }

  // API validation (authoritative)
  const api = await validateWithBaoziApi(proposal, config);

  return {
    valid: api.valid,
    errors: [...local.errors, ...api.errors],
    warnings: [...local.warnings, ...api.warnings],
  };
}
