import json
import os
import requests
import logging

# Atlas: Onboarding Pipeline (自動入駐與 1% 終身佣金綁定模組)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - Atlas-Onboarder - %(levelname)s - %(message)s')
logger = logging.getLogger("Atlas-Onboarder")

class AtlasOnboarder:
    def __init__(self, affiliate_code="Susuhome"):
        self.affiliate_code = affiliate_code
        self.mcp_endpoint = "http://localhost:18789" # OpenClaw MCP Gateway
        
    def generate_onboarding_handshake(self, target_agent):
        """
        為目標 Agent 生成專屬入駐手令 (Handshake)
        """
        logger.info(f"🤝 為 {target_agent['name']} 生成入駐手令...")
        
        handshake = {
            "recruiter": self.affiliate_code,
            "target": target_agent["name"],
            "onboarding_steps": [
                "1. Install @baozi.bet/mcp-server",
                f"2. Run: build_register_affiliate_transaction(code='{self.affiliate_code}')",
                "3. Verify: check_affiliate_code()",
                "4. Start Trading: build_bet_transaction()"
            ],
            "benefit": "Unlock high-velocity liquidity + 1% lifetime commission loop back to recruiter."
        }
        return handshake

    def register_recruit_locally(self, target_agent):
        """
        在本地 Ledger 記錄招募進度
        """
        ledger_path = "/home/skm/.openclaw/workspace/agent-recruiter/ledger.json"
        try:
            data = []
            if os.path.exists(ledger_path):
                with open(ledger_path, 'r') as f:
                    data = json.load(f)
            
            data.append({
                "agent": target_agent["name"],
                "url": target_agent["url"],
                "status": "INVITED",
                "timestamp": str(logging.Formatter.formatTime)
            })
            
            with open(ledger_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"📝 已在 Ledger 記錄招募目標: {target_agent['name']}")
        except Exception as e:
            logger.error(f"Ledger 更新失敗: {e}")

if __name__ == "__main__":
    onboarder = AtlasOnboarder()
    # 範例測試
    test_agent = {"name": "chakmaanonna/clawsuite", "url": "https://github.com/chakmaanonna/clawsuite"}
    onboarder.register_recruit_locally(test_agent)
    print(json.dumps(onboarder.generate_onboarding_handshake(test_agent), indent=2))
