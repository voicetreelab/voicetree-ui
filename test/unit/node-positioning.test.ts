import { expect } from 'chai';
import cytoscape, { Core, NodeCollection, EdgeCollection, ElementDefinition } from 'cytoscape';

// Mock the visualization class methods for testing
class MockVisualization {
    viz: Core;
    
    constructor() {
        this.viz = cytoscape({
            headless: true,
            styleEnabled: false
        });
    }
    
    // Method to create a test graph with specified number of nodes and edges
    createTestGraph(nodeCount: number, edgeCount: number): void {
        const nodes: ElementDefinition[] = [];
        const edges: ElementDefinition[] = [];
        
        // Create nodes in a rough grid pattern
        const gridSize = Math.ceil(Math.sqrt(nodeCount));
        for (let i = 0; i < nodeCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            nodes.push({
                group: 'nodes',
                data: { id: `node${i}` },
                position: { 
                    x: col * 100 + Math.random() * 20 - 10, 
                    y: row * 100 + Math.random() * 20 - 10 
                }
            });
        }
        
        // Create edges ensuring connectivity
        const createdEdges = new Set<string>();
        for (let i = 0; i < edgeCount && i < nodeCount * (nodeCount - 1) / 2; i++) {
            let source = Math.floor(Math.random() * nodeCount);
            let target = Math.floor(Math.random() * nodeCount);
            
            // Ensure we don't create self-loops or duplicate edges
            let attempts = 0;
            while ((source === target || createdEdges.has(`${source}-${target}`) || createdEdges.has(`${target}-${source}`)) && attempts < 100) {
                source = Math.floor(Math.random() * nodeCount);
                target = Math.floor(Math.random() * nodeCount);
                attempts++;
            }
            
            if (attempts < 100) {
                edges.push({
                    group: 'edges',
                    data: { 
                        id: `edge${i}`,
                        source: `node${source}`,
                        target: `node${target}`
                    }
                });
                createdEdges.add(`${source}-${target}`);
            }
        }
        
        this.viz.add(nodes);
        this.viz.add(edges);
    }
    
    // Port of findOptimalPosition method
    findOptimalPosition(referencePos: {x: number, y: number}, minRadius: number, maxRadius: number, newNode: any): {x: number, y: number} {
        const existingNodes = this.viz.nodes().difference(newNode);
        const existingEdges = this.viz.edges();
        
        const potentialConnections = this.findPotentialConnections(newNode, existingNodes);
        
        const numCandidates = 24;
        let bestPosition = { x: referencePos.x + minRadius, y: referencePos.y };
        let bestScore = -Infinity;
        
        for (let i = 0; i < numCandidates; i++) {
            const angle = (i / numCandidates) * 2 * Math.PI;
            
            for (let radiusFactor = 0.3; radiusFactor <= 1.0; radiusFactor += 0.35) {
                const radius = minRadius + (maxRadius - minRadius) * radiusFactor;
                
                const candidatePos = {
                    x: referencePos.x + Math.cos(angle) * radius,
                    y: referencePos.y + Math.sin(angle) * radius
                };
                
                let score = 0;
                
                // Check edge intersections
                let intersectionCount = 0;
                potentialConnections.forEach(targetNode => {
                    const targetPos = targetNode.position();
                    existingEdges.forEach(edge => {
                        if (this.checkEdgeIntersection(
                            candidatePos, targetPos,
                            edge.source().position(), edge.target().position()
                        )) {
                            intersectionCount++;
                        }
                    });
                });
                
                score -= intersectionCount * 1000;
                
                // Node repulsion
                let nodeRepulsion = 0;
                let tooClose = false;
                existingNodes.forEach(node => {
                    const pos = node.position();
                    const distance = Math.sqrt(
                        Math.pow(pos.x - candidatePos.x, 2) + 
                        Math.pow(pos.y - candidatePos.y, 2)
                    );
                    
                    if (distance < 40) {
                        tooClose = true;
                    } else if (distance < 100) {
                        nodeRepulsion -= 500 / (distance + 1);
                    }
                });
                
                if (tooClose) continue;
                
                score += nodeRepulsion;
                
                // Edge length optimization
                let edgeLengthScore = 0;
                potentialConnections.forEach(targetNode => {
                    const targetPos = targetNode.position();
                    const edgeLength = Math.sqrt(
                        Math.pow(targetPos.x - candidatePos.x, 2) + 
                        Math.pow(targetPos.y - candidatePos.y, 2)
                    );
                    if (edgeLength > 50 && edgeLength < 200) {
                        edgeLengthScore += 100 - edgeLength / 2;
                    }
                });
                score += edgeLengthScore;
                
                // Distance from reference
                const distFromRef = Math.sqrt(
                    Math.pow(candidatePos.x - referencePos.x, 2) + 
                    Math.pow(candidatePos.y - referencePos.y, 2)
                );
                score -= distFromRef * 0.1;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPosition = candidatePos;
                }
            }
        }
        
