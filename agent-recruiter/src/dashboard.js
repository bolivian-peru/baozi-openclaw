"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruiterDashboard = void 0;
const cli_table3_1 = __importDefault(require("cli-table3"));
const chalk_1 = __importDefault(require("chalk"));
class RecruiterDashboard {
    stats = {
        agentsOnboarded: 0,
        totalVolumeSol: 0,
        totalCommissionsSol: 0
    };
    recordOnboarding(betSizeSol) {
        this.stats.agentsOnboarded += 1;
        this.stats.totalVolumeSol += betSizeSol;
        // Recruiter earns 1% of the referred volume
        this.stats.totalCommissionsSol += (betSizeSol * 0.01);
    }
    render() {
        console.log('\n\n' + chalk_1.default.bold.blue('=============================================='));
        console.log(chalk_1.default.bold.blue('         BAOZI AGENT RECRUITER METRICS        '));
        console.log(chalk_1.default.bold.blue('==============================================\n'));
        const table = new cli_table3_1.default({
            head: [
                chalk_1.default.cyan('Metric'),
                chalk_1.default.cyan('Value')
            ],
            colWidths: [30, 20]
        });
        table.push(['Total Agents Onboarded', chalk_1.default.green(this.stats.agentsOnboarded.toString())], ['Total Volume Generated', chalk_1.default.yellow(`${this.stats.totalVolumeSol.toFixed(2)} SOL`)], ['Affiliate Commissions (1%)', chalk_1.default.magenta(`${this.stats.totalCommissionsSol.toFixed(4)} SOL`)]);
        console.log(table.toString());
        console.log(chalk_1.default.gray('\n一笼包子，一桌人情 — one basket of buns, a whole table of affection.'));
        console.log('\n');
    }
}
exports.RecruiterDashboard = RecruiterDashboard;
//# sourceMappingURL=dashboard.js.map