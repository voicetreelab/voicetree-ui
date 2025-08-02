import { expect } from 'chai';
import { TerminalHoverEditorPositioning } from '../../src/terminal-hover-editor-positioning.js';

describe('TerminalHoverEditorPositioning', () => {
    let positioning;
    let mockNode;
    let mockCy;
    let mockPopover;
    let eventHandlers;

    beforeEach(() => {
        positioning = new TerminalHoverEditorPositioning();
        eventHandlers = {};
        
        // Mock MutationObserver
        global.MutationObserver = class {
            observe() {}
            disconnect() {}
        };

        // Mock popover element
        mockPopover = {
            offsetWidth: 400,
            offsetHeight: 300,
            style: {},
            setAttribute: () => {},
            getAttribute: () => {}
        };

        // Mock DOM
        global.document = {
            querySelectorAll: () => [mockPopover],
            body: {
                contains: () => true
            }
        };

        // Mock Cytoscape core
        let currentZoom = 1.0;
        let currentPan = { x: 0, y: 0 };
        
        mockCy = {
            zoom: (val) => {
                if (val !== undefined) currentZoom = val;
                return currentZoom;
            },
            pan: (val) => {
                if (val !== undefined) currentPan = val;
                return currentPan;
            },
            on: (events, handler) => {
                events.split(' ').forEach(event => {
                    eventHandlers[`cy-${event}`] = handler;
                });
            },
            off: () => {}
        };

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
            on: (event, handler) => {
                eventHandlers[`node-${event}`] = handler;
            },
            off: () => {}
        };
    });

    describe('Test Case 1: Pan + Zoom (no user interaction with hover editor)', () => {
        it('should maintain hover editor position relative to node during pan and zoom', async () => {
            // Initial state: zoom 1.0, no pan
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Verify initial position (node center + offsets)
            // Node rendered center: (500, 400), offsets: (300, -50)
            expect(mockPopover.style.left).to.equal('800px');
            expect(mockPopover.style.top).to.equal('350px');

            // Simulate pan: move right by 100px, down by 50px
            mockCy.pan({ x: 100, y: 50 });
            mockNode.renderedBoundingBox = () => ({
                x1: 550,
                y1: 400,
                x2: 650,
                y2: 500
            });

            // Trigger position update via graph movement
            if (eventHandlers['node-position']) {
                eventHandlers['node-position']();
            }

            // Position should follow the pan
            expect(mockPopover.style.left).to.equal('900px'); // 600 + 300
            expect(mockPopover.style.top).to.equal('400px');  // 450 - 50

            // Simulate zoom out to 0.5x
            mockCy.zoom(0.5);
            mockCy.pan({ x: 250, y: 200 }); // Pan changes with zoom
            mockNode.renderedBoundingBox = () => ({
                x1: 475,
                y1: 375,
                x2: 525,
                y2: 425
            });

            // Trigger zoom event
            if (eventHandlers['cy-zoom']) {
                eventHandlers['cy-zoom']();
            }

            // At zoom 0.5x, offset of 300 becomes 150 pixels on screen
            // Node center: (500, 400), offset scaled: (150, -25)
            expect(mockPopover.style.left).to.equal('650px'); // 500 + 150
            expect(mockPopover.style.top).to.equal('375px');  // 400 - 25
        });
    });

    describe('Test Case 2: Resize hover editor + Zoom', () => {
        it('should maintain user-resized dimensions proportionally during zoom', async () => {
            // Initial state: zoom 1.0
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);
            await new Promise(resolve => setTimeout(resolve, 600));

            // User manually resizes to 600x450 (1.5x scale)
            mockPopover.offsetWidth = 600;
            mockPopover.offsetHeight = 450;

            // Trigger resize detection
            if (eventHandlers['node-position']) {
                eventHandlers['node-position']();
            }

            // Zoom to 2.0x
            mockCy.zoom(2.0);
            mockNode.renderedBoundingBox = () => ({
                x1: 900,
                y1: 700,
                x2: 1100,
                y2: 900
            });

            // Update popover size to reflect what would happen with zoom
            mockPopover.offsetWidth = 800; // Limited by max constraint
            mockPopover.offsetHeight = 900;

            if (eventHandlers['node-position']) {
                eventHandlers['node-position']();
            }

            // Verify size constraints are applied
            expect(mockPopover.style.width).to.equal('800px');
            expect(mockPopover.style.height).to.equal('900px');
        });
    });

    describe('Test Case 3: Drag hover editor + Zoom', () => {
        it('should maintain user drag offset in graph units during zoom', async () => {
            // Initial state: zoom 1.0
            await positioning.pinHoverEditorToNode('terminal-1', mockNode);
            await new Promise(resolve => setTimeout(resolve, 600));

            // Initial position: center (500, 400) + offset (300, -50) = (800, 350)
            expect(mockPopover.style.left).to.equal('800px');
            expect(mockPopover.style.top).to.equal('350px');

            // User drags hover editor 100px right, 50px down
            mockPopover.style.left = '900px';
            mockPopover.style.top = '400px';

            // Trigger drag detection
            if (eventHandlers['node-position']) {
                eventHandlers['node-position']();
            }

            // Zoom to 0.5x
            mockCy.zoom(0.5);
            mockNode.renderedBoundingBox = () => ({
                x1: 225,
                y1: 175,
                x2: 275,
                y2: 225
            });

            if (eventHandlers['cy-zoom']) {
                eventHandlers['cy-zoom']();
            }

            // At zoom 0.5x:
            // - Base offset: 300 * 0.5 = 150 screen pixels
            // - User offset: 100 * 0.5 = 50 screen pixels
            // - Total: center (250, 200) + (150, -25) + (50, 25) = (450, 200)
            expect(mockPopover.style.left).to.equal('450px');
            expect(mockPopover.style.top).to.equal('200px');
        });
    });
});