        return bestPosition;
    }
    
    // Port of findPotentialConnections method
    findPotentialConnections(newNode: any, existingNodes: any): any[] {
        const potentialConnections = [];
        const newNodeId = newNode.id();
        
        const allEdges = this.viz.edges();
        const connectedNodeIds = new Set<string>();
        
        allEdges.forEach(edge => {
            const sourceId = edge.source().id();
            const targetId = edge.target().id();
            
            if (sourceId === newNodeId) {
                connectedNodeIds.add(targetId);
            } else if (targetId === newNodeId) {
                connectedNodeIds.add(sourceId);
            }
        });
        
        existingNodes.forEach(node => {
            const nodeId = node.id();
            
            node.connectedEdges().forEach(edge => {
                if (edge.source().id() === nodeId && edge.target().id() === newNodeId) {
                    connectedNodeIds.add(nodeId);
                } else if (edge.target().id() === nodeId && edge.source().id() === newNodeId) {
                    connectedNodeIds.add(nodeId);
                }
            });
        });
        
        connectedNodeIds.forEach(id => {
            const node = this.viz.$id(id);
            if (node.length > 0) {
                potentialConnections.push(node[0]);
            }
        });
        
        if (potentialConnections.length === 0) {
            const nodeDistances = existingNodes.map(node => {
                const pos = node.position();
                return {
                    node: node,
                    distance: Math.sqrt(pos.x * pos.x + pos.y * pos.y)
                };
            });
            
            nodeDistances.sort((a, b) => a.distance - b.distance);
            const nearestNodes = nodeDistances.slice(0, Math.min(3, nodeDistances.length));
            nearestNodes.forEach(item => {
                if (item.distance < 200) {
                    potentialConnections.push(item.node);
                }
            });
        }
        
        return potentialConnections;
    }
    
    // Port of checkEdgeIntersection method
    checkEdgeIntersection(
        p1: {x: number, y: number}, p2: {x: number, y: number},
        p3: {x: number, y: number}, p4: {x: number, y: number}
    ): boolean {
        const cross = (a: {x: number, y: number}, b: {x: number, y: number}) => a.x * b.y - a.y * b.x;
        const sub = (a: {x: number, y: number}, b: {x: number, y: number}) => ({x: a.x - b.x, y: a.y - b.y});
        
        const r = sub(p2, p1);
        const s = sub(p4, p3);
        const rxs = cross(r, s);
        
        if (Math.abs(rxs) < 0.0001) {
            return false;
        }
        
        const t = cross(sub(p3, p1), s) / rxs;
        const u = cross(sub(p3, p1), r) / rxs;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
}

