import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const testsDir = join(rootDir, 'tests');

async function collectTestFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of dirents) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

let testFiles;
try {
  testFiles = await collectTestFiles(testsDir);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    console.error(`Test directory not found: ${testsDir}`);
    process.exit(1);
  }
  throw error;
}

if (testFiles.length === 0) {
  console.error(`No test files matching "*.spec.ts" found in ${testsDir}`);
  process.exit(1);
}

const env = {
  ...process.env,
  RB_DATA_MODE: process.env.RB_DATA_MODE ?? 'memory',
  JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret',
};

const nodeArgs = ['--test', '--import', 'tsx', ...testFiles];

const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
