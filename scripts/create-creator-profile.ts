import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    const walletAddress = process.env.WALLET_PUBLIC_KEY;
    
    if (!walletAddress) {
        console.error("WALLET_PUBLIC_KEY not set in .env");
        process.exit(1);
    }

    console.log("Initializing MCP server...");
    console.log(`Wallet: ${walletAddress}`);

    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@baozi.bet/mcp-server']
    });

    const client = new Client({
        name: 'creator-profile-agent',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await client.connect(transport);

    console.log("\nBuilding CreatorProfile transaction...");

    const result = await client.callTool({
        name: 'build_create_creator_profile_transaction',
        arguments: {
            user_wallet: walletAddress,
            creator_wallet: walletAddress,
            display_name: "Night Kitchen",
            creator_fee_bps: 50
        }
    });

    console.log("\n=== TRANSACTION RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    await client.close();
}

main().catch(console.error);
