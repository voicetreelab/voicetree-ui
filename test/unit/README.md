# Node Positioning Unit Tests

This directory contains unit tests for the Juggl plugin's node positioning algorithms.

## Overview

The tests verify that the node positioning algorithm:
- Avoids edge intersections when placing new nodes
- Maintains minimum distances between nodes
- Optimizes edge lengths for readability
- Handles complex graphs with 30+ nodes

## Running Tests

```bash
npm test
```

## Test Structure

### `node-positioning.spec.js`
- **Simple graph test**: Tests basic positioning in a small graph
- **30-node complex graph test**: Verifies performance in dense graphs
- **Edge intersection detection**: Tests the geometry algorithms

### `node-positioning.test.ts`
- Full TypeScript implementation with more comprehensive tests
- Tests the actual methods from `visualization.ts`
- Includes edge-aware positioning validation

## Implementation Notes

The test files include simplified mock implementations to verify the algorithm logic. The actual implementation in `src/viz/visualization.ts` includes:

1. **findOptimalPosition**: Main positioning algorithm that:
   - Tests 24 angles × 3 radii = 72 candidate positions
   - Scores each position based on:
     - Edge intersection count (heavy penalty: -1000 per intersection)
     - Node repulsion (avoid overlaps)
     - Edge length optimization
     - Distance from reference point

2. **findPotentialConnections**: Identifies which nodes will connect to the new node

3. **checkEdgeIntersection**: Geometry helper to detect line segment intersections

## Expected Behavior

The production algorithm should achieve:
- **Zero edge intersections** for new node edges in most cases
- **Minimum 40px distance** between nodes
- **Optimal edge lengths** between 50-200px when possible

The simplified test implementation may produce a few intersections but demonstrates the algorithm's effectiveness in reducing them significantly compared to random placement.