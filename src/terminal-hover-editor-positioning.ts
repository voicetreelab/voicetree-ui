import type { NodeSingular } from 'cytoscape';

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

    pinHoverEditorToNode(terminalId: string, node: NodeSingular, popoverEl: HTMLElement): void {
        if (this.trackingMap.has(terminalId)) {
            this.cleanup(terminalId);
        }

        const cy = node.cy();
        let dragPollInterval: number;
        let updatePending = false;

        // 1. INITIAL STATE SETUP
        // =================================================================
        const initialZoom = cy.zoom();
        const cyContainerRect = cy.container().getBoundingClientRect();
        const nodeBoundingBox = node.renderedBoundingBox();
        const popoverRect = popoverEl.getBoundingClientRect();

        // Convert node's container-relative position to viewport-relative position.
        const nodeViewportX = cyContainerRect.left + nodeBoundingBox.x1;
        const nodeViewportY = cyContainerRect.top + nodeBoundingBox.y1;

        // Calculate the initial offset in the viewport's coordinate system.
        const initialScreenOffsetX = popoverRect.left - nodeViewportX;
        const initialScreenOffsetY = popoverRect.top - nodeViewportY;

        const state: HoverEditorState = {
            offsetX: screenToGraph(initialScreenOffsetX, initialZoom),
            offsetY: screenToGraph(initialScreenOffsetY, initialZoom),
            width: screenToGraph(popoverEl.offsetWidth, initialZoom),
            height: screenToGraph(popoverEl.offsetHeight, initialZoom),
        };

        // 2. CORE UPDATE AND EVENT LISTENER FUNCTIONS
        // =================================================================

        const updatePosition = () => {
            const zoom = cy.zoom();
            const cyContainerRect = cy.container().getBoundingClientRect();
            const nodeBoundingBox = node.renderedBoundingBox();

            // Convert node's position to viewport coordinates.
            const nodeViewportX = cyContainerRect.left + nodeBoundingBox.x1;
            const nodeViewportY = cyContainerRect.top + nodeBoundingBox.y1;

            const screenOffsetX = graphToScreen(state.offsetX, zoom);
            const screenOffsetY = graphToScreen(state.offsetY, zoom);

            // Final position is relative to the viewport.
            const screenX = nodeViewportX + screenOffsetX;
            const screenY = nodeViewportY + screenOffsetY;

            const screenWidth = graphToScreen(state.width, zoom);
            const screenHeight = graphToScreen(state.height, zoom);

            popoverEl.style.position = 'fixed';
            popoverEl.style.left = `${screenX}px`;
            popoverEl.style.top = `${screenY}px`;
            popoverEl.style.width = `${screenWidth}px`;
            popoverEl.style.height = `${screenHeight}px`;
            popoverEl.style.zIndex = '1000';
        };

        const onGraphChange = () => {
            if (!updatePending) {
                updatePending = true;
                requestAnimationFrame(() => {
                    updatePosition();
                    updatePending = false;
                });
            }
        };

        const pollForDrag = () => {
            const zoom = cy.zoom();
            const cyContainerRect = cy.container().getBoundingClientRect();
            const nodeBoundingBox = node.renderedBoundingBox();

            // Calculate expected position in viewport coordinates.
            const nodeViewportX = cyContainerRect.left + nodeBoundingBox.x1;
            const nodeViewportY = cyContainerRect.top + nodeBoundingBox.y1;
            const expectedX = nodeViewportX + graphToScreen(state.offsetX, zoom);
            const expectedY = nodeViewportY + graphToScreen(state.offsetY, zoom);

            const actualX = parseFloat(popoverEl.style.left) || 0;
            const actualY = parseFloat(popoverEl.style.top) || 0;

            const threshold = 2;
            const dx = actualX - expectedX;
            const dy = actualY - expectedY;

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                state.offsetX += screenToGraph(dx, zoom);
                state.offsetY += screenToGraph(dy, zoom);
            }
        };

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const zoom = cy.zoom();
                state.width = screenToGraph(entry.contentRect.width, zoom);
                state.height = screenToGraph(entry.contentRect.height, zoom);
            }
        });

        const mutationObserver = new MutationObserver(() => {
            if (!document.body.contains(popoverEl)) {
                cleanup();
            }
        });

        const cleanup = () => {
            cy.off('viewport', onGraphChange);
            node.off('position', onGraphChange);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            clearInterval(dragPollInterval);
            this.trackingMap.delete(terminalId);
        };

        this.trackingMap.set(terminalId, cleanup);
        resizeObserver.observe(popoverEl);
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        
        updatePosition();
        cy.on('viewport', onGraphChange);
        node.on('position', onGraphChange);
        dragPollInterval = window.setInterval(pollForDrag, 200);
    }

    cleanup(terminalId: string): void {
        const cleanupFn = this.trackingMap.get(terminalId);
        if (cleanupFn) {
            cleanupFn();
        }
    }

    cleanupAll(): void {
        this.trackingMap.forEach(cleanupFn => cleanupFn());
    }
}
