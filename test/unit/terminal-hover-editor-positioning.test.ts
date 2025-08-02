import { expect } from 'chai';
import { TerminalHoverEditorPositioning } from '../../src/terminal-hover-editor-positioning.js';
import type { NodeSingular, Core } from 'cytoscape';

describe('TerminalHoverEditorPositioning', () => {
    let positioning: TerminalHoverEditorPositioning;
    let mockNode: NodeSingular;
    let mockCy: Core;
    let mockPopover: HTMLElement;
    let mockObserver: MutationObserver;

    beforeEach(() => {
        positioning = new TerminalHoverEditorPositioning();
        
        // Mock MutationObserver
        mockObserver = {
            observe: () => {},
            disconnect: () => {}
        } as any;
        global.MutationObserver = (() => mockObserver) as any;

        // Mock popover element
        mockPopover = {
            offsetWidth: 400,
            offsetHeight: 300,
            style: {},
            setAttribute: () => {},
            getAttribute: () => {}
        } as any;

        // Mock DOM
        document.querySelectorAll = (() => [mockPopover]) as any;
        document.body.contains = (() => true) as any;

        // Mock Cytoscape core
        mockCy = {
            zoom: () => 1.0,
            pan: () => ({ x: 0, y: 0 }),
            on: () => {},
            off: () => {}
        } as any;

        // Mock Cytoscape node
        mockNode = {
            cy: () => mockCy,
            position: () => ({ x: 500, y: 400 }),
            renderedBoundingBox: () => ({
                x1: 450,
                y1: 350,
                x2: 550,
                y2: 450
            }),
            on: () => {},
            off: () => {}
        } as any;
    });

    describe('Test Case 1: Pan + Zoom (no user interaction with hover editor)', () => {
        it('should maintain hover editor position relative to node during pan and zoom', async () => {
            // Initial state: zoom 1.0, no pan
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);
            
            // Verify initial position (node center + offsets)
            // Node rendered center: (500, 400), offsets: (300, -50)
            expect(mockPopover.style.left).toBe('800px');
            expect(mockPopover.style.top).toBe('350px');

            // Simulate pan: move right by 100px, down by 50px
            mockCy.pan = vi.fn(() => ({ x: 100, y: 50 }));
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 550,
                y1: 400,
                x2: 650,
                y2: 500
            }));

            // Trigger position update via graph movement
            const onGraphMovement = mockNode.on.mock.calls.find(call => call[0] === 'position')?.[1];
            onGraphMovement?.();

            // Position should follow the pan
            expect(mockPopover.style.left).toBe('900px'); // 600 + 300
            expect(mockPopover.style.top).toBe('400px');  // 450 - 50

            // Simulate zoom out to 0.5x
            mockCy.zoom = vi.fn(() => 0.5);
            mockCy.pan = vi.fn(() => ({ x: 250, y: 200 })); // Pan changes with zoom
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 475,
                y1: 375,
                x2: 525,
                y2: 425
            }));

            // Trigger zoom event
            const onZoom = mockCy.on.mock.calls.find(call => call[0].includes('zoom'))?.[1];
            onZoom?.();

            // At zoom 0.5x, offset of 300 becomes 150 pixels on screen
            // Node center: (500, 400), offset scaled: (150, -25)
            expect(mockPopover.style.left).toBe('650px'); // 500 + 150
            expect(mockPopover.style.top).toBe('375px');  // 400 - 25
        });
    });

    describe('Test Case 2: Resize hover editor + Zoom', () => {
        it('should maintain user-resized dimensions proportionally during zoom', async () => {
            // Initial state: zoom 1.0
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);

            // Initial size (base dimensions normalized by initial zoom)
            const initialWidth = 400;
            const initialHeight = 300;

            // User manually resizes to 600x450 (1.5x scale)
            mockPopover.offsetWidth = 600;
            mockPopover.offsetHeight = 450;

            // Trigger resize detection
            const onGraphMovement = mockNode.on.mock.calls.find(call => call[0] === 'position')?.[1];
            onGraphMovement?.();

            // The resize scale factors should be calculated
            // resizeScaleFactorWidth = 600 / (400 * 1.0) = 1.5
            // resizeScaleFactorHeight = 450 / (300 * 1.0) = 1.5

            // Zoom to 2.0x
            mockCy.zoom = vi.fn(() => 2.0);
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 900,
                y1: 700,
                x2: 1100,
                y2: 900
            }));

            // Update popover size to reflect zoom
            // Expected: base * zoom * resizeFactor = 400 * 2.0 * 1.5 = 1200
            mockPopover.offsetWidth = 1200;
            mockPopover.offsetHeight = 900;

            onGraphMovement?.();

            // Size should scale with zoom while maintaining resize factor
            expect(mockPopover.style.width).toBe('800px'); // Max constraint applied
            expect(mockPopover.style.height).toBe('900px');

            // Zoom to 0.5x
            mockCy.zoom = vi.fn(() => 0.5);
            mockPopover.offsetWidth = 300; // 400 * 0.5 * 1.5
            mockPopover.offsetHeight = 225; // 300 * 0.5 * 1.5

            onGraphMovement?.();

            // At zoom 0.5x with 1.5x resize factor
            expect(mockPopover.style.width).toBe('300px');
            expect(mockPopover.style.height).toBe('225px');
        });
    });

    describe('Test Case 3: Drag hover editor + Zoom', () => {
        it('should maintain user drag offset in graph units during zoom', async () => {
            // Initial state: zoom 1.0
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);

            // Initial position: center (500, 400) + offset (300, -50) = (800, 350)
            expect(mockPopover.style.left).toBe('800px');
            expect(mockPopover.style.top).toBe('350px');

            // User drags hover editor 100px right, 50px down
            mockPopover.style.left = '900px';
            mockPopover.style.top = '400px';

            // Trigger drag detection
            const onGraphMovement = mockNode.on.mock.calls.find(call => call[0] === 'position')?.[1];
            onGraphMovement?.();

            // User offset should be stored in graph units
            // At zoom 1.0: 100 screen pixels = 100 graph units

            // Zoom to 0.5x
            mockCy.zoom = vi.fn(() => 0.5);
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 225,
                y1: 175,
                x2: 275,
                y2: 225
            }));

            onGraphMovement?.();

            // At zoom 0.5x:
            // - Base offset: 300 * 0.5 = 150 screen pixels
            // - User offset: 100 * 0.5 = 50 screen pixels
            // - Total: center (250, 200) + (150, -25) + (50, 25) = (450, 200)
            expect(mockPopover.style.left).toBe('450px');
            expect(mockPopover.style.top).toBe('200px');

            // Zoom to 2.0x
            mockCy.zoom = vi.fn(() => 2.0);
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 900,
                y1: 700,
                x2: 1100,
                y2: 900
            }));

            onGraphMovement?.();

            // At zoom 2.0x:
            // - Base offset: 300 * 2.0 = 600 screen pixels
            // - User offset: 100 * 2.0 = 200 screen pixels
            // - Total: center (1000, 800) + (600, -100) + (200, 100) = (1800, 800)
            expect(mockPopover.style.left).toBe('1800px');
            expect(mockPopover.style.top).toBe('800px');
        });
    });

    describe('Combined interactions', () => {
        it('should handle pan + drag + zoom correctly', async () => {
            // Initial state
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);

            // Pan the graph
            mockCy.pan = vi.fn(() => ({ x: 50, y: 25 }));
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 500,
                y1: 375,
                x2: 600,
                y2: 475
            }));

            const onGraphMovement = mockNode.on.mock.calls.find(call => call[0] === 'position')?.[1];
            onGraphMovement?.();

            // Drag the hover editor
            mockPopover.style.left = '950px'; // Was 850, dragged +100
            mockPopover.style.top = '450px';  // Was 375, dragged +75

            onGraphMovement?.();

            // Zoom out to 0.5x with combined offsets
            mockCy.zoom = vi.fn(() => 0.5);
            mockCy.pan = vi.fn(() => ({ x: 250, y: 200 }));
            mockNode.renderedBoundingBox = vi.fn(() => ({
                x1: 475,
                y1: 375,
                x2: 525,
                y2: 425
            }));

            onGraphMovement?.();

            // The drag offset (100, 75) in graph units should scale with zoom
            // At 0.5x zoom: base (150, -25) + user drag (50, 37.5) = (200, 12.5)
            // Final position: (500, 400) + (200, 12.5) = (700, 412.5)
            expect(mockPopover.style.left).toBe('700px');
            expect(mockPopover.style.top).toBe('412.5px');
        });
    });
});