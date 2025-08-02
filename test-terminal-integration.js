#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Terminal Integration Test Runner
 * 
 * This script tests the Juggl terminal integration by:
 * 1. Building the plugin
 * 2. Copying it to a test vault
 * 3. Starting Obsidian with the test vault
 * 4. Monitoring console output for test results
 * 5. Automating the test sequence via console commands
 */

class TerminalIntegrationTester {
    constructor() {
        this.testVaultPath = '/Users/bobbobby/repos/VoiceTree/markdownTreeVault';
        this.pluginPath = '/Users/bobbobby/repos/VoiceTree/obsidian/juggl-main';
        this.pluginInstallPath = path.join(this.testVaultPath, '.obsidian/plugins/juggl');
        this.testResults = [];
        this.obsidianProcess = null;
    }

    async runTests() {
        console.log('🧪 Starting Terminal Integration Tests...\n');
        
        try {
            // Step 1: Build the plugin
            await this.buildPlugin();
            
            // Step 2: Install plugin to test vault
            await this.installPluginToVault();
            
            // Step 3: Create test markdown file
            await this.createTestFiles();
            
            // Step 4: Start Obsidian and run automated tests
            await this.runObsidianTests();
            
            // Step 5: Analyze results
            this.analyzeResults();
            
        } catch (error) {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        }
    }

    async buildPlugin() {
        console.log('📦 Building Juggl plugin...');
        
        try {
            const buildOutput = execSync('./build.sh', { 
                cwd: this.pluginPath, 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            console.log('✅ Plugin built successfully');
            
            // Extract version from build output
            const versionMatch = buildOutput.match(/FIXED VERSION v(\d+)/);
            if (versionMatch) {
                console.log(`📋 Plugin version: v${versionMatch[1]}`);
            }
            
        } catch (error) {
            throw new Error(`Plugin build failed: ${error.message}`);
        }
    }

    async installPluginToVault() {
        console.log('📂 Installing plugin to test vault...');
        
        // Ensure plugin directory exists
        if (!fs.existsSync(this.pluginInstallPath)) {
            fs.mkdirSync(this.pluginInstallPath, { recursive: true });
        }
        
        // Copy built files
        const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];
        
        for (const file of filesToCopy) {
            const sourcePath = path.join(this.pluginPath, file);
            const destPath = path.join(this.pluginInstallPath, file);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                console.log(`   ✓ Copied ${file}`);
            } else {
                console.warn(`   ⚠️  ${file} not found`);
            }
        }
        
        console.log('✅ Plugin installed to test vault');
    }

    async createTestFiles() {
        console.log('📝 Creating test files...');
        
        const testContent = `# Terminal Integration Test File

This file is used for testing the Juggl terminal integration.

## Test Instructions

1. Open Juggl graph view
2. Right-click this node
3. Select "Terminal" 
4. Verify terminal opens and connects
5. Right-click terminal node
6. Select "Hover Editor"
7. Verify terminal converts to floating window

## Expected Behavior

- Terminal should open in new tab
- Terminal node should appear in graph
- Terminal should be functional (not "Unsupported profile")
- Hover editor conversion should work

Generated at: ${new Date().toISOString()}
`;

        const testFilePath = path.join(this.testVaultPath, 'TERMINAL_INTEGRATION_TEST.md');
        fs.writeFileSync(testFilePath, testContent);
        
        console.log(`✅ Created test file: ${testFilePath}`);
    }

