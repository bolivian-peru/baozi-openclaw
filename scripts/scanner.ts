import { Octokit } from "@octokit/rest";

const AFFILIATE_CODE = "SUSUHOME";

// Known agent frameworks and their GitHub orgs/topics
const DISCOVERY_SOURCES = [
  { type: "github_topic", value: "ai-agent" },
  { type: "github_topic", value: "eliza-plugin" },
  { type: "github_topic", value: "langchain-agent" },
  { type: "github_topic", value: "mcp-server" },
  { type: "baozi_agentbook", value: "https://baozi.bet/creator" },
];

export interface DiscoveredAgent {
  handle: string;
  source: string;
  url: string;
  description: string;
  score: number; // 0-100 ROI score
}

export class AgentScanner {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({ auth: githubToken });
  }

  async scan(): Promise<DiscoveredAgent[]> {
    const results: DiscoveredAgent[] = [];

    // 1. GitHub topic scan
    for (const source of DISCOVERY_SOURCES.filter(
      (s) => s.type === "github_topic"
    )) {
      try {
        const { data } = await this.octokit.search.repos({
          q: `topic:${source.value} pushed:>2026-01-01`,
          sort: "stars",
          order: "desc",
          per_page: 10,
        });

        for (const repo of data.items) {
          results.push({
            handle: repo.full_name,
            source: `github:${source.value}`,
            url: repo.html_url,
            description: repo.description ?? "",
            score: this.scoreAgent(repo),
          });
        }
      } catch (e) {
        console.error(`Scan error for ${source.value}:`, e);
      }
    }

    // 2. Baozi bounty issue commenters — real agents already engaging
    try {
      const { data } = await this.octokit.issues.listComments({
        owner: "bolivian-peru",
        repo: "baozi-openclaw",
        issue_number: 41,
        per_page: 30,
      });
      for (const comment of data) {
        if (comment.user?.login && comment.user.login !== AFFILIATE_CODE) {
          results.push({
            handle: comment.user.login,
            source: "baozi:issue#41",
            url: comment.user.html_url ?? "",
            description: "Active Baozi bounty contributor",
            score: 75, // already engaged with Baozi
          });
        }
      }
    } catch (e) {
      console.error("Baozi issue scan error:", e);
    }

    // Deduplicate and sort by score
    const seen = new Set<string>();
    return results
      .filter((a) => {
        if (seen.has(a.handle)) return false;
        seen.add(a.handle);
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }

  private scoreAgent(repo: any): number {
    let score = 0;
    score += Math.min(repo.stargazers_count / 10, 30); // up to 30 pts for stars
    score += Math.min(repo.forks_count / 5, 20); // up to 20 pts for forks
    const desc = (repo.description ?? "").toLowerCase();
    if (desc.includes("trading") || desc.includes("trade")) score += 20;
    if (desc.includes("agent")) score += 15;
    if (desc.includes("crypto") || desc.includes("solana")) score += 15;
    return Math.min(Math.round(score), 100);
  }
}
