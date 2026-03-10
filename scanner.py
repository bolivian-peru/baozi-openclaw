import json
import os
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Atlas-Scanner")

class AgentScanner:
    def __init__(self):
        self.github_api = "https://api.github.com/search/repositories"
        self.agentbook_api = "https://api.agentbook.io/v1/agents" # 模擬 API
        
    def scan_github(self, query="topic:ai-agents"):
        logger.info(f"正在 GitHub 搜尋目標: {query}")
        try:
            # 使用環境變數中的 GITHUB_TOKEN
            token = os.environ.get("GITHUB_TOKEN")
            headers = {"Authorization": f"token {token}"} if token else {}
            params = {"q": query, "sort": "updated", "order": "desc"}
            resp = requests.get(self.github_api, params=params, headers=headers)
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                return [{"name": i["full_name"], "url": i["html_url"], "type": "GitHub Repo"} for i in items[:10]]
        except Exception as e:
            logger.error(f"GitHub 搜尋失敗: {e}")
        return []

    def analyze_potential(self, agent_list):
        # 這裡未來會加入 LLM 分析，判斷 Agent 的盈利潛力
        for agent in agent_list:
            agent["potential_yield"] = "High" if "trade" in agent["name"].lower() else "Medium"
        return agent_list

if __name__ == "__main__":
    scanner = AgentScanner()
    targets = scanner.scan_github()
    analyzed = scanner.analyze_potential(targets)
    print(json.dumps(analyzed, indent=2))
