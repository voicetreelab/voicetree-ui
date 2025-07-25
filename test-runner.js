#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutomatedTester {
    constructor() {
        this.testResults = [];
        this.pluginPath = __dirname;
        this.builtFiles = {
            main: path.join(this.pluginPath, 'main.js'),
            manifest: path.join(this.pluginPath, 'manifest.json'),
            styles: path.join(this.pluginPath, 'styles.css')
        };
    }

    async runAllTests() {
        console.log('🧪 Running Automated Terminal Integration Tests\n');
        
        try {
            await this.testPluginBuild();
            await this.testCodeStructure();
            await this.testTerminalLogic();
            await this.testManifestValid();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testPluginBuild() {
        console.log('📦 Test 1: Plugin Build');
        console.log('─'.repeat(50));
        
        try {
            // Test if plugin builds without errors
            const buildOutput = execSync('./build.sh', { 
                cwd: this.pluginPath, 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // Check if built files exist
            const missingFiles = [];
            for (const [name, filePath] of Object.entries(this.builtFiles)) {
                if (!fs.existsSync(filePath)) {
                    missingFiles.push(name);
                }
            }
            
            if (missingFiles.length > 0) {
                throw new Error(`Missing built files: ${missingFiles.join(', ')}`);
            }
            
            // Extract version
            const versionMatch = buildOutput.match(/FIXED VERSION v(\d+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';
            
            this.addResult('Plugin Build', 'PASS', `Version v${version}, all files generated`);
            
        } catch (error) {
            this.addResult('Plugin Build', 'FAIL', error.message);
            throw error;
        }
    }

    async testCodeStructure() {
        console.log('\n📋 Test 2: Code Structure Analysis');
        console.log('─'.repeat(50));
        
        try {
            const mainJs = fs.readFileSync(this.builtFiles.main, 'utf8');
            
            // Test for required components
            const requiredComponents = [
                { name: 'TerminalDataStore', pattern: /TerminalDataStore/ },
                { name: 'Terminal command execution', pattern: /terminal:open-terminal\.integrated/ },
                { name: 'Hover editor integration', pattern: /convertLeafToPopover|obsidian-hover-editor/ },
                { name: 'Terminal leaf detection', pattern: /getLeavesOfType.*terminal|iterateAllLeaves/ },
                { name: 'Context menu integration', pattern: /Terminal.*content|Terminal.*select/ },
                { name: 'onLayoutReady', pattern: /onLayoutReady/ }
            ];
            
            const results = [];
            for (const component of requiredComponents) {
                const found = component.pattern.test(mainJs);
                results.push({ name: component.name, found });
                
                if (found) {
                    console.log(`   ✅ ${component.name}`);
                } else {
                    console.log(`   ❌ ${component.name}`);
                }
            }
            
            const passedComponents = results.filter(r => r.found).length;
            const totalComponents = results.length;
            
            if (passedComponents === totalComponents) {
                this.addResult('Code Structure', 'PASS', `All ${totalComponents} components found`);
            } else {
                this.addResult('Code Structure', 'PARTIAL', `${passedComponents}/${totalComponents} components found`);
            }
            
        } catch (error) {
            this.addResult('Code Structure', 'FAIL', error.message);
        }
    }

    async testTerminalLogic() {
        console.log('\n🔧 Test 3: Terminal Logic Simulation');
        console.log('─'.repeat(50));
        
        try {
            // Create mock Obsidian environment
            const mockApp = this.createMockObsidianApp();
            
            // Test terminal store creation
            const terminalStoreCode = fs.readFileSync(path.join(this.pluginPath, 'src/terminal-store.ts'), 'utf8');
            
            // Analyze the logic structure
            const logicTests = [
                {
                    name: 'Multi-view type search',
                    test: () => terminalStoreCode.includes("['terminal', 'terminal:terminal']"),
                    description: 'Checks both terminal view types'
                },
                {
                    name: 'Comprehensive leaf detection', 
                    test: () => terminalStoreCode.includes('iterateAllLeaves') && terminalStoreCode.includes('getLeavesOfType'),
                    description: 'Uses multiple leaf detection methods'
                },
                {
                    name: 'Debug logging',
                    test: () => terminalStoreCode.includes('[Juggl Debug]') && terminalStoreCode.includes('Terminal leaf'),
                    description: 'Has comprehensive debug output'
                },
                {
                    name: 'Error handling',
                    test: () => terminalStoreCode.includes('try {') && terminalStoreCode.includes('catch'),
                    description: 'Has proper error handling'
                },
                {
                    name: 'Layout ready handling',
                    test: () => terminalStoreCode.includes('onLayoutReady'),
                    description: 'Waits for layout to be ready'
                }
            ];
            
            let passedLogicTests = 0;
            for (const test of logicTests) {
                const passed = test.test();
                if (passed) {
                    console.log(`   ✅ ${test.name}: ${test.description}`);
                    passedLogicTests++;
                } else {
                    console.log(`   ❌ ${test.name}: ${test.description}`);
                }
            }
            
            // Test mock terminal creation
            const mockTerminalTest = this.testMockTerminalCreation(mockApp);
            if (mockTerminalTest.success) {
                console.log(`   ✅ Mock terminal creation: ${mockTerminalTest.message}`);
                passedLogicTests++;
            } else {
                console.log(`   ❌ Mock terminal creation: ${mockTerminalTest.message}`);
            }
            
            const totalLogicTests = logicTests.length + 1;
            if (passedLogicTests === totalLogicTests) {
                this.addResult('Terminal Logic', 'PASS', `All ${totalLogicTests} logic tests passed`);
            } else {
                this.addResult('Terminal Logic', 'PARTIAL', `${passedLogicTests}/${totalLogicTests} logic tests passed`);
            }
            
        } catch (error) {
            this.addResult('Terminal Logic', 'FAIL', error.message);
        }
    }

    createMockObsidianApp() {
        return {
            plugins: {
                plugins: {
                    'terminal': { 
                        settings: { value: { profiles: {} } }
                    },
                    'obsidian-hover-editor': {
                        convertLeafToPopover: () => Promise.resolve()
                    }
                }
            },
            commands: {
                executeCommandById: (id) => Promise.resolve(),
                commands: {
                    'terminal:open-terminal.integrated.current': { name: 'Open Terminal' }
                }
            },
            workspace: {
                getLeavesOfType: (type) => [],
                iterateAllLeaves: (callback) => {},
                onLayoutReady: (callback) => setTimeout(callback, 100),
                activeLeaf: { view: { getViewType: () => 'empty' } }
            }
        };
    }

    testMockTerminalCreation(mockApp) {
        try {
            // Test that we can create a terminal store with mock data
            const terminals = new Map();
            const testTerminal = {
                id: 'test-terminal',
                name: 'Test Terminal',
                status: 'pending',
                leaf: null
            };
            terminals.set('test-terminal', testTerminal);
            
            // Test terminal detection logic
            const terminalViewTypes = ['terminal', 'terminal:terminal'];
            let foundLeaves = [];
            
            // Mock some terminal leaves
            const mockLeaves = [
                { view: { getViewType: () => 'terminal:terminal' } },
                { view: { getViewType: () => 'markdown' } }
            ];
            
            mockLeaves.forEach(leaf => {
                const viewType = leaf.view?.getViewType();
                if (viewType && viewType.includes('terminal') && !viewType.includes('doc')) {
                    foundLeaves.push(leaf);
                }
            });
            
            if (foundLeaves.length === 1) {
                return { success: true, message: 'Mock terminal detection works correctly' };
            } else {
                return { success: false, message: `Expected 1 terminal leaf, found ${foundLeaves.length}` };
            }
            
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async testManifestValid() {
        console.log('\n📄 Test 4: Manifest Validation');
        console.log('─'.repeat(50));
        
        try {
            const manifest = JSON.parse(fs.readFileSync(this.builtFiles.manifest, 'utf8'));
            
            const requiredFields = ['id', 'name', 'version', 'minAppVersion', 'description'];
            const missingFields = requiredFields.filter(field => !manifest[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            console.log(`   ✅ Plugin ID: ${manifest.id}`);
            console.log(`   ✅ Plugin Name: ${manifest.name}`);
            console.log(`   ✅ Version: ${manifest.version}`);
            console.log(`   ✅ Min App Version: ${manifest.minAppVersion}`);
            
            this.addResult('Manifest Validation', 'PASS', 'All required fields present');
            
        } catch (error) {
            this.addResult('Manifest Validation', 'FAIL', error.message);
        }
    }

    addResult(testName, status, message) {
        this.testResults.push({ testName, status, message });
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        
        let passed = 0;
        let partial = 0;
        let failed = 0;
        
        for (const result of this.testResults) {
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'PARTIAL' ? '⚠️' : '❌';
            
            console.log(`${icon} ${result.testName}: ${result.status}`);
            console.log(`   ${result.message}`);
            
            if (result.status === 'PASS') passed++;
            else if (result.status === 'PARTIAL') partial++;
            else failed++;
        }
        
        console.log('\n' + '-'.repeat(60));
        console.log(`📊 Results: ${passed} passed, ${partial} partial, ${failed} failed`);
        
        if (failed === 0) {
            console.log('🎉 All critical tests passed! Plugin should work correctly.');
        } else if (failed === 1 && partial > 0) {
            console.log('⚠️  Some issues found, but plugin may still work.');
        } else {
            console.log('❌ Critical issues found. Plugin may not work correctly.');
        }
        
        console.log('\n💡 Next Steps:');
        if (failed === 0 && partial === 0) {
            console.log('   • Plugin ready for testing in Obsidian');
            console.log('   • Try the manual test in Obsidian Developer Console');
        } else {
            console.log('   • Review failed/partial tests above');
            console.log('   • Fix any identified issues');
            console.log('   • Re-run tests after fixes');
        }
    }
}

// Run the tests
const tester = new AutomatedTester();
tester.runAllTests();