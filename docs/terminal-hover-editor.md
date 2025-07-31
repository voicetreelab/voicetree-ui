# Terminal Hover Editor Positioning

## Overview
This document explains how we pin Obsidian hover editor windows to Juggl graph nodes, ensuring they stay positioned correctly during pan, zoom, and node movement.

## Core Concepts

### Coordinate Systems
- **Graph coordinates**: The internal position of nodes in the graph space
- **Screen coordinates**: Pixel positions on the screen after transformations
- **CSS positioning**: `position: fixed` with `left`/`top` sets the top-left corner

### Key APIs
- `node.renderedPosition()`: Returns node center in screen coordinates (includes pan/zoom)
- `popover.offsetWidth/Height`: Actual pixel dimensions of the hover editor
- CSS `left`/`top`: Position the top-left corner of the element

## Implementation Logic

### Basic Positioning
```javascript
// Get node center in screen coordinates
const pos = node.renderedPosition();

// Get hover editor dimensions
const width = popover.offsetWidth;
const height = popover.offsetHeight;

// Calculate top-left position to center the popover
const x = pos.x - width / 2;
const y = pos.y - height / 2;

// Apply position
popover.style.left = `${x}px`;
popover.style.top = `${y}px`;
```

### Zoom-based Scaling
```javascript
// Logarithmic scale for reasonable sizing (0.7x to 1.4x range)
const scaleFactor = Math.pow(zoom, 0.3);

// Apply scale with min/max limits
const finalWidth = Math.max(200, Math.min(800, originalWidth * scaleFactor));
const finalHeight = Math.max(150, Math.min(600, originalHeight * scaleFactor));

popover.style.width = `${finalWidth}px`;
popover.style.height = `${finalHeight}px`;
```

### Event Handling
```javascript
// Listen for node movement and graph transformations
node.on('position', updatePosition);
node.cy().on('pan zoom resize', updatePosition);
```

## Key Learnings

### 1. Hover Editor Plugin Interference
The hover editor plugin manages its own positioning using:
- Inline styles: `style="left: -157px; top: -353px;"`
- Data attributes: `data-x` and `data-y` for drag tracking
- We must update both to ensure our positioning sticks

### 2. Infinite Loop Prevention
Our position updates can trigger node position events, creating loops:
```javascript
// Track update state
let isUpdating = false;

const updatePosition = () => {
    if (isUpdating) return;
    isUpdating = true;
    
    // ... positioning logic ...
    
    setTimeout(() => { isUpdating = false; }, 10);
};
```

### 3. DOM Timing Issues
- Hover editor needs time to render before we can position it
- Use `setTimeout` to wait for DOM updates
- Initial dimensions may be 0 if measured too early

### 4. Transform vs Position
- Initially tried CSS transforms for scaling, but this complicated positioning
- Better to adjust width/height directly and recalculate position
- Always reset transforms: `popover.style.transform = 'none'`

### 5. Selector Challenges
Multiple hover editor implementations use different class names:
```javascript
const selectors = [
    '.hover-editor',
    '.popover.hover-popover', 
    '.hover-editor-popover'
];
```

### 6. Zoom Gap Issue - Critical Discovery
**Problem**: When zooming out, the gap between hover editor and node increases. This suggests a fundamental positioning calculation error.

**Root Cause Analysis**:
1. **Dimension Measurement Timing**: The hover editor's `offsetWidth/Height` might be measured before CSS styles are fully applied
2. **Hover Editor Internal Structure**: The hover editor likely has internal padding/margins that aren't accounted for in `offsetWidth/Height`
3. **Transform Origin Issues**: Even though we set `transform: 'none'`, the hover editor plugin might have CSS that affects positioning
4. **Stale Dimensions**: We store original dimensions but the hover editor might be resizing itself

**Potential Solutions**:

#### Solution 1: Force Reflow and Remeasure
```javascript
const updatePosition = () => {
    // Force browser reflow to get accurate dimensions
    popover.style.display = 'none';
    popover.offsetHeight; // Force reflow
    popover.style.display = '';
    
    // Now measure fresh dimensions
    const rect = popover.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Position using fresh measurements
    const x = pos.x - width / 2;
    const y = pos.y - height / 2;
};
```

#### Solution 2: Account for Visual vs Layout Box
```javascript
// The visual center might differ from the layout center
const computedStyle = window.getComputedStyle(popover);
const paddingLeft = parseFloat(computedStyle.paddingLeft);
const paddingTop = parseFloat(computedStyle.paddingTop);
const borderLeft = parseFloat(computedStyle.borderLeftWidth);
const borderTop = parseFloat(computedStyle.borderTopWidth);

// Adjust position to account for padding/border
const visualOffsetX = paddingLeft + borderLeft;
const visualOffsetY = paddingTop + borderTop;
```

#### Solution 3: Use Cytoscape Popper Integration
Since Juggl already uses cytoscape-popper, we could leverage it directly:
```javascript
// Instead of manual positioning, use cytoscape's popper
const popper = node.popper({
    content: () => popover,
    popper: {
        placement: 'center',
        modifiers: {
            preventOverflow: { enabled: false },
            hide: { enabled: false }
        }
    }
});
```

#### Solution 4: Scale-Compensated Positioning
The gap increase with zoom suggests a mathematical relationship:
```javascript
// If gap increases with zoom-out, we might need to compensate
const zoomCompensation = 1 / zoom; // or some other relationship
const compensatedX = pos.x - (width / 2) * zoomCompensation;
const compensatedY = pos.y - (height / 2) * zoomCompensation;
```

#### Solution 5: Debug Visual Bounds
Add visual debugging to understand the actual bounds:
```javascript
// Temporarily add a border to see actual bounds
popover.style.outline = '2px solid red';
popover.style.boxSizing = 'border-box';

// Log all relevant dimensions
console.log({
    offsetWidth: popover.offsetWidth,
    scrollWidth: popover.scrollWidth,
    clientWidth: popover.clientWidth,
    boundingRect: popover.getBoundingClientRect(),
    computedStyle: {
        width: computedStyle.width,
        padding: computedStyle.padding,
        margin: computedStyle.margin,
        transform: computedStyle.transform
    }
});
```

## Architecture

### TerminalHoverEditorPositioning Class
- Manages all hover editor positioning logic
- Tracks multiple hover editors with their associated nodes
- Handles cleanup when hover editors are removed
- Provides reusable positioning for any node type

### Integration Flow
1. Terminal node created in graph
2. User hovers with Cmd/Ctrl key
3. Terminal converts to hover editor via plugin API
4. Our positioning system pins it to the node
5. Position updates on node movement/graph changes
6. Cleanup when hover editor closes

## Best Practices

1. **Always use screen coordinates** - `renderedPosition()` handles transformations
2. **Update both styles and data attributes** - Ensures compatibility with drag systems
3. **Implement recursion guards** - Prevent infinite update loops
4. **Handle async DOM updates** - Wait for elements to fully render
5. **Clean up event listeners** - Prevent memory leaks

## Future Improvements

1. **Smooth transitions** - Add CSS transitions for position changes
2. **Edge detection** - Keep hover editors within viewport bounds
3. **Multi-monitor support** - Handle screen boundary detection
4. **Performance optimization** - Debounce rapid position updates