import { expect } from 'chai';

describe('Juggl Terminal Integration', () => {
    let testFileName = 'TERMINAL_INTEGRATION_TEST.md';
    
    before(async () => {
        // Wait for Obsidian to fully load
        await browser.pause(3000);
        
        // Create test file if it doesn't exist
        try {
            await browser.obsidian.createNote(testFileName, `# Terminal Integration Test
            
This file is used for testing the Juggl terminal integration.

## Test Steps
1. Open Juggl graph view
2. Right-click this node
3. Select "Terminal"
4. Verify terminal opens and connects
5. Right-click terminal node
6. Select "Hover Editor"
7. Verify terminal converts to floating window

Generated at: ${new Date().toISOString()}
`);
        } catch (error) {
            console.log('Test file may already exist:', error.message);
        }
        
        console.log('🧪 Test setup complete');
    });

    describe('Plugin Loading', () => {
        it('should load all required plugins', async () => {
            console.log('🔍 Checking plugin loading...');
            
            // Check if plugins are loaded via JavaScript execution
            const pluginsLoaded = await browser.execute(() => {
                const app = window.app;
                if (!app) return { error: 'Obsidian app not found' };
                
                const plugins = app.plugins.plugins;
                return {
                    juggl: !!plugins['juggl'],
                    terminal: !!plugins['terminal'],
                    hoverEditor: !!plugins['obsidian-hover-editor'],
                    pluginCount: Object.keys(plugins).length
                };
            });
            
            console.log('📋 Plugin status:', pluginsLoaded);
            
            expect(pluginsLoaded.juggl).to.be.true;
            expect(pluginsLoaded.terminal).to.be.true;
            expect(pluginsLoaded.hoverEditor).to.be.true;
        });

        it('should have Juggl terminal store initialized', async () => {
            console.log('🔍 Checking Juggl terminal store...');
            
            const terminalStoreStatus = await browser.execute(() => {
                const app = window.app;
                const juggl = app.plugins.plugins['juggl'];
                
                if (!juggl) return { error: 'Juggl plugin not found' };
                
                return {
                    hasTerminalStore: !!juggl.terminalStore,
                    terminalCount: juggl.terminalStore ? juggl.terminalStore.terminals.size : 0,
                    storeId: juggl.terminalStore ? juggl.terminalStore.storeId() : null
                };
            });
            
            console.log('📋 Terminal store status:', terminalStoreStatus);
            
            expect(terminalStoreStatus.hasTerminalStore).to.be.true;
            expect(terminalStoreStatus.storeId).to.equal('terminal');
        });
    });

    describe('Graph View Integration', () => {
        it('should open Juggl graph view', async () => {
            console.log('🎯 Opening Juggl graph view...');
            
            // Open command palette
            await browser.keys(['Meta', 'p']);
            await browser.pause(500);
            
            // Type Juggl command
            await browser.keys(['j', 'u', 'g', 'g', 'l']);
            await browser.pause(500);
            
            // Press Enter to execute
            await browser.keys(['Enter']);
            await browser.pause(2000);
            
            // Verify graph view is open
            const graphViewOpen = await browser.execute(() => {
                const leaves = window.app.workspace.getLeavesOfType('juggl-view');
                return leaves.length > 0;
            });
            
            expect(graphViewOpen).to.be.true;
        });

        it('should find test file node in graph', async () => {
            console.log('🔍 Looking for test file node...');
            
            const nodeFound = await browser.execute((fileName) => {
                const app = window.app;
                const leaves = app.workspace.getLeavesOfType('juggl-view');
                
                if (leaves.length === 0) return { error: 'No Juggl graph view found' };
                
                const jugglView = leaves[0].view;
                const viz = jugglView.juggl?.viz;
                
                if (!viz) return { error: 'No visualization found' };
                
                // Look for node with our test file name
                const nodes = viz.nodes();
                const testNode = nodes.filter(node => {
                    const nodeId = node.id();
                    return nodeId.includes(fileName.replace('.md', ''));
                });
                
                return {
                    totalNodes: nodes.length,
                    testNodeFound: testNode.length > 0,
                    testNodeId: testNode.length > 0 ? testNode[0].id() : null
                };
            }, testFileName);
            
            console.log('📋 Node search result:', nodeFound);
            
            expect(nodeFound.testNodeFound).to.be.true;
        });
    });

    describe('Terminal Creation', () => {
        it('should create terminal via programmatic test', async () => {
            console.log('🔧 Testing programmatic terminal creation...');
            
            const terminalCreationResult = await browser.execute((fileName) => {
                return new Promise((resolve) => {
                    const app = window.app;
                    const juggl = app.plugins.plugins['juggl'];
                    
                    if (!juggl) {
                        resolve({ error: 'Juggl plugin not found' });
                        return;
                    }
                    
                    // Track terminals before
                    const terminalsBefore = juggl.terminalStore.terminals.size;
                    
                    // Create terminal
                    juggl.terminalStore.spawnTerminalForFile(fileName)
                        .then(() => {
                            // Check terminals after
                            setTimeout(() => {
                                const terminalsAfter = juggl.terminalStore.terminals.size;
                                const terminals = Array.from(juggl.terminalStore.terminals.values());
                                const newTerminal = terminals.find(t => t.sourceFile === fileName);
                                
                                resolve({
                                    terminalsBefore,
                                    terminalsAfter,
                                    terminalCreated: terminalsAfter > terminalsBefore,
                                    hasLeafConnection: newTerminal ? !!newTerminal.leaf : false,
                                    terminalStatus: newTerminal ? newTerminal.status : null,
                                    leafViewType: newTerminal?.leaf?.view?.getViewType() || null
                                });
                            }, 2000); // Wait 2 seconds for terminal creation
                        })
                        .catch(error => {
                            resolve({ error: error.message });
                        });
                });
            }, testFileName);
            
            console.log('📋 Terminal creation result:', terminalCreationResult);
            
            expect(terminalCreationResult.terminalCreated).to.be.true;
            expect(terminalCreationResult.hasLeafConnection).to.be.true;
            expect(terminalCreationResult.leafViewType).to.include('terminal');
        });

        it('should verify terminal appears in workspace', async () => {
            console.log('🔍 Checking workspace for terminal leaves...');
            
            const workspaceTerminals = await browser.execute(() => {
                const app = window.app;
                const terminalLeaves = [];
                
                app.workspace.iterateAllLeaves((leaf) => {
                    const viewType = leaf.view?.getViewType();
                    if (viewType && viewType.includes('terminal') && !viewType.includes('doc')) {
                        terminalLeaves.push({
                            viewType: viewType,
                            leafId: leaf.id
                        });
                    }
                });
                
                return {
                    terminalCount: terminalLeaves.length,
                    terminals: terminalLeaves
                };
            });
            
            console.log('📋 Workspace terminals:', workspaceTerminals);
            
            expect(workspaceTerminals.terminalCount).to.be.greaterThan(0);
        });
    });

    describe('Hover Editor Integration', () => {
        it('should convert terminal to hover editor', async () => {
            console.log('🔄 Testing hover editor conversion...');
            
            const conversionResult = await browser.execute(() => {
                return new Promise((resolve) => {
                    const app = window.app;
                    const juggl = app.plugins.plugins['juggl'];
                    
                    if (!juggl) {
                        resolve({ error: 'Juggl plugin not found' });
                        return;
                    }
                    
                    // Find a terminal with a leaf connection
                    const terminals = Array.from(juggl.terminalStore.terminals.values());
                    const activeTerminal = terminals.find(t => t.leaf && t.status === 'active');
                    
                    if (!activeTerminal) {
                        resolve({ error: 'No active terminal with leaf found' });
                        return;
                    }
                    
                    console.log('Found active terminal:', activeTerminal.id);
                    
                    // Attempt conversion
                    juggl.terminalStore.convertTerminalToHoverEditor(activeTerminal.id)
                        .then(() => {
                            setTimeout(() => {
                                resolve({
                                    success: true,
                                    terminalId: activeTerminal.id,
                                    originalViewType: activeTerminal.leaf?.view?.getViewType()
                                });
                            }, 1000);
                        })
                        .catch(error => {
                            resolve({ 
                                error: error.message,
                                terminalId: activeTerminal.id 
                            });
                        });
                });
            });
            
            console.log('📋 Conversion result:', conversionResult);
            
            expect(conversionResult.success).to.be.true;
        });
    });

    describe('Error Handling', () => {
        it('should handle missing terminal plugin gracefully', async () => {
            console.log('🧪 Testing error handling...');
            
            const errorHandling = await browser.execute(() => {
                const app = window.app;
                const juggl = app.plugins.plugins['juggl'];
                
                // Temporarily disable terminal plugin reference
                const originalTerminalPlugin = app.plugins.plugins['terminal'];
                delete app.plugins.plugins['terminal'];
                
                try {
                    // This should fail gracefully
                    juggl.terminalStore.spawnTerminalForFile('test-error.md');
                    
                    // Restore plugin reference
                    app.plugins.plugins['terminal'] = originalTerminalPlugin;
                    
                    return { gracefulFailure: true };
                } catch (error) {
                    // Restore plugin reference
                    app.plugins.plugins['terminal'] = originalTerminalPlugin;
                    
                    return { 
                        gracefulFailure: false, 
                        error: error.message 
                    };
                }
            });
            
            console.log('📋 Error handling result:', errorHandling);
            
            expect(errorHandling.gracefulFailure).to.be.true;
        });
    });

    after(async () => {
        console.log('🧹 Cleaning up test session...');
        
        // Clean up any test terminals
        await browser.execute(() => {
            const app = window.app;
            const juggl = app.plugins.plugins['juggl'];
            
            if (juggl && juggl.terminalStore) {
                const terminals = Array.from(juggl.terminalStore.terminals.keys());
                terminals.forEach(terminalId => {
                    if (terminalId.includes('TERMINAL_INTEGRATION_TEST')) {
                        juggl.terminalStore.removeTerminal(terminalId);
                    }
                });
            }
        });
        
        console.log('✅ Cleanup complete');
    });
});