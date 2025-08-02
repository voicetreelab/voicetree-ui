#!/usr/bin/env node

// Simple test script for terminal hover editor positioning
console.log('Testing Terminal Hover Editor Positioning...\n');

// Mock environment
global.MutationObserver = class {
    observe() {}
    disconnect() {}
};

global.document = {
    querySelectorAll: () => [{
        offsetWidth: 400,
        offsetHeight: 300,
        style: {},
        setAttribute: () => {},
        getAttribute: () => {}
    }],
    body: {
        contains: () => true
    }
};

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✓ ${message}`);
        testsPassed++;
    } else {
        console.error(`✗ ${message}`);
        testsFailed++;
    }
}

function assertClose(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    assert(diff <= tolerance, `${message} (expected: ${expected}, actual: ${actual}, diff: ${diff})`);
}

// Import and test
import('../../src/terminal-hover-editor-positioning.js').then(module => {
    const { TerminalHoverEditorPositioning } = module;
    
    console.log('Test 1: Basic positioning with zoom\n');
    runTest1(TerminalHoverEditorPositioning);
    
    console.log('\nTest 2: User drag offset with zoom\n');
    runTest2(TerminalHoverEditorPositioning);
    
    console.log('\nTest 3: Combined pan and zoom\n');
    runTest3(TerminalHoverEditorPositioning);
    
    // Summary
    console.log(`\n========================================`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);
    console.log(`========================================\n`);
    
    process.exit(testsFailed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Failed to import module:', err);
    process.exit(1);
});

function runTest1(TerminalHoverEditorPositioning) {
    const positioning = new TerminalHoverEditorPositioning();
    let currentZoom = 1.0;
    let renderedBounds = { x1: 450, y1: 350, x2: 550, y2: 450 };
    
    const mockPopover = {
        offsetWidth: 400,
        offsetHeight: 300,
        style: {},
        setAttribute: () => {},
        getAttribute: () => {}
    };
    
    global.document.querySelectorAll = () => [mockPopover];
    
    const mockNode = {
        cy: () => ({
            zoom: () => currentZoom,
            pan: () => ({ x: 0, y: 0 }),
            on: () => {},
            off: () => {}
        }),
        position: () => ({ x: 500, y: 400 }),
        renderedBoundingBox: () => renderedBounds,
        on: (event, handler) => {
            // Simulate initial positioning
            setTimeout(() => {
                handler();
                
                // Test initial position at zoom 1.0
                const expectedLeft = 500 + 300; // center + offset
                const expectedTop = 400 - 50;
                assertClose(parseFloat(mockPopover.style.left), expectedLeft, 1, 'Initial left position');
                assertClose(parseFloat(mockPopover.style.top), expectedTop, 1, 'Initial top position');
                
                // Test zoom to 0.5
                currentZoom = 0.5;
                renderedBounds = { x1: 475, y1: 375, x2: 525, y2: 425 };
                handler();
                
                const expectedLeft2 = 500 + (300 * 0.5); // offset scales with zoom
                const expectedTop2 = 400 - (50 * 0.5);
                assertClose(parseFloat(mockPopover.style.left), expectedLeft2, 1, 'Position after zoom 0.5 - left');
                assertClose(parseFloat(mockPopover.style.top), expectedTop2, 1, 'Position after zoom 0.5 - top');
            }, 100);
        },
        off: () => {}
    };
    
    positioning.pinHoverEditorToNode('test-1', mockNode);
}

function runTest2(TerminalHoverEditorPositioning) {
    const positioning = new TerminalHoverEditorPositioning();
    let currentZoom = 1.0;
    
    const mockPopover = {
        offsetWidth: 400,
        offsetHeight: 300,
        style: {},
        setAttribute: () => {},
        getAttribute: () => {}
    };
    
    global.document.querySelectorAll = () => [mockPopover];
    
    const mockNode = {
        cy: () => ({
            zoom: () => currentZoom,
            pan: () => ({ x: 0, y: 0 }),
            on: () => {},
            off: () => {}
        }),
        position: () => ({ x: 500, y: 400 }),
        renderedBoundingBox: () => ({ x1: 450, y1: 350, x2: 550, y2: 450 }),
        on: (event, handler) => {
            setTimeout(() => {
                // Initial position
                handler();
                
                // Simulate user drag (100px right, 50px down)
                mockPopover.style.left = '900px';
                mockPopover.style.top = '400px';
                handler();
                
                // Now zoom to 0.5
                currentZoom = 0.5;
                handler();
                
                // User offset should scale with zoom
                // Base position: 500 + (300 * 0.5) = 650
                // User offset: 100 * 0.5 = 50
                // Total: 650 + 50 = 700
                assertClose(parseFloat(mockPopover.style.left), 700, 1, 'Left position after drag and zoom');
                assertClose(parseFloat(mockPopover.style.top), 387.5, 1, 'Top position after drag and zoom');
            }, 100);
        },
        off: () => {}
    };
    
    positioning.pinHoverEditorToNode('test-2', mockNode);
}

function runTest3(TerminalHoverEditorPositioning) {
    const positioning = new TerminalHoverEditorPositioning();
    let currentZoom = 1.0;
    let currentPan = { x: 0, y: 0 };
    let renderedBounds = { x1: 450, y1: 350, x2: 550, y2: 450 };
    
    const mockPopover = {
        offsetWidth: 400,
        offsetHeight: 300,
        style: {},
        setAttribute: () => {},
        getAttribute: () => {}
    };
    
    global.document.querySelectorAll = () => [mockPopover];
    
    const mockNode = {
        cy: () => ({
            zoom: () => currentZoom,
            pan: () => currentPan,
            on: () => {},
            off: () => {}
        }),
        position: () => ({ x: 500, y: 400 }),
        renderedBoundingBox: () => renderedBounds,
        on: (event, handler) => {
            setTimeout(() => {
                handler();
                
                // Pan and zoom together
                currentPan = { x: 100, y: 50 };
                currentZoom = 0.75;
                renderedBounds = { x1: 525, y1: 387.5, x2: 600, y2: 462.5 };
                handler();
                
                // Rendered center should be at (562.5, 425)
                // Offset scaled: (300 * 0.75, -50 * 0.75) = (225, -37.5)
                const expectedLeft = 562.5 + 225;
                const expectedTop = 425 - 37.5;
                assertClose(parseFloat(mockPopover.style.left), expectedLeft, 1, 'Left position after pan and zoom');
                assertClose(parseFloat(mockPopover.style.top), expectedTop, 1, 'Top position after pan and zoom');
            }, 100);
        },
        off: () => {}
    };
    
    positioning.pinHoverEditorToNode('test-3', mockNode);
}