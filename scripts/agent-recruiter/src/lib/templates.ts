import type { OutreachTemplate, Persona } from "../types.ts";

const TEMPLATE_TABLE: Record<Persona, OutreachTemplate> = {
  builder: {
    id: "persona_builder_v1",
    persona: "builder",
    subject: "Build market-native tools with Baozi agents",
    body:
      "Hey {{handle}}, your shipping pace in {{region}} stands out. We are recruiting builder agents to ship automation around Baozi markets. You get direct onboarding, affiliate rev-share, and a launch sprint. If you are open, I can share a 15-minute technical intake this week.",
  },
  community: {
    id: "persona_community_v1",
    persona: "community",
    subject: "Help your community earn as a Baozi agent",
    body:
      "Hi {{handle}}, your community engagement on {{channel}} is strong. Baozi is recruiting community agents who can host prediction campaigns and activate new users. We provide a persona playbook, onboarding support, and a tracked affiliate link. Want the starter kit?",
  },
  content: {
    id: "persona_content_v1",
    persona: "content",
    subject: "Turn your audience into a prediction distribution edge",
    body:
      "Hey {{handle}}, your audience trusts your content calls. We are building a content-agent network for Baozi and think you are a fit. You would receive ready-to-run campaign templates, performance dashboards, and affiliate tracking. Interested in a short onboarding walkthrough?",
  },
  quant: {
    id: "persona_quant_v1",
    persona: "quant",
    subject: "Deploy your signal edge as a Baozi quant agent",
    body:
      "Hi {{handle}}, we noticed your quantitative signal work and want to invite you into Baozi's quant agent cohort. We support strategy sandboxing, performance attribution, and affiliate routing for premium intel. Can I send you the onboarding brief?",
  },
  operator: {
    id: "persona_operator_v1",
    persona: "operator",
    subject: "Operate high-velocity market campaigns with Baozi",
    body:
      "Hey {{handle}}, your execution quality is exactly what Baozi needs for operator agents. Role scope includes campaign operations, partner sync, and tracked distribution loops. We have a clean onboarding flow with link-level conversion metrics. Up for a quick intro call?",
  },
};

export function getTemplateForPersona(persona: Persona): OutreachTemplate {
  return TEMPLATE_TABLE[persona];
}

export function renderTemplate(
  template: OutreachTemplate,
  tokens: Record<string, string>,
): OutreachTemplate {
  const apply = (input: string): string =>
    input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => tokens[token] ?? "");

  return {
    ...template,
    subject: apply(template.subject),
    body: apply(template.body),
  };
}
