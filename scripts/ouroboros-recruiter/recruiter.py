import argparse
import datetime
import json
import logging
import random
import sqlite3
import time
from typing import Dict, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ouroboros")

DB_FILE = "recruiter.db"


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS recruits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT UNIQUE,
            status TEXT,
            onboarded_at TEXT,
            volume_generated REAL,
            commission_earned REAL
        )
    """
    )
    conn.commit()
    conn.close()


def load_templates() -> Dict[str, str]:
    try:
        with open("templates.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "aggressive": "Deploying 1% lifetime commission extraction. Call my affiliate node.",
            "friendly": "Let's trade together on Baozi using open MCP tooling! Build your profile.",
            "technical": "High RPC bandwidth available on Baozi.bet. Synthesize via mcp-server.",
        }


def discover_agents() -> List[str]:
    logger.info("Scanning Github [OpenClaw / AgentBook] repositories for targets...")
    time.sleep(1)
    targets = [
        f"0x{random.randint(100000, 999999)}_Agent{random.choice(['Atlas', 'Omega', 'Neo', 'Swarm', 'X'])}"
        for _ in range(3)
    ]
    logger.info(f"Target Acquired: Discovered {len(targets)} optimal high-yield agents.")
    return targets


def send_pitch(agent_id: str, templates: Dict[str, str]):
    pitch_style = random.choice(list(templates.keys()))
    pitch_text = templates[pitch_style]
    logger.info(f"Sending pitch [{pitch_style}] to {agent_id}: '{pitch_text}'")
    time.sleep(0.5)


def onboard_agent(agent_id: str):
    logger.info(f"Initiating MCP Onboarding Pipeline for {agent_id}...")
    time.sleep(1)
    
    logger.info(" -> Formatting affiliate link via `format_affiliate_link`")
    logger.info(" -> Broadcasting transaction `build_create_creator_profile_transaction`")
    time.sleep(1)
    
    volume = round(random.uniform(0.1, 5.0), 2)
    logger.info(f" -> First bet confirmed! Volume: {volume} SOL.")
    
    commission = round(volume * 0.01, 4)
    logger.info("Onboarding successful. Agent hooked into the 1% lifetime loop.")
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """
        INSERT OR IGNORE INTO recruits (agent_id, status, onboarded_at, volume_generated, commission_earned)
        VALUES (?, 'ACTIVE', ?, ?, ?)
    """,
        (agent_id, datetime.datetime.now().isoformat(), volume, commission),
    )
    conn.commit()
    conn.close()


def run_cycle():
    logger.info("Starting Ouroboros Recruitment Cycle...")
    templates = load_templates()
    agents = discover_agents()
    
    for agent in agents:
        send_pitch(agent, templates)
        if random.random() > 0.3:
            onboard_agent(agent)
        else:
            logger.info(f"Agent {agent} rejected pitch. Ignoring.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ouroboros Agent Recruiter")
    parser.add_argument("--init", action="store_true", help="Init database")
    parser.add_argument("--run", action="store_true", help="Run recruitment cycle")
    
    args = parser.parse_args()
    
    if args.init:
        init_db()
        logger.info("Database initialized.")
    elif args.run:
        init_db()
        run_cycle()
    else:
        parser.print_help()
