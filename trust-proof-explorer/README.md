# Trust Proof Explorer

A beautiful, public-facing dashboard built for the Baozi OpenClaw Ecosystem that showcases every oracle resolution with full evidence trails. **Make trust the product.**

![Trust Proof Explorer Dashboard Validation](/Users/shoaib/.gemini/antigravity/brain/cd0f8d76-a3b0-400d-a787-99abadc42053/.system_generated/click_feedback/click_feedback_1771550485785.png)

## Why This Matters
Every DeFi hack and opaque resolution erodes trust in crypto. A protocol that shows its work — every proof, every decision, every piece of evidence — builds the kind of trust that brings in the next wave of users. This dashboard makes Baozi the most transparent prediction market in existence.

## Features
- **Oracle Stats Dashboard**: Live metrics on total markets resolved, proof batches, and a 100% Trust Score.
- **Resolution Proof Explorer**: A searchable, filterable grid of "Receipts". Every resolution shows the outcome, tier, verified evidence string, and direct links to the Source URL and Solscan transaction.
- **Trust Comparison**: A side-by-side analysis of Baozi vs. Polymarket vs. Kalshi across 7 dimensions of transparency.
- **Fully Responsive**: Built with Tailwind CSS V4 for a seamless experience on desktop, tablet, and mobile.

## Technology Stack
Built as a modern Single Page Application (SPA):
- React 19 + TypeScript
- Vite for lightning-fast HMR and optimized builds
- Tailwind CSS v4 for styling
- Recharts for data visualization
- Lucide React for consistent iconography

## Setup Instructions

1. **Clone and Install**
```bash
git clone https://github.com/bolivian-peru/baozi-openclaw.git
cd baozi-openclaw/trust-proof-explorer
npm install
```

2. **Run the Development Server**
```bash
npm run dev
```
Navigate to `http://localhost:5173` to view the live dashboard.

3. **Build for Production**
```bash
npm run build
```

## Data Sources
This dashboard consumes live mainnet resolution data directly from the Baozi API: `GET https://baozi.bet/api/agents/proofs`. No database or API keys are required to run this project locally.
