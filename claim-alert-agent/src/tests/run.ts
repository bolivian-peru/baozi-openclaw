/**
 * Test runner — lightweight test harness
 */

import chalk from 'chalk';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
let currentSuite = '';

export function describe(name: string, fn: () => void | Promise<void>): void {
  currentSuite = name;
  const result = fn();
  if (result instanceof Promise) {
    // Handle async describes in the main runner
  }
}

export async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  const fullName = currentSuite ? `${currentSuite} > ${name}` : name;
  const start = Date.now();

  try {
    await fn();
    results.push({ name: fullName, passed: true, duration: Date.now() - start });
  } catch (err) {
    results.push({
      name: fullName,
      passed: false,
      error: (err as Error).message,
      duration: Date.now() - start,
    });
  }
}

export function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message?: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `Deep equality failed:\n  Actual:   ${a}\n  Expected: ${b}`);
  }
}

export function assertThrows(fn: () => void, message?: string): void {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (err) {
    if ((err as Error).message === (message || 'Expected function to throw')) {
      throw err;
    }
    // Expected throw — pass
  }
}

export async function assertRejects(fn: () => Promise<void>, message?: string): Promise<void> {
  try {
    await fn();
    throw new Error(message || 'Expected promise to reject');
  } catch (err) {
    if ((err as Error).message === (message || 'Expected promise to reject')) {
      throw err;
    }
    // Expected rejection — pass
  }
}

// Import and run all test suites
async function main() {
  console.log(chalk.bold('\n🧪 Baozi Claim & Alert Agent — Test Suite\n'));

  // Import test modules (they register tests via side effects)
  await import('./alert-detector.test.js');
  await import('./state-store.test.js');
  await import('./notifiers.test.js');
  await import('./monitor.test.js');
  await import('./config.test.js');

  // Print results
  console.log('');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    if (result.passed) {
      console.log(chalk.green(`  ✓ ${result.name}`) + chalk.gray(` (${result.duration}ms)`));
    } else {
      console.log(chalk.red(`  ✗ ${result.name}`));
      console.log(chalk.red(`    ${result.error}`));
    }
  }

  console.log('');
  console.log(
    chalk.bold(
      `${passed + failed} tests, ` +
      chalk.green(`${passed} passed`) +
      (failed > 0 ? chalk.red(`, ${failed} failed`) : '')
    )
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(chalk.red('Test runner error:'), err);
  process.exit(1);
});
