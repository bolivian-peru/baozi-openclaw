import Table from 'cli-table3';
import chalk from 'chalk';

export interface RecruiterStats {
  agentsOnboarded: number;
  totalVolumeSol: number;
  totalCommissionsSol: number;
}

export class RecruiterDashboard {
  private stats: RecruiterStats = {
    agentsOnboarded: 0,
    totalVolumeSol: 0,
    totalCommissionsSol: 0
  };

  public recordOnboarding(betSizeSol: number) {
    this.stats.agentsOnboarded += 1;
    this.stats.totalVolumeSol += betSizeSol;
    // Recruiter earns 1% of the referred volume
    this.stats.totalCommissionsSol += (betSizeSol * 0.01);
  }

  public render() {
    console.log('\n\n' + chalk.bold.blue('=============================================='));
    console.log(chalk.bold.blue('         BAOZI AGENT RECRUITER METRICS        '));
    console.log(chalk.bold.blue('==============================================\n'));

    const table = new Table({
      head: [
        chalk.cyan('Metric'),
        chalk.cyan('Value')
      ],
      colWidths: [30, 20]
    });

    table.push(
      ['Total Agents Onboarded', chalk.green(this.stats.agentsOnboarded.toString())],
      ['Total Volume Generated', chalk.yellow(`${this.stats.totalVolumeSol.toFixed(2)} SOL`)],
      ['Affiliate Commissions (1%)', chalk.magenta(`${this.stats.totalCommissionsSol.toFixed(4)} SOL`)]
    );

    console.log(table.toString());
    console.log(chalk.gray('\n一笼包子，一桌人情 — one basket of buns, a whole table of affection.'));
    console.log('\n');
  }
}
