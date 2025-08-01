# Animations Module

This module contains reusable animation utilities for the Juggl visualization.

## BreathingAnimationManager

Manages breathing animations for pinned nodes in the graph visualization.

### Features
- Configurable animation duration, colors, and timeout
- Automatic cleanup after timeout (default: 15 seconds)
- Stops on hover interaction
- Smooth expand/contract cycles using Cytoscape.js animations

### Usage

```typescript
import { BreathingAnimationManager } from '../animations';

// Create with default configuration
const animationManager = new BreathingAnimationManager();

// Or with custom configuration
const animationManager = new BreathingAnimationManager({
  duration: 1500,        // Animation cycle duration in ms
  timeout: 20000,        // Auto-stop timeout in ms
  expandWidth: 6,        // Border width when expanded
  expandColor: 'rgba(0, 255, 255, 1)',
  expandOpacity: 1,
  contractColor: 'rgba(0, 255, 255, 0.5)',
  contractOpacity: 0.7
});

// Add animation to nodes
animationManager.addBreathingAnimation(pinnedNodes);

// Stop animation for specific node
animationManager.stopAnimationForNode(node);

// Stop all animations
animationManager.stopAllAnimations(nodes);

// Check if animation is active
if (animationManager.isAnimationActive(node)) {
  // Handle active animation
}

// Clean up when component unmounts
animationManager.destroy();
```