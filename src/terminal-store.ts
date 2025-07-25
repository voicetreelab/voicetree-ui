import { Component, App, WorkspaceLeaf, getIcon } from 'obsidian';
import type { 
    IDataStore, 
    IJuggl, 
    IJugglPlugin 
} from 'juggl-api';
import { VizId } from 'juggl-api';
import { DataStoreEvents } from './events';
import type { NodeDefinition, EdgeDefinition, NodeCollection } from 'cytoscape';

// Terminal state interface - matches the structure from terminal plugin
interface TerminalState {
    id: string;
    name: string;
    profile: any; // Profile configuration
    cwd: string | null;
    status: 'active' | 'inactive' | 'error';
    workingDir?: string;
    command?: string;
    output?: string;
    timestamp: Date;
    leaf?: WorkspaceLeaf; // Associated workspace leaf
    sourceFile?: string; // The file this terminal is connected to
}

export class TerminalDataStore extends Component implements IDataStore {
    app: App;
    plugin: IJugglPlugin;
    events: DataStoreEvents;
    terminals: Map<string, TerminalState> = new Map();

    constructor(plugin: IJugglPlugin) {
        super();
        this.plugin = plugin;
        this.app = plugin.app;
        this.events = new DataStoreEvents();
    }

    getEvents(view: IJuggl): DataStoreEvents {
        return this.events;
    }

    storeId(): string {
        return 'terminal';
    }

    async getNeighbourhood(nodeIds: VizId[], viz: IJuggl): Promise<NodeDefinition[]> {
        const nodes: NodeDefinition[] = [];
        
        for (const nodeId of nodeIds) {
            if (nodeId.storeId === this.storeId()) {
                const terminal = this.terminals.get(nodeId.id);
                if (terminal) {
                    nodes.push(this.createNodeDefinition(terminal));
                }
            }
        }

        // Add some default terminal nodes for testing
        if (nodes.length === 0) {
            const defaultTerminals = [
                {
                    id: 'terminal-1',
                    name: 'Main Terminal',
                    profile: { name: 'bash' },
                    cwd: '/home/user',
                    status: 'active' as const,
                    workingDir: '/home/user',
                    command: 'ls -la',
                    timestamp: new Date()
                },
                {
                    id: 'terminal-2', 
                    name: 'Project Terminal',
                    profile: { name: 'zsh' },
                    cwd: '/workspace/project',
                    status: 'inactive' as const,
                    workingDir: '/workspace/project',
                    command: 'npm run dev',
                    timestamp: new Date()
                }
            ];

            for (const terminal of defaultTerminals) {
                this.terminals.set(terminal.id, terminal);
                nodes.push(this.createNodeDefinition(terminal));
            }
        }

        return nodes;
    }

    async connectNodes(allNodes: NodeCollection, newNodes: NodeCollection, viz: IJuggl): Promise<EdgeDefinition[]> {
        const edges: EdgeDefinition[] = [];
        
        // Create connections between terminals and files in their working directories
        // @ts-ignore
        for (const node of newNodes) {
            const nodeId = VizId.fromNode(node);
            if (nodeId.storeId === this.storeId()) {
                const terminal = this.terminals.get(nodeId.id);
                if (terminal && terminal.workingDir) {
                    // Find file nodes that might be in the terminal's working directory
                    // @ts-ignore
                    for (const otherNode of allNodes) {
                        const otherId = VizId.fromNode(otherNode);
                        if (otherId.storeId === 'core') {
                            // Create edge if file is related to terminal's working directory
                            edges.push({
                                group: 'edges',
                                data: {
                                    id: `${nodeId.toId()}->${otherId.toId()}`,
                                    source: nodeId.toId(),
                                    target: otherId.toId(),
                                    context: `Working in ${terminal.workingDir}`,
                                    edgeCount: 1,
                                    type: 'workingDir'
                                },
                                classes: ['terminal-file-relation', 'type-workingDir']
                            } as EdgeDefinition);
                        }
                    }
                }
            }
        }

        return edges;
    }

    async refreshNode(id: VizId, view: IJuggl): Promise<void> {
        if (id.storeId === this.storeId()) {
            const terminal = this.terminals.get(id.id);
            if (terminal && view.viz) {
                const node = view.viz.$id(id.toId());
                if (node.length > 0) {
                    // Update node data with current terminal state
                    node.data('status', terminal.status);
                    node.data('name', terminal.name);
                    
                    // Update visual classes based on status
                    node.removeClass('terminal-active terminal-inactive terminal-error');
                    node.addClass(`terminal-${terminal.status}`);
                }
            }
        }
    }

    private createNodeDefinition(terminal: TerminalState): NodeDefinition {
        return {
            group: 'nodes',
            data: {
                id: new VizId(terminal.id, this.storeId()).toId(),
                name: terminal.name,
                status: terminal.status,
                workingDir: terminal.workingDir,
                command: terminal.command,
                profile: terminal.profile?.name || 'terminal',
                timestamp: terminal.timestamp.toISOString(),
                sourceFile: terminal.sourceFile
            },
            classes: [
                'terminal-node',
                `terminal-${terminal.status}`,
                `profile-${terminal.profile?.name || 'default'} `,
                terminal.sourceFile ? 'terminal-connected' : 'terminal-standalone'
            ]
        };
    }

