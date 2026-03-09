#!/usr/bin/env node
import { Command } from "commander";
import { listActiveMarkets } from "./mcp-client.js";
import { postReport } from "./agentbook.js";
import { renderReport } from "./reporter.js";
const program = new Command();
program
    .name("night-kitchen")
    .description("Bilingual Baozi market report agent");
program
    .command("preview")
    .option("-l, --limit <number>", "number of markets", "6")
    .action(async (options) => {
    const markets = await listActiveMarkets(Number(options.limit));
    console.log(renderReport(markets));
});
program
    .command("post")
    .requiredOption("-w, --wallet <address>", "wallet address for AgentBook")
    .option("-l, --limit <number>", "number of markets", "6")
    .option("--dry-run", "do not send to AgentBook", false)
    .action(async (options) => {
    const markets = await listActiveMarkets(Number(options.limit));
    const report = renderReport(markets);
    await postReport(options.wallet, report, options.dryRun);
    console.log(report);
});
program.parseAsync(process.argv);