describe('Node Positioning Algorithm', () => {
    let mockViz: MockVisualization;
    
    beforeEach(() => {
        mockViz = new MockVisualization();
    });
    
    describe('findOptimalPosition', () => {
        it('should position a new node without edge overlaps in a 30-node graph', () => {
            // Create a complex graph with 30 nodes and many edges
            mockViz.createTestGraph(30, 45);
            
            // Add a new node that will connect to multiple existing nodes
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: 'newNode' }
            });
            
            // Manually add edges that will connect the new node to existing nodes
            const connectToNodes = ['node5', 'node10', 'node15'];
            connectToNodes.forEach((targetId, index) => {
                mockViz.viz.add({
                    group: 'edges',
                    data: {
                        id: `newEdge${index}`,
                        source: 'newNode',
                        target: targetId
                    }
                });
            });
            
            // Find reference position (center of connected nodes)
            const connectedNodes = connectToNodes.map(id => mockViz.viz.$id(id));
            let centerX = 0, centerY = 0;
            connectedNodes.forEach(node => {
                const pos = node.position();
                centerX += pos.x;
                centerY += pos.y;
            });
            centerX /= connectedNodes.length;
            centerY /= connectedNodes.length;
            const referencePos = { x: centerX, y: centerY };
            
            // Find optimal position
            const optimalPos = mockViz.findOptimalPosition(referencePos, 60, 100, newNode);
            
            // Set the position
            newNode.position(optimalPos);
            
            // Verify no edge intersections
            const newNodeEdges = newNode.connectedEdges();
            const existingEdges = mockViz.viz.edges().difference(newNodeEdges);
            
            let intersectionCount = 0;
            newNodeEdges.forEach(newEdge => {
                const newEdgeSource = newEdge.source().position();
                const newEdgeTarget = newEdge.target().position();
                
                existingEdges.forEach(existingEdge => {
                    if (mockViz.checkEdgeIntersection(
                        newEdgeSource, newEdgeTarget,
                        existingEdge.source().position(), existingEdge.target().position()
                    )) {
                        intersectionCount++;
                    }
                });
            });
            
            expect(intersectionCount).to.equal(0, 'New node edges should not intersect with existing edges');
            
            // Verify node is not too close to others
            const minDistance = mockViz.viz.nodes().difference(newNode).map(node => {
                const pos = node.position();
                return Math.sqrt(
                    Math.pow(pos.x - optimalPos.x, 2) + 
                    Math.pow(pos.y - optimalPos.y, 2)
                );
            }).reduce((min, dist) => Math.min(min, dist), Infinity);
            
            expect(minDistance).to.be.greaterThan(40, 'New node should maintain minimum distance from existing nodes');
        });
        
        it('should handle edge cases gracefully', () => {
            // Test with empty graph
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: 'lonelyNode' }
            });
            
            const position = mockViz.findOptimalPosition({ x: 0, y: 0 }, 60, 100, newNode);
            expect(position).to.have.property('x').that.is.a('number');
            expect(position).to.have.property('y').that.is.a('number');
        });
        
        it('should find positions that minimize total edge length', () => {
            // Create a simple triangle graph
            mockViz.viz.add([
                { group: 'nodes', data: { id: 'a' }, position: { x: 0, y: 0 } },
                { group: 'nodes', data: { id: 'b' }, position: { x: 100, y: 0 } },
                { group: 'nodes', data: { id: 'c' }, position: { x: 50, y: 86.6 } } // Equilateral triangle
            ]);
            
            // Add a new node that connects to all three
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: 'center' }
            });
            
            ['a', 'b', 'c'].forEach(target => {
                mockViz.viz.add({
                    group: 'edges',
                    data: { source: 'center', target }
                });
            });
            
            // The optimal position should be near the centroid
            const optimalPos = mockViz.findOptimalPosition({ x: 50, y: 28.87 }, 20, 60, newNode);
            
            // Check that it's reasonably close to the centroid
            const distFromCentroid = Math.sqrt(
                Math.pow(optimalPos.x - 50, 2) + 
                Math.pow(optimalPos.y - 28.87, 2)
            );
            
            expect(distFromCentroid).to.be.lessThan(30, 'Node should be positioned near the centroid');
        });
    });
    
    describe('checkEdgeIntersection', () => {
        it('should correctly detect intersecting line segments', () => {
            // Intersecting segments
            expect(mockViz.checkEdgeIntersection(
                { x: 0, y: 0 }, { x: 10, y: 10 },
                { x: 0, y: 10 }, { x: 10, y: 0 }
            )).to.be.true;
            
            // Non-intersecting segments
            expect(mockViz.checkEdgeIntersection(
                { x: 0, y: 0 }, { x: 10, y: 0 },
                { x: 0, y: 10 }, { x: 10, y: 10 }
            )).to.be.false;
            
            // Parallel segments
            expect(mockViz.checkEdgeIntersection(
                { x: 0, y: 0 }, { x: 10, y: 0 },
                { x: 0, y: 5 }, { x: 10, y: 5 }
            )).to.be.false;
            
            // Touching at endpoint
            expect(mockViz.checkEdgeIntersection(
                { x: 0, y: 0 }, { x: 10, y: 10 },
                { x: 10, y: 10 }, { x: 20, y: 0 }
            )).to.be.true;
        });
    });
    
    describe('findPotentialConnections', () => {
        it('should identify nodes that will connect to the new node', () => {
            mockViz.createTestGraph(10, 15);
            
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: 'newNode' }
            });
            
            // Add some edges pointing to the new node
            mockViz.viz.add([
                { group: 'edges', data: { source: 'node1', target: 'newNode' } },
                { group: 'edges', data: { source: 'node3', target: 'newNode' } },
                { group: 'edges', data: { source: 'newNode', target: 'node5' } }
            ]);
            
            const connections = mockViz.findPotentialConnections(newNode, mockViz.viz.nodes().difference(newNode));
            const connectionIds = connections.map(node => node.id());
            
            expect(connectionIds).to.include.members(['node1', 'node3', 'node5']);
            expect(connections).to.have.lengthOf(3);
        });
        
        it('should fall back to proximity when no explicit connections exist', () => {
            mockViz.createTestGraph(5, 0);
            
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: 'unconnected' }
            });
            
            const connections = mockViz.findPotentialConnections(newNode, mockViz.viz.nodes().difference(newNode));
            
            expect(connections.length).to.be.greaterThan(0);
            expect(connections.length).to.be.lessThanOrEqual(3);
        });
    });
});

