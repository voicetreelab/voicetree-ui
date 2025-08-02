import type { NodeSingular, Core } from 'cytoscape';

/**
 * Converts a scalar value (like width or an offset delta) from screen units (pixels) to graph units.
 * @param screenValue - The value in screen pixels.
 * @param zoom - The current cytoscape zoom level.
 * @returns The value in graph units.
 */
function screenToGraph(screenValue: number, zoom: number): number {
    return screenValue / zoom;
}

/**
 * Converts a scalar value (like width or an offset delta) from graph units to screen units (pixels).
 * @param graphValue - The value in graph units.
 * @param zoom - The current cytoscape zoom level.
 * @returns The value in screen pixels.
 */
function graphToScreen(graphValue: number, zoom: number): number {
    return graphValue * zoom;
}

/**
 * Represents the state of the hover editor, stored in zoom-independent "graph" units.
 * This state is the single source of truth for the editor's position and size relative to the node.
 */
interface HoverEditorState {
    // The user-defined offset from the node's top-left corner, in graph coordinates.
    offsetX: number;
    offsetY: number;
    // The user-defined size of the editor, in graph coordinates.
    width: number;
    height: number;
}

export class TerminalHoverEditorPositioning {
    private trackingMap: Map<string, () => void> = new Map();

    /**
     * Pins a hover editor to a Cytoscape node, ensuring it stays synchronized
     * during graph pan, zoom, and node movement.
     *
     * @param terminalId - A unique identifier for the terminal being pinned.
     * @param node - The Cytoscape node to attach the editor to.
     * @param popoverEl - The HTMLElement of the hover editor.
     */
    pinHoverEditorToNode(terminalId: string, node: NodeSingular, popoverEl: HTMLElement): void {
        if (this.trackingMap.has(terminalId)) {
            this.cleanup(terminalId);
        }

        const cy = node.cy();
        let dragPollInterval: number;

        // 1. INITIAL STATE SETUP
        // =================================================================
        const initialZoom = cy.zoom();
        const pan = cy.pan();
        const nodePos = node.position(); // Graph units

        // The node's center position in screen coordinates
        const nodeScreenX = graphToScreen(nodePos.x, initialZoom) + pan.x;
        const nodeScreenY = graphToScreen(nodePos.y, initialZoom) + pan.y;

        const popoverRect = popoverEl.getBoundingClientRect();
        const popoverScreenX = popoverRect.left;
        const popoverScreenY = popoverRect.top;

        // Calculate the initial offset in screen pixels
        const initialScreenOffsetX = popoverScreenX - nodeScreenX;
        const initialScreenOffsetY = popoverScreenY - nodeScreenY;

        const state: HoverEditorState = {
            // Convert screen pixel offset to zoom-independent graph units.
            offsetX: screenToGraph(initialScreenOffsetX, initialZoom),
            offsetY: screenToGraph(initialScreenOffsetY, initialZoom),
            // Convert initial pixel size to zoom-independent graph units.
            width: screenToGraph(popoverEl.offsetWidth, initialZoom),
            height: screenToGraph(popoverEl.offsetHeight, initialZoom),
        };

        // 2. CORE UPDATE AND EVENT LISTENER FUNCTIONS
        // =================================================================

        /**
         * Renders the editor's state to the screen. This is the single source of truth for display.
         */
        const updatePosition = () => {
            const pan = cy.pan();
            const zoom = cy.zoom();
            const nodePos = node.position();

            const screenX = graphToScreen(nodePos.x + state.offsetX, zoom) + pan.x;
            const screenY = graphToScreen(nodePos.y + state.offsetY, zoom) + pan.y;
            const screenWidth = graphToScreen(state.width, zoom);
            const screenHeight = graphToScreen(state.height, zoom);

            popoverEl.style.position = 'fixed';
            popoverEl.style.left = `${screenX}px`;
            popoverEl.style.top = `${screenY}px`;
            popoverEl.style.width = `${screenWidth}px`;
            popoverEl.style.height = `${screenHeight}px`;
            popoverEl.style.zIndex = '1000';
        };

        /**
         * Handles graph movement. Its ONLY job is to call updatePosition.
         */
        const onGraphChange = () => {
            updatePosition();
        };

        /**
         * Polls for user-initiated drag movements by checking for a divergence
         * between the expected DOM position and the actual DOM position.
         */
        const pollForDrag = () => {
            const pan = cy.pan();
            const zoom = cy.zoom();
            const nodePos = node.position();

            const expectedX = graphToScreen(nodePos.x + state.offsetX, zoom) + pan.x;
            const expectedY = graphToScreen(nodePos.y + state.offsetY, zoom) + pan.y;

            const actualX = parseFloat(popoverEl.style.left) || 0;
            const actualY = parseFloat(popoverEl.style.top) || 0;

            const threshold = 2; // Pixel threshold to prevent jitter
            const dx = actualX - expectedX;
            const dy = actualY - expectedY;

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                // A drag occurred. Update the state by converting the pixel delta back to graph units.
                state.offsetX += screenToGraph(dx, zoom);
                state.offsetY += screenToGraph(dy, zoom);
            }
        };

        // --- User Resize Handling (Direct) ---
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const zoom = cy.zoom();
                state.width = screenToGraph(entry.contentRect.width, zoom);
                state.height = screenToGraph(entry.contentRect.height, zoom);
            }
        });
        resizeObserver.observe(popoverEl);

        // --- DOM Cleanup ---
        const mutationObserver = new MutationObserver(() => {
            if (!document.body.contains(popoverEl)) {
                cleanup();
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        // 3. CLEANUP LOGIC
        // =================================================================
        const cleanup = () => {
            cy.off('viewport', onGraphChange);
            node.off('position', onGraphChange);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            clearInterval(dragPollInterval);
            this.trackingMap.delete(terminalId);
        };

        this.trackingMap.set(terminalId, cleanup);

        // 4. INITIALIZATION
        // =================================================================
        updatePosition(); // Initial placement
        cy.on('viewport', onGraphChange); // Follow graph pan/zoom
        node.on('position', onGraphChange); // Follow node movement
        dragPollInterval = window.setInterval(pollForDrag, 200); // Start polling for user drags
    }

    /**
     * Removes all event listeners and tracking for a given terminal.
     * @param terminalId - The ID of the terminal to clean up.
     */
    cleanup(terminalId: string): void {
        const cleanupFn = this.trackingMap.get(terminalId);
        if (cleanupFn) {
            cleanupFn();
        }
    }

    /**
     * Cleans up all tracked hover editors.
     */
    cleanupAll(): void {
        this.trackingMap.forEach(cleanupFn => cleanupFn());
    }
}