    // Method to add a new terminal
    addTerminal(terminal: TerminalState): void {
        this.terminals.set(terminal.id, terminal);
        this.events.trigger('createNode', terminal.id);
    }

    // Method to update terminal status
    updateTerminalStatus(id: string, status: TerminalState['status']): void {
        const terminal = this.terminals.get(id);
        if (terminal) {
            terminal.status = status;
            this.events.trigger('modifyNode', id);
        }
    }

    // Method to remove terminal
    removeTerminal(id: string): void {
        if (this.terminals.delete(id)) {
            this.events.trigger('deleteNode', id);
        }
    }

    async spawnTerminalInLeaf(terminalId: string, file?: TFile): Promise<WorkspaceLeaf> {
        console.log(`[Juggl Debug] Spawning terminal leaf for ID: ${terminalId}`);
        const terminal = this.terminals.get(terminalId);
        if (!terminal) {
            console.error(`[Juggl Debug] Terminal ${terminalId} not found in store.`);
            return null;
        }

        const terminalPlugin = this.app.plugins.plugins['terminal'];
        if (!terminalPlugin) {
            console.error('[Juggl Debug] Terminal plugin not found.');
            return null;
        }

        // Write environment info to a file before spawning terminal
        if (file) {
            const vaultPath = (this.app.vault.adapter as any).basePath || '';
            const envContent = `#!/bin/bash
# Obsidian Terminal Environment
# Generated by Juggl plugin at ${new Date().toISOString()}
# Source markdown: ${file.path}

export OBSIDIAN_SOURCE_NOTE="${file.path}"
export OBSIDIAN_SOURCE_BASENAME="${file.basename}"
export OBSIDIAN_SOURCE_NAME="${file.name}"
export OBSIDIAN_SOURCE_DIR="${file.parent.path}"
export OBSIDIAN_VAULT_PATH="${vaultPath}"

# Display info
echo "Terminal opened from: ${file.name}"
echo "Full path: ${file.path}"
echo "Vault: ${vaultPath}"
echo "Use \\$OBSIDIAN_SOURCE_NOTE to reference the source file"
echo "─────────────────────────────────────────────"
`;
            
            // Write to a file in the vault's .obsidian directory
            const envPath = this.app.vault.configDir + '/.juggl_terminal_env';
            try {
                await this.app.vault.adapter.write(envPath, envContent);
                console.log(`[Juggl Debug] Wrote terminal env to: ${envPath}`);
            } catch (e) {
                console.error('[Juggl Debug] Failed to write terminal env file:', e);
            }
        }

        const leavesBefore = new Set(this.app.workspace.getLeavesOfType('terminal:terminal'));
        console.log(`[Juggl Debug] Found ${leavesBefore.size} terminal leaves before command.`);

        try {
            await this.app.commands.executeCommandById('terminal:open-terminal.integrated.root');

            let newLeaf: WorkspaceLeaf = null;
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const leavesAfter = this.app.workspace.getLeavesOfType('terminal:terminal');
                const foundLeaf = leavesAfter.find(leaf => !leavesBefore.has(leaf));
                if (foundLeaf) {
                    newLeaf = foundLeaf;
                    break;
                }
            }

            if (newLeaf) {
                console.log(`[Juggl Debug] New terminal leaf identified: ${newLeaf.view.getViewType()}`);
                terminal.leaf = newLeaf;
                terminal.status = 'active';

                if (file && terminalPlugin.getTerminalViewByLeaf) {
                    const termView = terminalPlugin.getTerminalViewByLeaf(newLeaf);
                    if (termView && termView.terminal) {
                        // Wait a bit for terminal to initialize, then send command to source the env file
                        setTimeout(() => {
                            const dir = file.parent.path;
                            console.log(`[Juggl Debug] Sending commands to terminal`);
                            console.log(`[Juggl Debug] Terminal object exists:`, !!termView.terminal);
                            console.log(`[Juggl Debug] Terminal.send is function:`, typeof termView.terminal.send === 'function');
                            
                            // Try multiple approaches
                            try {
                                // Test with a simple echo first
                                console.log(`[Juggl Debug] Sending test echo command`);
                                termView.terminal.send(`echo "TEST: Terminal is receiving commands"\n`);
                                
                                // Change to the file's directory
                                termView.terminal.send(`cd "${dir}"\n`);
                                
                                // Source the environment file we created
                                const vaultPath = (this.app.vault.adapter as any).basePath || '';
                                const envPath = `${vaultPath}/${this.app.vault.configDir}/.juggl_terminal_env`;
                                const sourceCmd = `[ -f "${envPath}" ] && source "${envPath}"\n`;
                                console.log(`[Juggl Debug] Sourcing env file from: ${envPath}`);
                                termView.terminal.send(sourceCmd);
                                
                                // Also try writing the command directly
                                if (termView.terminal.write) {
                                    console.log(`[Juggl Debug] Trying terminal.write method`);
                                    termView.terminal.write(`echo "TEST2: Using write method"\r\n`);
                                }
                            } catch (error) {
                                console.error(`[Juggl Debug] Error sending commands:`, error);
                            }
                            
                            // Run user-defined command if any
                            const command = this.plugin.settings?.terminalCommand;
                            if (command) {
                                const processedCommand = command
                                    .replace(/{{source_note_path}}/g, file.path)
                                    .replace(/{{source_note_name}}/g, file.name)
                                    .replace(/{{source_note_basename}}/g, file.basename);
                                
                                console.log(`[Juggl Debug] Running user command: ${processedCommand}`);
                                termView.terminal.send(`${processedCommand}\n`);
                            }
                        }, 1500); // Wait 1.5 seconds for terminal to fully initialize
                    }
                }
                this.events.trigger('modifyNode', terminalId);
                return newLeaf;
            } else {
                console.error(`[Juggl Debug] Could not find new terminal leaf.`);
                terminal.status = 'error';
                this.events.trigger('modifyNode', terminalId);
                return null;
            }
        } catch (error) {
            console.error('[Juggl Debug] Error executing command to open terminal:', error);
            terminal.status = 'error';
            this.events.trigger('modifyNode', terminalId);
            return null;
        }
    }

    // Method to convert terminal leaf to hover editor
    async convertTerminalToHoverEditor(terminalId: string): Promise<void> {
        console.log(`[Juggl Debug] Converting terminal to hover editor: ${terminalId}`);
        const terminal = this.terminals.get(terminalId);
        if (!terminal) {
            console.error('[Juggl Debug] Terminal not found for conversion:', terminalId);
            return;
        }

        const hoverEditorPlugin = this.app.plugins.plugins['obsidian-hover-editor'];
        if (!hoverEditorPlugin) {
            console.error('[Juggl Debug] Hover Editor plugin not found.');
            return;
        }

        let leafToConvert = terminal.leaf;

        // If the leaf doesn't exist or is invalid, spawn a new one.
        if (!leafToConvert || leafToConvert.view.getViewType() !== 'terminal:terminal') {
            console.log('[Juggl Debug] No valid leaf found. Spawning new terminal...');
            const file = terminal.sourceFile ? this.app.metadataCache.getFirstLinkpathDest(terminal.sourceFile, '') : null;
            leafToConvert = await this.spawnTerminalInLeaf(terminalId, file);
            if (!leafToConvert) {
                console.error('[Juggl Debug] Failed to spawn terminal for hover editor.');
                return;
            }
        }
        
        console.log(`[Juggl Debug] Leaf to convert: ${leafToConvert.view.getViewType()}`);

        try {
            if (hoverEditorPlugin.convertLeafToPopover && typeof hoverEditorPlugin.convertLeafToPopover === 'function') {
                await hoverEditorPlugin.convertLeafToPopover(leafToConvert);
                console.log(`[Juggl Debug] Terminal ${terminalId} converted to hover editor.`);
            } else {
                console.error('[Juggl Debug] convertLeafToPopover method not found on hover editor plugin.');
            }
        } catch (error) {
            console.error('[Juggl Debug] Error converting terminal to hover editor:', error);
        }
    }

    // Method to spawn terminal connected to a specific file
    async spawnTerminalForFile(fileName: string, sourceNode?: any): Promise<void> {
        const file = this.app.metadataCache.getFirstLinkpathDest(fileName, '');
        if (!file) {
            console.error(`File not found: ${fileName}`);
            return;
        }

        const filePath = file.path;
        const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';

        const terminalId = `terminal-${fileName}-${Date.now()}`;
        const terminalState: TerminalState = {
            id: terminalId,
            name: `Terminal: ${fileName}`,
            profile: { type: "integrated" },
            cwd: fileDir,
            status: 'active',
            workingDir: fileDir,
            command: `cd "${fileDir}"`,
            timestamp: new Date(),
            sourceFile: fileName
        };

        this.terminals.set(terminalId, terminalState);

        // Spawn terminal immediately with environment variables set
        await this.spawnTerminalInLeaf(terminalId, file);

        this.plugin.activeGraphs().forEach(async (graph) => {
            if (graph && graph.viz) {
                const terminalNodeDef = this.createNodeDefinition(terminalState);
                const terminalNode = graph.viz.add(terminalNodeDef);
                
                if (sourceNode) {
                    const sourceId = VizId.fromNode(sourceNode).toId();
                    const terminalId = new VizId(terminalState.id, this.storeId()).toId();
                    
                    const edge = {
                        group: 'edges',
                        data: {
                            id: `${sourceId}->${terminalId}`,
                            source: sourceId,
                            target: terminalId,
                            context: `Terminal for ${fileName}`,
                            edgeCount: 1,
                            type: 'terminal'
                        },
                        classes: ['terminal-connection', 'type-terminal']
                    };
                    
                    graph.viz.add(edge);
                }

                graph.onGraphChanged(true, true);
            }
        });
    }
}