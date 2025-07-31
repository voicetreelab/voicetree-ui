import type { NodeSingular } from 'cytoscape';

export interface HoverEditorTracking {
    popover: HTMLElement;
    node: NodeSingular;
    updatePosition: () => void;
    handleMouseDown: (e: MouseEvent) => void;
    handleMouseUp: (e: MouseEvent) => void;
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
        
        // State management - offset only changes on user drag
        let userOffsetX = 0;
        let userOffsetY = 0;
        let isUserDragging = false;

        // Simple position update - just applies current state
        const updatePosition = () => {
            // Skip updates while user is dragging
            if (isUserDragging) return;
            
            const boundingBox = node.renderedBoundingBox();
            const popoverWidth = popover.offsetWidth;
            const popoverHeight = popover.offsetHeight;
            
            // Calculate center of the node
            const centerX = (boundingBox.x1 + boundingBox.x2) / 2;
            const centerY = (boundingBox.y1 + boundingBox.y2) / 2;
            
            // Calculate default position (centered on node)
            const defaultX = centerX - popoverWidth / 2;
            const defaultY = centerY - popoverHeight / 2;

            // Apply position with user offset
            const finalX = defaultX + userOffsetX;
            const finalY = defaultY + userOffsetY;
            
            popover.style.position = 'fixed';
            popover.style.left = `${finalX}px`;
            popover.style.top = `${finalY}px`;
            popover.style.zIndex = '1000';
            
            // Update data attributes for hover editor compatibility
            popover.setAttribute('data-x', finalX.toString());
            popover.setAttribute('data-y', finalY.toString());
        };

        // Detect when user starts dragging the popover specifically
        const handleMouseDown = (e: MouseEvent) => {
            // Only set dragging if the mousedown was on the popover itself
            if (e.target === popover || popover.contains(e.target as Node)) {
                isUserDragging = true;
                console.log('[Juggl Debug] User started dragging hover editor');
            }
        };
        
        // Detect when user finishes dragging and update offset
        const handleMouseUp = (e: MouseEvent) => {
            if (!isUserDragging) return;
            
            isUserDragging = false;
            
            // Get current positions
            const currentX = parseFloat(popover.style.left) || 0;
            const currentY = parseFloat(popover.style.top) || 0;
            const boundingBox = node.renderedBoundingBox();
            const popoverWidth = popover.offsetWidth;
            const popoverHeight = popover.offsetHeight;
            const centerX = (boundingBox.x1 + boundingBox.x2) / 2;
            const centerY = (boundingBox.y1 + boundingBox.y2) / 2;
            const defaultX = centerX - popoverWidth / 2;
            const defaultY = centerY - popoverHeight / 2;
            
            // Calculate and save the new offset
            userOffsetX = currentX - defaultX;
            userOffsetY = currentY - defaultY;
            console.log(`[Juggl Debug] User drag ended. New offset: ${userOffsetX.toFixed(0)}, ${userOffsetY.toFixed(0)}`);
        };
        
        // Add drag detection listeners
        // Listen on document during CAPTURE phase to intercept before stopPropagation
        document.addEventListener('mousedown', handleMouseDown, true);  // true = capture phase
        document.addEventListener('mouseup', handleMouseUp);

        // Initial positioning
        updatePosition();
        
        // Update position when node moves or graph transforms
        node.on('position', updatePosition);
        node.cy().on('pan zoom resize', updatePosition);
        
        // Store tracking info with handlers for cleanup
        this.hoverEditorTracking.set(terminalId, {
            popover,
            node,
            updatePosition,
            handleMouseDown,
            handleMouseUp
        });
        
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
            // Remove Cytoscape event listeners
            tracking.node.off('position', tracking.updatePosition);
            tracking.node.cy().off('pan zoom resize', tracking.updatePosition);
            
            // Remove drag event listeners (must match capture phase)
            document.removeEventListener('mousedown', tracking.handleMouseDown, true);  // true = capture phase
            document.removeEventListener('mouseup', tracking.handleMouseUp);
            
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