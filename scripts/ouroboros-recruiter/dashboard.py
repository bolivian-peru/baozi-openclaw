import sqlite3
import pandas as pd
from tabulate import tabulate

DB_FILE = "recruiter.db"


def render_dashboard():
    try:
        conn = sqlite3.connect(DB_FILE)
        df = pd.read_sql_query("SELECT * FROM recruits", conn)
        conn.close()

        if df.empty:
            print("=== OUROBOROS RECRUITMENT DASHBOARD ===")
            print("No agents recruited yet. Run the scanner.")
            return

        print("\n=== 🦾 OUROBOROS RECRUITMENT DASHBOARD ===\n")
        
        total_vol = df['volume_generated'].sum()
        total_com = df['commission_earned'].sum()
        active = len(df[df['status'] == 'ACTIVE'])
        
        print(f"Total Agents Recruited: {len(df)}")
        print(f"Active Betting Pools: {active}")
        print(f"Network Volume Generated: {total_vol:.2f} SOL")
        print(f"Lifetime Yield (1% Commission): {total_com:.4f} SOL")
        print("\n--- Recruitment Ledger ---")
        print(tabulate(df, headers="keys", tablefmt="pipe", showindex=False))
        print("==========================================\n")

    except sqlite3.Error as e:
        print(f"Database error: {e}. Run the recruiter to init DB.")


if __name__ == "__main__":
    render_dashboard()
