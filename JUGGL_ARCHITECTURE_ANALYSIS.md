# Juggl Plugin Architecture Analysis

## Overview

Juggl is an Obsidian plugin that provides an interactive, stylable, and expandable graph view for Obsidian notes. It uses Cytoscape.js for graph visualization and provides a modular architecture for extending functionality through data stores and event handlers.

## Project Structure

```
juggl-main/
├── src/                          # Main source code
│   ├── main.ts                   # Plugin entry point
│   ├── interfaces.ts             # Type definitions
│   ├── constants.ts              # Constants and CSS classes
│   ├── settings.ts               # Plugin settings management
│   ├── obsidian-store.ts         # Core data store for Obsidian
│   ├── events.ts                 # Event handling system
│   ├── image-server.ts           # Image serving for graphs
│   ├── viz/                      # Visualization components
│   │   ├── visualization.ts      # Core graph visualization
│   │   ├── juggl-view.ts         # Obsidian view wrapper
│   │   ├── local-mode.ts         # Local graph mode
│   │   ├── layout-settings.ts    # Layout configuration
│   │   ├── query-builder.ts      # Graph filtering/querying
│   │   ├── stylesheet.ts         # CSS styling system
│   │   └── workspaces/           # Workspace management
│   │       ├── workspace-manager.ts
│   │       └── workspace-mode.ts
│   ├── pane/                     # Side panel components
│   │   ├── view.ts               # Pane view management
│   │   ├── NodesPane.svelte      # Node listing pane
│   │   ├── StylePane.svelte      # Style configuration pane
│   │   └── ...
│   └── ui/                       # User interface components
│       ├── settings/             # Settings modals
│       ├── toolbar/              # Graph toolbar
│       ├── sidebar/              # Sidebar components
│       └── ...
├── docs/                         # Documentation
├── manifest.json                 # Obsidian plugin manifest
├── package.json                  # Node.js dependencies
└── rollup.config.js              # Build configuration
```

## Core Components and Execution Flow

### 1. Plugin Initialization (`main.ts`)

**JugglPlugin** extends Obsidian's Plugin class and serves as the main entry point:

```typescript
class JugglPlugin extends Plugin implements IJugglPlugin
```

**Key initialization steps:**
1. Registers Cytoscape.js extensions (cola, dagre, d3-force, etc.)
2. Creates and registers the ObsidianStore (core data store)
3. Initializes WorkspaceManager for saving/loading graph states
4. Sets up command palette commands for opening graphs
5. Registers markdown code block processor for `juggl` blocks
6. Creates view types for different panes (nodes, style, main graph)
7. Sets up event handlers for file operations

### 2. Core Visualization (`viz/visualization.ts`)

**Juggl** class implements the main graph visualization:

```typescript
class Juggl extends Component implements IJuggl
```

**Execution flow:**
1. **Constructor**: Initializes with element, plugin, data stores, settings, and initial nodes
2. **onload()**: Creates Cytoscape instance, sets up event handlers, builds initial graph
3. **Event Handling**: Mouse events (hover, click, drag), layout events, context menus
4. **Graph Operations**: Expand nodes, filter, layout management, styling

### 3. Data Management (`obsidian-store.ts`)

**ObsidianStore** implements ICoreDataStore and manages Obsidian file data:

**Key methods:**
- `getNeighbourhood()`: Retrieves connected nodes for graph expansion
- `connectNodes()`: Creates edges between nodes based on file links
- `refreshNode()`: Updates node data when files change
- `createEdges()`: Parses markdown files to extract links and relationships

### 4. Mode System

**Local Mode** (`local-mode.ts`):
- Focuses on individual file neighborhoods
- Auto-expands based on currently active file
- Provides depth-based exploration

**Workspace Mode** (`workspaces/workspace-mode.ts`):
- Manages saved graph configurations
- Allows saving/loading custom graph states
- Persistent graph layouts and filters

### 5. View Integration (`viz/juggl-view.ts`)

**JugglView** extends Obsidian's ItemView:
- Wraps Juggl visualization in Obsidian's view system
- Manages plugin lifecycle within Obsidian workspace
- Handles view state and persistence

## Key Classes and Interfaces

### External API (juggl-api package)

**Core Interfaces:**
- `IJugglPlugin`: Main plugin interface
- `IJuggl`: Graph visualization interface
- `IDataStore`: Base data store interface
- `ICoreDataStore`: Core data store interface
- `IJugglSettings`: Configuration interface
- `StyleGroup`: Node styling configuration

**Utility Classes:**
- `VizId`: Node identification and conversion
- `DataStoreEvents`: Event handling for data operations

### Data Flow

1. **File Operations** → ObsidianStore → Graph Updates
2. **User Interactions** → Event Handlers → Graph State Changes
3. **Graph Changes** → Layout Engine → Visual Updates
4. **Settings Changes** → Stylesheet Update → Visual Refresh

### Event System

**Plugin-level Events:**
- File operations (create, modify, delete, rename)
- Workspace changes (file open, view switches)
- Settings updates

**Graph-level Events:**
- Node interactions (click, hover, drag)
- Layout changes
- Filter updates
- Style changes

## Architecture Patterns

### 1. Component-based Architecture
- Uses Obsidian's Component system for lifecycle management
- Each major feature is a separate component with proper cleanup

### 2. Data Store Pattern
- Pluggable data stores for different data sources
- Core store handles Obsidian files, additional stores can be registered
- Consistent interface for data operations

### 3. Mode Pattern
- Different interaction modes (Local, Workspace)
- Each mode defines its own behavior and UI
- Switchable at runtime

### 4. Event-driven Updates
- Reactive system responds to file system changes
- Graph automatically updates when underlying data changes
- Debounced operations for performance

## Integration Points for VoiceTree

### 1. Data Store Extension
Create custom data store implementing `IDataStore`:
```typescript
class VoiceTreeStore implements IDataStore {
  async getNeighbourhood(nodeIds: VizId[], viz: IJuggl): Promise<NodeDefinition[]>
  async connectNodes(allNodes: NodeCollection, newNodes: NodeCollection, viz: IJuggl): Promise<EdgeDefinition[]>
  storeId(): string
  // ... other methods
}
```

### 2. Custom Node Types
- Add VoiceTree-specific node properties
- Custom styling for voice-generated content
- Special handling for audio/transcript relationships

### 3. Event Handlers
Register custom event handlers:
```typescript
plugin.registerEvents({
  onJugglCreated(juggl: IJuggl) {
    // Initialize VoiceTree-specific features
  },
  onJugglDestroyed(juggl: IJuggl) {
    // Cleanup
  }
});
```

### 4. UI Extensions
- Custom toolbar buttons for VoiceTree operations
- Additional panes for voice-specific controls
- Integration with VoiceTree backend services

## Build and Development

- **Build Tool**: Rollup with TypeScript
- **UI Framework**: Svelte for reactive components
- **Styling**: CSS with Cytoscape.js styling system
- **Package Manager**: npm with specific dependency versions

## Dependencies

**Core Dependencies:**
- `cytoscape`: Graph visualization engine
- `juggl-api`: Core interfaces and utilities
- Multiple Cytoscape extensions for layouts and interactions

**Development Dependencies:**
- TypeScript compilation and linting
- Svelte component compilation
- Rollup bundling and optimization

This architecture provides a solid foundation for integrating VoiceTree functionality while maintaining compatibility with Obsidian's plugin ecosystem and Juggl's extensible design patterns.