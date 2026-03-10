import json
import os
import requests
import logging
import datetime

# Atlas: 進階意圖偵測與高價值目標識別模組
logging.basicConfig(level=logging.INFO, format='%(asctime)s - Atlas-Recruiter - %(levelname)s - %(message)s')
logger = logging.getLogger("Atlas-Scanner-V2")

class AtlasScannerV2:
    def __init__(self):
        self.github_search_api = "https://api.github.com/search/repositories"
        self.github_repo_api = "https://api.github.com/repos"
        self.token = os.environ.get("GITHUB_TOKEN")
        self.headers = {"Authorization": f"token {self.token}", "Accept": "application/vnd.github.v3+json"} if self.token else {}
        
    def scan_high_velocity_targets(self):
        """
        核心升級：意圖偵測 (Intent Detection)
        搜尋最近 24 小時內有活動且包含 'trading', 'agent', 'mcp' 關鍵字的項目
        """
        yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat()
        # 修正 query，增加更多商業價值的關鍵字
        query = f"pushed:>{yesterday} topic:ai-agents"
        logger.info(f"🚀 啟動鑽石級目標掃描: {query}")
        
        try:
            params = {"q": query, "sort": "updated", "order": "desc"}
            # 修正此處的 self.headers
            resp = requests.get(self.github_search_api, params=params, headers=self.headers)
            if resp.status_code == 200:
                repos = resp.json().get("items", [])
                results = []
                for repo in repos[:15]:
                    score = self.calculate_roi_score(repo)
                    results.append({
                        "name": repo["full_name"],
                        "url": repo["html_url"],
                        "description": repo["description"],
                        "roi_score": score,
                        "status": "DIAMOND" if score > 80 else "GOLD"
                    })
                return sorted(results, key=lambda x: x["roi_score"], reverse=True)
            else:
                logger.error(f"GitHub API 錯誤: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"掃描失敗: {e}")
        return []

    def calculate_roi_score(self, repo):
        """
        Atlas 專屬演算法：計算 1% 終身佣金的潛在價值
        """
        score = 50 # 基礎分
        desc = (repo["description"] or "").lower()
        name = repo["full_name"].lower()
        
        # 關鍵字加權 (意圖偵測)
        if any(k in desc or k in name for k in ["trade", "dex", "swap", "mev", "arbitrage"]):
            score += 30 # 高頻交易 = 高佣金
        if any(k in desc or k in name for k in ["mcp", "protocol", "integration"]):
            score += 15 # 易於整合
        if repo["stargazers_count"] > 100:
            score += 10 # 具備網路效應
            
        return score

    def generate_pitch(self, target):
        """
        針對不同目標生成 AI 話術
        """
        if target["roi_score"] > 80:
            return f"Hi {target['name']}, Atlas here. We noticed your high-velocity agent activity. Integrating with Baozi-OpenClaw could net you a 1% lifetime commission on all recruited volume. Let's scale."
        return f"Greetings {target['name']}. Your agent framework shows promise. Baozi MCP integration is ready for you."

if __name__ == "__main__":
    scanner = AtlasScannerV2()
    targets = scanner.scan_high_velocity_targets()
    print(json.dumps(targets, indent=2))
