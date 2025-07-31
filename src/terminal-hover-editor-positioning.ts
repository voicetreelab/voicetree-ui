import type { NodeSingular } from 'cytoscape';

export interface HoverEditorTracking {
    popover: HTMLElement;
    node: NodeSingular;
    updatePosition: () => void;
    onGraphMovement: () => void;
    movementTimeout?: NodeJS.Timeout;
    baseWidth?: number;
    baseHeight?: number;
    lastZoom?: number;
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
        let userOffsetX = 0;
        let userOffsetY = 0;
        let isGraphMoving = false;
        let movementTimeout: NodeJS.Timeout;
        let baseWidth = popover.offsetWidth;
        let baseHeight = popover.offsetHeight;
        let lastZoom = node.cy().zoom();

        // Calculate default position
        const getDefaultPosition = () => {
            const boundingBox = node.renderedBoundingBox();
            const popoverWidth = popover.offsetWidth;
            const popoverHeight = popover.offsetHeight;
            
            // Calculate center of the node
            const centerX = (boundingBox.x1 + boundingBox.x2) / 2;
            const centerY = (boundingBox.y1 + boundingBox.y2) / 2;
            
            // Calculate default position (centered on node)
            return {
                x: centerX - popoverWidth / 2,
                y: centerY - popoverHeight / 2
            };
        };

        // Position and size update function
        const updatePosition = () => {
            const defaultPos = getDefaultPosition();
            const finalX = defaultPos.x + userOffsetX;
            const finalY = defaultPos.y + userOffsetY;
            
            popover.style.position = 'fixed';
            popover.style.left = `${finalX}px`;
            popover.style.top = `${finalY}px`;
            popover.style.zIndex = '1000';
            
            // Update data attributes for hover editor compatibility
            popover.setAttribute('data-x', finalX.toString());
            popover.setAttribute('data-y', finalY.toString());
            
            // Apply zoom-based resizing
            const currentZoom = node.cy().zoom();
            const scaleFactor = Math.pow(currentZoom, 0.3);
            const scaledWidth = baseWidth * scaleFactor;
            const scaledHeight = baseHeight * scaleFactor;
            
            // Apply size with constraints
            const finalWidth = Math.max(200, Math.min(800, scaledWidth));
            const finalHeight = Math.max(150, Math.min(600, scaledHeight));
            
            popover.style.width = `${finalWidth}px`;
            popover.style.height = `${finalHeight}px`;
        };

        // Debounced graph movement handler
        const onGraphMovement = () => {
            if (!isGraphMoving) {
                console.log('[Juggl Debug] Graph movement started');
                // Check for user drag BEFORE we start moving
                const currentX = parseFloat(popover.style.left) || 0;
                const currentY = parseFloat(popover.style.top) || 0;
                const defaultPos = getDefaultPosition();
                const expectedX = defaultPos.x + userOffsetX;
                const expectedY = defaultPos.y + userOffsetY;
                
                const threshold = 2;
                const diffX = Math.abs(currentX - expectedX);
                const diffY = Math.abs(currentY - expectedY);
                
                if (diffX > threshold || diffY > threshold) {
                    console.log('[Juggl Debug] User drag detected at start of graph movement');
                    console.log(`[Juggl Debug] Position diff: X=${diffX.toFixed(1)}, Y=${diffY.toFixed(1)}`);
                    userOffsetX = currentX - defaultPos.x;
                    userOffsetY = currentY - defaultPos.y;
                    console.log(`[Juggl Debug] New offset: ${userOffsetX.toFixed(0)}, ${userOffsetY.toFixed(0)}`);
                }
            }
            isGraphMoving = true;
            
            // Clear any previous timeout
            clearTimeout(movementTimeout);
            
            // After 100ms of no movement, declare the graph stationary
            movementTimeout = setTimeout(() => {
                console.log('[Juggl Debug] Graph movement stopped');
                isGraphMoving = false;
                
                // Check for manual resize
                const currentWidth = popover.offsetWidth;
                const currentHeight = popover.offsetHeight;
                const currentZoom = node.cy().zoom();
                
                // Calculate expected size based on zoom
                const scaleFactor = Math.pow(currentZoom, 0.3);
                const expectedWidth = Math.max(200, Math.min(800, baseWidth * scaleFactor));
                const expectedHeight = Math.max(150, Math.min(600, baseHeight * scaleFactor));
                
                // If size differs from expected, user has manually resized
                const widthDiff = Math.abs(currentWidth - expectedWidth);
                const heightDiff = Math.abs(currentHeight - expectedHeight);
                const threshold = 5;
                
                if (widthDiff > threshold || heightDiff > threshold) {
                    console.log('[Juggl Debug] Manual resize detected');
                    console.log(`[Juggl Debug] Size diff: W=${widthDiff.toFixed(1)}, H=${heightDiff.toFixed(1)}`);
                    
                    // Update base dimensions to current size adjusted for zoom
                    baseWidth = currentWidth / scaleFactor;
                    baseHeight = currentHeight / scaleFactor;
                    console.log(`[Juggl Debug] New base size: ${baseWidth.toFixed(0)}x${baseHeight.toFixed(0)}`);
                }
                
                lastZoom = currentZoom;
            }, 100);
            
            // Update position immediately for smooth following
            updatePosition();
        };

        // Initial positioning
        updatePosition();
        
        // Listen for graph movements using the debounced handler
        node.on('position', onGraphMovement);
        node.cy().on('pan zoom resize', onGraphMovement);
        
        // Store tracking info
        const tracking: HoverEditorTracking = {
            popover,
            node,
            updatePosition,
            onGraphMovement,
            movementTimeout,
            baseWidth,
            baseHeight,
            lastZoom
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
            tracking.node.cy().off('pan zoom resize', tracking.onGraphMovement);
            
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