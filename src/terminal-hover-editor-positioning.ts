import type { NodeSingular } from 'cytoscape';

export interface HoverEditorTracking {
    popover: HTMLElement;
    node: NodeSingular;
    updatePosition: () => void;
    onGraphMovement: () => void;
    movementTimeout?: NodeJS.Timeout;
    baseWidthZoomInvariant?: number;
    baseHeightZoomInvariant?: number;
    resizeScaleFactorWidth?: number;
    resizeScaleFactorHeight?: number;
}

export class TerminalHoverEditorPositioning {
    private hoverEditorTracking: Map<string, HoverEditorTracking> = new Map();

    /**
     * Pin a hover editor to a terminal node
     * @param terminalId - The ID of the terminal
     * @param node - The Cytoscape node to pin to
     * @param popoverSelector - CSS selector to find the hover editor popover
     * @param timeout - Time to wait for popover creation (ms)
     */
    async pinHoverEditorToNode(
        terminalId: string, 
        node: NodeSingular,
        popoverSelector: string | string[] = ['.hover-editor', '.popover.hover-popover', '.hover-editor-popover'],
        timeout: number = 500
    ): Promise<void> {
        console.log(`[Juggl Debug] Attempting to pin hover editor to node for terminal: ${terminalId}`);
        
        // Wait for the hover editor to be created
        await new Promise(resolve => setTimeout(resolve, timeout));
        
        // Find the hover editor popover in the DOM
        const selectors = Array.isArray(popoverSelector) ? popoverSelector : [popoverSelector];
        let popovers: NodeListOf<Element> | null = null;
        
        for (const selector of selectors) {
            popovers = document.querySelectorAll(selector);
            if (popovers.length > 0) break;
        }
        
        if (!popovers || popovers.length === 0) {
            console.error('[Juggl Debug] No hover editor popover found in DOM');
            console.log('[Juggl Debug] Available popovers:', document.querySelectorAll('.popover'));
            return;
        }
        
        // Get the most recent popover (likely the one we just created)
        const popover = popovers[popovers.length - 1] as HTMLElement;
        console.log(`[Juggl Debug] Found hover editor popover:`, popover);
        
        // State management
        let userOffsetXZoomInvariant = 0;  // User offset in GRAPH units
        let userOffsetYZoomInvariant = 0;  // User offset in GRAPH units
        let isGraphMoving = false;
        let movementTimeout: NodeJS.Timeout;
        let lastZoom = node.cy().zoom();
        let frameCount = 0;  // Track frames to skip initial drag detection
        // Get zoom-independent base dimensions by dividing out the initial zoom
        const initialZoom = node.cy().zoom();

        //IMPORTANT the base dimensions, is the size the hover editor opens at initially. but this is already AT
        //     A PARTICULAR ZOOM. e.g. we may be opening hover editor at zoom 5
        // Note: The height may have already been multiplied by 1.5x in terminal-store.ts

        let baseWidthZoomInvariant = (popover.offsetWidth / initialZoom) ;
        let baseHeightZoomInvariant = (popover.offsetHeight / initialZoom) ;
        let resizeScaleFactorWidth = 1;
        let resizeScaleFactorHeight = 1;

        // Helper function to convert graph coordinates to screen coordinates
        const convertGraphToScreen = (graphX: number, graphY: number) => {
            const pan = node.cy().pan();
            const zoom = node.cy().zoom();
            return {
                x: (graphX * zoom) + pan.x,
                y: (graphY * zoom) + pan.y
            };
        };

        /**
         * COORDINATE SYSTEMS DOCUMENTATION
         * 
         * Cytoscape uses two coordinate systems:
         * 
         * 1. GRAPH COORDINATES (Model Space)
         *    - Obtained via: node.position()
         *    - Fixed coordinates that don't change with zoom/pan
         *    - Example: A node at graph position (200, 400) stays at (200, 400) regardless of zoom
         *    - Used for: Graph data model, node relationships, layout algorithms
         * 
         * 2. RENDERED/SCREEN COORDINATES (View Space)
         *    - Obtained via: node.renderedPosition() or node.renderedBoundingBox()
         *    - Screen pixel coordinates that change with zoom/pan
         *    - Example: A node at graph (200, 400) might render at screen (500, 600) depending on zoom/pan
         *    - Used for: Mouse events, DOM positioning, visual rendering
         * 
         * HOVER EDITOR POSITIONING:
         * - The hover editor is a DOM element with position:fixed
         * - It uses SCREEN COORDINATES (pixels from viewport top-left)
         * - We must use rendered positions + our offsets
         * 
         * COORDINATE CONVERSION:
         * - Graph to Screen: screenPos = (graphPos * zoom) + pan
         * - Screen to Graph: graphPos = (screenPos - pan) / zoom
         * 
         * OFFSET SCALING:
         * - Fixed pixel offsets (like +300px) need to scale with zoom to maintain
         *   constant graph-space distance from the node
         * - At zoom 0.5x: 300px becomes 150px on screen (same graph distance)
         * - At zoom 2.0x: 300px becomes 600px on screen (same graph distance)
         */


         // IMPORTANT, WE DIFFERENTIATE USER EVENts of dragging the hover editor, by whether the new position or size
         // is not what we would expect based off of the current pan + zoom
         // if it's different, we change our base offsets and base size


         // IMPORTANT, zoom events are AROUND A FOCAL POINT, however this should be accounted for
         // by a pan + zoom (?)

        // Calculate default position
        const getDefaultPosition = () => {
            // Use Cytoscape's rendered position directly - it handles all transformations correctly
            const boundingBox = node.renderedBoundingBox();
            const renderedLeftX = boundingBox.x1;
            const renderedTopY = boundingBox.y1;
            
            const currentZoom = node.cy().zoom();
            
            // Base offsets in graph space (at zoom 1.0)
            const baseOffsetX = 0;
            const baseOffsetY = 0;
            
            // Scale offsets with zoom to maintain constant graph distance
            const offsetX = baseOffsetX * currentZoom;
            const offsetY = baseOffsetY * currentZoom;
            
            // Scale user offsets (stored in graph units) to screen pixels
            const userOffsetScreenX = userOffsetXZoomInvariant * currentZoom;
            const userOffsetScreenY = userOffsetYZoomInvariant * currentZoom;
            
//             console.log(`[Juggl Debug] getDefaultPosition - zoom: ${currentZoom.toFixed(2)}, renderedCenter: (${renderedLeftX.toFixed(0)}, ${renderedTopY.toFixed(0)}), scaledOffset: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)}), userOffsetScreen: (${userOffsetScreenX.toFixed(0)}, ${userOffsetScreenY.toFixed(0)})`);
            
            // Apply both base offsets and user offsets
            return {
                x: renderedLeftX + offsetX + userOffsetScreenX,
                y: renderedTopY + offsetY + userOffsetScreenY
            };
        };

        // Position and size update function
        const updatePosition = () => {
            const defaultPos = getDefaultPosition();
            // User offsets are now already applied in getDefaultPosition
            const finalX = defaultPos.x;
            const finalY = defaultPos.y;
            
//             console.log(`[Juggl Debug] Setting popover position: left=${finalX.toFixed(1)}px, top=${finalY.toFixed(1)}px`);
            
            popover.style.position = 'fixed';
            popover.style.left = `${finalX}px`;
            popover.style.top = `${finalY}px`;
            popover.style.zIndex = '1000';
            
            // Update data attributes for hover editor compatibility
            popover.setAttribute('data-x', finalX.toString());
            popover.setAttribute('data-y', finalY.toString());
            
            // Apply zoom-based resizing with user's resize preference
            // Apply size with constraints - smaller minimum when zoomed out

            const currentZoom = node.cy().zoom();
            const scaledWidth = Math.max(50, Math.min(800, baseWidthZoomInvariant * currentZoom));
            const scaledHeight = Math.max(38, Math.min(1200, baseHeightZoomInvariant * currentZoom));

           // ^ that can introduce bug if we don't account for this later in user resizing logic

            popover.style.width = `${scaledWidth}px`;
            popover.style.height = `${scaledHeight}px`;
        };

        // Debounced graph movement handler
        const onGraphMovement = () => {
            frameCount++;
            
            // Skip drag detection for first few frames to allow initial positioning
            if (frameCount < 5) {
                console.log(`[Juggl Debug] Skipping drag detection during initialization (frame ${frameCount})`);
                updatePosition();
                return;
            }
            
            const currentZoom = node.cy().zoom();
            const zoomChanged = Math.abs(currentZoom - lastZoom) > 0.001;
            lastZoom = currentZoom;
            if (!isGraphMoving) {
//                 console.log('[Juggl Debug] Graph movement started');
                
                // During zoom, skip drag/resize detection but still update position
//                 if (zoomChanged) {
// //                     console.log('[Juggl Debug] Zoom detected, updating position without drag/resize detection');
//                     lastZoom = currentZoom;
//                 } else {
                    // Check for user drag BEFORE we start moving

                    // POSITION OF HOVER EDITOR
                    const currentX = parseFloat(popover.style.left) || 0;
                    const currentY = parseFloat(popover.style.top) || 0;
                    
                    // Calculate expected position WITHOUT user offsets for comparison
                    // this is the position of the TERMINAL NODE, NOT THE HOVER EDITOR
                    const boundingBox = node.renderedBoundingBox();
                    const renderedLeftX = boundingBox.x1;
                    const renderedTopY = boundingBox.y1;

                    // Now add scaled user offsets to get expected position
                    const expectedX = renderedLeftX + (userOffsetXZoomInvariant * currentZoom);
                    const expectedY = renderedTopY + (userOffsetYZoomInvariant * currentZoom);
                    
                    const threshold = 2;
                    const diffX = Math.abs(currentX - expectedX);
                    const diffY = Math.abs(currentY - expectedY);
                    
                    if ((diffX > threshold || diffY > threshold) && !zoomChanged) {
                        console.log('[Juggl Debug] User drag detected at start of graph movement');
                        console.log(`[Juggl Debug] Position diff: X=${diffX.toFixed(1)}, Y=${diffY.toFixed(1)}`);
                        // Convert screen pixel offset to graph units
                        // Offset = (current position - base position) / zoom
                        userOffsetXZoomInvariant = (currentX - renderedLeftX) / currentZoom;
                        userOffsetYZoomInvariant = (currentY - renderedTopY) / currentZoom;
                        console.log(`[Juggl Debug] New offset in graph units: ${userOffsetXZoomInvariant.toFixed(0)}, ${userOffsetYZoomInvariant.toFixed(0)}`);
//                         console.log(`[Juggl Debug] (was ${(currentX - expectedBaseX).toFixed(0)}, ${(currentY - expectedBaseY).toFixed(0)} screen pixels at zoom ${currentZoom.toFixed(2)})`)
                    }
                    
                    // Check for manual resize BEFORE we update
                    const currentWidth = popover.offsetWidth;
                    const currentHeight = popover.offsetHeight;

                    // Calculate expected size using the same logic as updatePosition
                    const expectedWidth = Math.max(50, Math.min(800, baseWidthZoomInvariant * currentZoom));
                    const expectedHeight = Math.max(38, Math.min(1200, baseHeightZoomInvariant * currentZoom));
                    
                    const widthDiff = Math.abs(currentWidth - expectedWidth);
                    const heightDiff = Math.abs(currentHeight - expectedHeight);
                    const sizeThreshold = 5;
                    
                    if ((widthDiff > sizeThreshold || heightDiff > sizeThreshold) && !zoomChanged) {
                        console.log('[Juggl Debug] Manual resize detected at start of graph movement');
                        console.log(`[Juggl Debug] Size diff: W=${widthDiff.toFixed(1)}, H=${heightDiff.toFixed(1)}`);
                        
                        // Calculate new resize scale factors
                        baseWidthZoomInvariant = currentWidth / ( currentZoom);
                        baseHeightZoomInvariant = currentHeight / ( currentZoom);
                    }
//                 }
            }
            isGraphMoving = true;
            
            // Clear any previous timeout
            clearTimeout(movementTimeout);
            
            // After 100ms of no movement, declare the graph stationary
            movementTimeout = setTimeout(() => {
//                 console.log('[Juggl Debug] Graph movement stopped');
                isGraphMoving = false;
            }, 110);
            
            // Update position immediately for smooth following
            updatePosition();
        };

        // Initial positioning
        updatePosition();
        
        // Listen for graph movements using the debounced handler
        node.on('position', onGraphMovement);
        node.cy().on('pan', onGraphMovement);
        // don't listen to zoom, since zoom has a focal point so results in a pan + zoom


        // Store tracking info
        const tracking: HoverEditorTracking = {
            popover,
            node,
            updatePosition,
            onGraphMovement,
            movementTimeout,
            baseWidthZoomInvariant,
            baseHeightZoomInvariant,
            resizeScaleFactorWidth,
            resizeScaleFactorHeight
        };
        this.hoverEditorTracking.set(terminalId, tracking);
        
        // Clean up when popover is removed
        const observer = new MutationObserver((mutations) => {
            if (!document.body.contains(popover)) {
                console.log(`[Juggl Debug] Hover editor removed for terminal: ${terminalId}`);
                this.cleanupHoverEditorTracking(terminalId);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Clean up hover editor tracking for a specific terminal
     * @param terminalId - The ID of the terminal to clean up
     */
    cleanupHoverEditorTracking(terminalId: string): void {
        const tracking = this.hoverEditorTracking.get(terminalId);
        if (tracking) {
            // Clear any pending timeout
            if (tracking.movementTimeout) {
                clearTimeout(tracking.movementTimeout);
            }
            
            // Remove Cytoscape event listeners
            tracking.node.off('position', tracking.onGraphMovement);
            tracking.node.cy().off('pan', tracking.onGraphMovement);
            
            // Remove from tracking map
            this.hoverEditorTracking.delete(terminalId);
        }
    }

    /**
     * Clean up all hover editor tracking
     */
    cleanupAll(): void {
        for (const terminalId of this.hoverEditorTracking.keys()) {
            this.cleanupHoverEditorTracking(terminalId);
        }
    }

    /**
     * Get current tracking info for a terminal
     * @param terminalId - The ID of the terminal
     * @returns The tracking info or undefined if not found
     */
    getTracking(terminalId: string): HoverEditorTracking | undefined {
        return this.hoverEditorTracking.get(terminalId);
    }

    /**
     * Check if a terminal has active hover editor tracking
     * @param terminalId - The ID of the terminal
     * @returns True if tracking exists
     */
    hasTracking(terminalId: string): boolean {
        return this.hoverEditorTracking.has(terminalId);
    }
}