# Juggl Plugin Development Guide

## Development Workflow

IMPORTANT: there is a script that does the whole deployment for you: `./build.sh`

## Architecture Analysis

### Repository Overview
Juggl is an Obsidian plugin that provides interactive graph visualization using Cytoscape.js. It follows a modular architecture with pluggable data stores and extensible UI components.

### Key Components

**Main Entry Point**: `src/main.ts`
- JugglPlugin class extends Obsidian's Plugin
- Initializes Cytoscape extensions, data stores, and UI components
- Registers commands, views, and event handlers

**Core Visualization**: `src/viz/visualization.ts`
- Juggl class implements IJuggl interface
- Manages Cytoscape graph instance and user interactions
- Handles node expansion, filtering, layout management

**Data Management**: `src/obsidian-store.ts`
- ObsidianStore implements ICoreDataStore
- Parses markdown files to extract nodes and relationships
- Provides real-time updates when files change

**Mode System**:
- Local Mode (`src/viz/local-mode.ts`): File-focused graph exploration
- Workspace Mode (`src/viz/workspaces/workspace-mode.ts`): Saved graph configurations

### Integration Points for VoiceTree

1. **Custom Data Store**: Implement IDataStore interface
   ```typescript
   class VoiceTreeStore implements IDataStore {
     async getNeighbourhood(nodeIds: VizId[], viz: IJuggl): Promise<NodeDefinition[]>
     async connectNodes(allNodes: NodeCollection, newNodes: NodeCollection, viz: IJuggl): Promise<EdgeDefinition[]>
     storeId(): string
   }
   ```

2. **Event Handlers**: Register for graph lifecycle events
   ```typescript
   plugin.registerEvents({
     onJugglCreated(juggl: IJuggl) { /* VoiceTree initialization */ },
     onJugglDestroyed(juggl: IJuggl) { /* Cleanup */ }
   });
   ```

3. **UI Extensions**: Custom panes, toolbar buttons, and node styling for voice content

4. **Node Types**: Extend with audio/transcript relationships and voice-specific metadata

### External API (juggl-api package)
- **IJugglPlugin**: Main plugin interface
- **IJuggl**: Graph visualization interface  
- **IDataStore/ICoreDataStore**: Data source interfaces
- **VizId**: Node identification utility
- **StyleGroup**: Node styling configuration

### Dependencies
- **cytoscape**: Core graph visualization engine
- **juggl-api**: Plugin interfaces and utilities
- **svelte**: Reactive UI components
- **obsidian**: Plugin platform APIs

See `JUGGL_ARCHITECTURE_ANALYSIS.md` for detailed technical documentation.
