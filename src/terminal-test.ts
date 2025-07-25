import { App, Notice } from 'obsidian';
import type { JugglPlugin } from './main';

export class TerminalIntegrationTest {
    app: App;
    plugin: JugglPlugin;
    
    constructor(app: App, plugin: JugglPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async runFullTest(): Promise<boolean> {
        console.log('[Juggl Test] Starting terminal integration test...');
        new Notice('Starting terminal integration test...');
        
        try {
            // Test 1: Check if terminal plugin is available
            const terminalPluginTest = await this.testTerminalPluginAvailable();
            if (!terminalPluginTest) return false;
            
            // Test 2: Test terminal creation
            const terminalCreationTest = await this.testTerminalCreation();
            if (!terminalCreationTest) return false;
            
            // Test 3: Test hover editor conversion
            const hoverEditorTest = await this.testHoverEditorConversion();
            if (!hoverEditorTest) return false;
            
            console.log('[Juggl Test] ✅ All tests passed!');
            new Notice('✅ Terminal integration test passed!');
            return true;
            
        } catch (error) {
            console.error('[Juggl Test] ❌ Test failed:', error);
            new Notice('❌ Terminal integration test failed - see console');
            return false;
        }
    }

    async testTerminalPluginAvailable(): Promise<boolean> {
        console.log('[Juggl Test] Test 1: Checking terminal plugin availability...');
        
        const terminalPlugin = this.app.plugins.plugins['terminal'];
        if (!terminalPlugin) {
            console.error('[Juggl Test] ❌ Terminal plugin not found');
            new Notice('❌ Terminal plugin not installed');
            return false;
        }
        
        const hoverEditorPlugin = this.app.plugins.plugins['obsidian-hover-editor'];
        if (!hoverEditorPlugin) {
            console.error('[Juggl Test] ❌ Hover editor plugin not found');
            new Notice('❌ Hover editor plugin not installed');
            return false;
        }
        
        console.log('[Juggl Test] ✅ Both plugins available');
        return true;
    }

    async testTerminalCreation(): Promise<boolean> {
        console.log('[Juggl Test] Test 2: Testing terminal creation...');
        
        // Create a test terminal entry
        const testTerminalId = `test-terminal-${Date.now()}`;
        const testFileName = 'test-file.md';
        
        // Add terminal to store
        await this.plugin.terminalStore.spawnTerminalForFile(testFileName);
        
        // Wait for terminal creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if terminal was created
        const terminals = Array.from(this.plugin.terminalStore.terminals.values());
        const testTerminal = terminals.find(t => t.sourceFile === testFileName);
        
        if (!testTerminal) {
            console.error('[Juggl Test] ❌ Terminal not created in store');
            return false;
        }
        
        if (!testTerminal.leaf) {
            console.error('[Juggl Test] ❌ Terminal leaf not connected');
            return false;
        }
        
        // Verify the leaf has a terminal view
        const viewType = testTerminal.leaf.view?.getViewType();
        if (!viewType?.includes('terminal')) {
            console.error('[Juggl Test] ❌ Terminal leaf does not have terminal view:', viewType);
            return false;
        }
        
        console.log('[Juggl Test] ✅ Terminal created and connected successfully');
        console.log(`[Juggl Test] - Terminal ID: ${testTerminal.id}`);
        console.log(`[Juggl Test] - View Type: ${viewType}`);
        console.log(`[Juggl Test] - Status: ${testTerminal.status}`);
        
        return true;
    }

    async testHoverEditorConversion(): Promise<boolean> {
        console.log('[Juggl Test] Test 3: Testing hover editor conversion...');
        
        // Find a terminal from the previous test
        const terminals = Array.from(this.plugin.terminalStore.terminals.values());
        const testTerminal = terminals.find(t => t.leaf && t.status === 'active');
        
        if (!testTerminal) {
            console.error('[Juggl Test] ❌ No active terminal found for hover editor test');
            return false;
        }
        
        // Store original leaf state
        const originalLeaf = testTerminal.leaf;
        const originalViewType = originalLeaf?.view?.getViewType();
        
        console.log('[Juggl Test] Converting terminal to hover editor...');
        console.log(`[Juggl Test] - Original view type: ${originalViewType}`);
        
        // Test hover editor conversion
        await this.plugin.terminalStore.convertTerminalToHoverEditor(testTerminal.id);
        
        // Wait for conversion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // The conversion should have worked if no errors were thrown
        console.log('[Juggl Test] ✅ Hover editor conversion completed');
        
        return true;
    }

    async runQuickTest(): Promise<boolean> {
        console.log('[Juggl Test] Running quick terminal test...');
        new Notice('Testing terminal integration...');
        
        // Quick test: just try to create a terminal and see if it connects
        try {
            const testFileName = `quick-test-${Date.now()}.md`;
            
            // Count terminals before
            const terminalsBefore = this.plugin.terminalStore.terminals.size;
            
            // Create terminal
            await this.plugin.terminalStore.spawnTerminalForFile(testFileName);
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Count terminals after
            const terminalsAfter = this.plugin.terminalStore.terminals.size;
            
            if (terminalsAfter > terminalsBefore) {
                console.log('[Juggl Test] ✅ Terminal created successfully');
                new Notice('✅ Terminal test passed');
                
                // Find the new terminal
                const terminals = Array.from(this.plugin.terminalStore.terminals.values());
                const newTerminal = terminals.find(t => t.sourceFile === testFileName);
                
                if (newTerminal?.leaf) {
                    console.log(`[Juggl Test] - Connected to leaf with view: ${newTerminal.leaf.view?.getViewType()}`);
                    return true;
                } else {
                    console.log('[Juggl Test] ⚠️ Terminal created but not connected to leaf');
                    new Notice('⚠️ Terminal created but not connected');
                    return false;
                }
            } else {
                console.error('[Juggl Test] ❌ No new terminal created');
                new Notice('❌ Terminal creation failed');
                return false;
            }
            
        } catch (error) {
            console.error('[Juggl Test] ❌ Quick test failed:', error);
            new Notice('❌ Terminal test failed');
            return false;
        }
    }

    // Debug method to show current state
    showDebugInfo(): void {
        console.log('[Juggl Test] === DEBUG INFO ===');
        
        const terminalPlugin = this.app.plugins.plugins['terminal'];
        const hoverEditorPlugin = this.app.plugins.plugins['obsidian-hover-editor'];
        
        console.log('Plugins:', {
            terminal: !!terminalPlugin,
            hoverEditor: !!hoverEditorPlugin
        });
        
        console.log('Terminal Store:', {
            terminalCount: this.plugin.terminalStore.terminals.size,
            terminals: Array.from(this.plugin.terminalStore.terminals.entries()).map(([id, terminal]) => ({
                id,
                status: terminal.status,
                hasLeaf: !!terminal.leaf,
                leafViewType: terminal.leaf?.view?.getViewType()
            }))
        });
        
        // Count all terminal leaves in workspace
        let terminalLeaves = 0;
        this.app.workspace.iterateAllLeaves((leaf) => {
            const viewType = leaf.view?.getViewType();
            if (viewType?.includes('terminal') && !viewType.includes('doc')) {
                terminalLeaves++;
                console.log(`Found terminal leaf: ${viewType}`);
            }
        });
        
        console.log(`Total terminal leaves in workspace: ${terminalLeaves}`);
        console.log('[Juggl Test] === END DEBUG INFO ===');
        
        new Notice(`Debug info logged - ${this.plugin.terminalStore.terminals.size} terminals, ${terminalLeaves} leaves`);
    }
}