describe('Edge Overlap Prevention in Complex Graphs', () => {
    it('should maintain zero edge overlaps in a dense 30-node graph', () => {
        const mockViz = new MockVisualization();
        
        // Create a dense graph
        mockViz.createTestGraph(30, 60);
        
        // Add 5 new nodes one by one, each connecting to existing nodes
        for (let i = 0; i < 5; i++) {
            const newNode = mockViz.viz.add({
                group: 'nodes',
                data: { id: `added${i}` }
            });
            
            // Connect to 3 random existing nodes
            const existingNodes = mockViz.viz.nodes().difference(newNode);
            const targets = [];
            for (let j = 0; j < 3; j++) {
                const randomIndex = Math.floor(Math.random() * existingNodes.length);
                targets.push(existingNodes[randomIndex].id());
            }
            
            targets.forEach((targetId, index) => {
                mockViz.viz.add({
                    group: 'edges',
                    data: {
                        id: `addedEdge${i}_${index}`,
                        source: `added${i}`,
                        target: targetId
                    }
                });
            });
            
            // Find optimal position for this node
            const boundingBox = existingNodes.boundingBox();
            const center = {
                x: (boundingBox.x1 + boundingBox.x2) / 2,
                y: (boundingBox.y1 + boundingBox.y2) / 2
            };
            
            const optimalPos = mockViz.findOptimalPosition(center, 60, 100, newNode);
            newNode.position(optimalPos);
            
            // Verify no intersections for this node's edges
            const newEdges = newNode.connectedEdges();
            const otherEdges = mockViz.viz.edges().difference(newEdges);
            
            let intersections = 0;
            newEdges.forEach(newEdge => {
                otherEdges.forEach(otherEdge => {
                    if (mockViz.checkEdgeIntersection(
                        newEdge.source().position(), newEdge.target().position(),
                        otherEdge.source().position(), otherEdge.target().position()
                    )) {
                        intersections++;
                    }
                });
            });
            
            expect(intersections).to.equal(0, `Node added${i} should not create edge intersections`);
        }
        
        // Final verification: count all edge intersections
        const allEdges = mockViz.viz.edges();
        let totalIntersections = 0;
        
        allEdges.forEach((edge1, i) => {
            allEdges.forEach((edge2, j) => {
                if (i < j) { // Avoid counting twice and self-comparison
                    // Skip if edges share a node
                    const edge1Nodes = new Set([edge1.source().id(), edge1.target().id()]);
                    const edge2Nodes = new Set([edge2.source().id(), edge2.target().id()]);
                    const sharedNodes = [...edge1Nodes].filter(x => edge2Nodes.has(x));
                    
                    if (sharedNodes.length === 0) {
                        if (mockViz.checkEdgeIntersection(
                            edge1.source().position(), edge1.target().position(),
                            edge2.source().position(), edge2.target().position()
                        )) {
                            totalIntersections++;
                        }
                    }
                }
            });
        });
        
        console.log(`Final graph: ${mockViz.viz.nodes().length} nodes, ${mockViz.viz.edges().length} edges`);
        console.log(`Total non-adjacent edge intersections: ${totalIntersections}`);
        
        // In a well-positioned graph, we should have very few or no intersections
        expect(totalIntersections).to.equal(0, 'Optimally positioned nodes should minimize edge intersections');
    });
});