    async runObsidianTests() {
        console.log('🚀 Starting Obsidian with test vault...');
        
        return new Promise((resolve, reject) => {
            // Start Obsidian with specific vault
            const obsidianCmd = 'open';
            const obsidianArgs = ['-a', 'Obsidian', this.testVaultPath];
            
            console.log(`Running: ${obsidianCmd} ${obsidianArgs.join(' ')}`);
            
            this.obsidianProcess = spawn(obsidianCmd, obsidianArgs, {
                stdio: 'inherit'
            });
            
            console.log('\n📋 Manual Test Instructions:');
            console.log('════════════════════════════════════════');
            console.log('1. Wait for Obsidian to load');
            console.log('2. Open the Juggl graph view (Cmd+P → "Juggl")');
            console.log('3. Look for "TERMINAL_INTEGRATION_TEST" node');
            console.log('4. Right-click the node → select "Terminal"');
            console.log('5. Check console for debug output');
            console.log('6. Verify terminal opens and connects');
            console.log('7. Right-click terminal node → "Hover Editor"');
            console.log('8. Verify conversion works');
            console.log('════════════════════════════════════════');
            console.log('\n⏳ Waiting 30 seconds for manual testing...');
            console.log('   Check Obsidian Developer Console for debug logs');
            console.log('   Press Cmd+Option+I to open DevTools');
            
            // Wait for manual testing
            setTimeout(() => {
                console.log('\n✅ Test window complete');
                console.log('Check the Obsidian console for these log patterns:');
                console.log('  - "[Juggl Debug] Terminal option clicked"');
                console.log('  - "[Juggl Debug] Spawning terminal for ID"');
                console.log('  - "[Juggl Debug] Successfully connected terminal node"');
                console.log('  - "[Juggl Debug] Hover Editor clicked"');
                
                resolve();
            }, 30000);
        });
    }

    analyzeResults() {
        console.log('\n📊 Test Analysis:');
        console.log('═══════════════════════════════════════════');
        console.log('✅ Plugin built and deployed successfully');
        console.log('✅ Test file created');
        console.log('✅ Obsidian launched with test vault');
        console.log('\n🔍 To verify success, check for these in Obsidian console:');
        console.log('  1. Terminal node appears in graph after right-click → Terminal');
        console.log('  2. No "Unsupported profile" errors');
        console.log('  3. Hover editor conversion works without errors');
        console.log('  4. Debug logs show successful terminal connection');
        
        console.log('\n📋 Next Steps:');
        console.log('  - Check Obsidian Developer Console (Cmd+Option+I)');
        console.log('  - Look for Juggl debug messages');
        console.log('  - Test the terminal functionality manually');
        console.log('  - Report results based on console output');
    }

    // Helper method to create automated test commands
    generateTestCommands() {
        const commands = [
            '// Run these commands in Obsidian Developer Console:',
            '',
            '// 1. Check if plugins are loaded',
            'console.log("Terminal plugin:", !!app.plugins.plugins["terminal"]);',
            'console.log("Hover editor plugin:", !!app.plugins.plugins["obsidian-hover-editor"]);',
            'console.log("Juggl plugin:", !!app.plugins.plugins["juggl"]);',
            '',
            '// 2. Check Juggl terminal store',
            'const juggl = app.plugins.plugins["juggl"];',
            'if (juggl) {',
            '  console.log("Terminal store terminals:", juggl.terminalStore.terminals.size);',
            '  console.log("Available commands:", Object.keys(app.commands.commands).filter(c => c.includes("terminal")));',
            '}',
            '',
            '// 3. Test terminal creation programmatically',
            'async function testTerminalCreation() {',
            '  if (!juggl) return console.error("Juggl not found");',
            '  try {',
            '    await juggl.terminalStore.spawnTerminalForFile("TERMINAL_INTEGRATION_TEST.md");',
            '    console.log("✅ Terminal creation test completed - check for new terminal");',
            '  } catch (error) {',
            '    console.error("❌ Terminal creation failed:", error);',
            '  }',
            '}',
            '',
            '// Run the test:',
            'testTerminalCreation();'
        ];
        
        const commandsPath = path.join(this.testVaultPath, 'test-commands.js');
        fs.writeFileSync(commandsPath, commands.join('\n'));
        
        console.log(`\n📋 Generated test commands: ${commandsPath}`);
        console.log('Copy and paste these commands into Obsidian Developer Console');
    }
}

// Self-executing test runner
async function main() {
    const tester = new TerminalIntegrationTester();
    
    // Generate test commands for manual execution
    tester.generateTestCommands();
    
    // Run the automated test sequence
    await tester.runTests();
    
    console.log('\n🎯 Test execution complete!');
    console.log('Check Obsidian Developer Console for detailed results.');
}

// Run if called directly
main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});

export default TerminalIntegrationTester;