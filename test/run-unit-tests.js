#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running Juggl Node Positioning Unit Tests...\n');

// Run the TypeScript tests using ts-node
const testProcess = spawn('npx', [
    'ts-node',
    '--esm',
    '--project', join(__dirname, '../tsconfig.json'),
    join(__dirname, 'unit/node-positioning.test.ts')
], {
    stdio: 'inherit',
    shell: true
});

testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ All tests passed!');
    } else {
        console.log(`\n❌ Tests failed with code ${code}`);
        process.exit(code);
    }
});

testProcess.on('error', (err) => {
    console.error('Failed to run tests:', err);
    process.exit(1);
});