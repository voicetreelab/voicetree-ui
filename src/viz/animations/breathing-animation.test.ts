import { BreathingAnimationManager } from './breathing-animation';
import type { NodeSingular, NodeCollection } from 'cytoscape';

// Mock Cytoscape node
class MockNode {
  private data: Map<string, any> = new Map();
  private styles: Map<string, any> = new Map();
  private classes: Set<string> = new Set();
  private _id: string;
  private animationPromise: Promise<void> | null = null;

  constructor(id: string, initialClasses: string[] = []) {
    this._id = id;
    initialClasses.forEach(cls => this.classes.add(cls));
  }

  id(): string {
    return this._id;
  }

  data(key?: string, value?: any): any {
    if (key === undefined) {
      return Object.fromEntries(this.data);
    }
    if (value !== undefined) {
      this.data.set(key, value);
      return this;
    }
    return this.data.get(key);
  }

  removeData(keys: string): void {
    keys.split(' ').forEach(key => this.data.delete(key));
  }

  style(key?: string | object, value?: any): any {
    if (typeof key === 'object') {
      Object.entries(key).forEach(([k, v]) => this.styles.set(k, v));
      return this;
    }
    if (key === undefined) {
      return Object.fromEntries(this.styles);
    }
    if (value !== undefined) {
      this.styles.set(key, value);
      return this;
    }
    return this.styles.get(key);
  }

  hasClass(className: string): boolean {
    return this.classes.has(className);
  }

  animation(config: any): any {
    const self = this;
    return {
      play: () => ({
        promise: (type: string) => {
          if (type === 'completed') {
            // Simulate animation completion
            self.animationPromise = new Promise(resolve => {
              setTimeout(() => {
                Object.entries(config.style).forEach(([k, v]) => {
                  self.styles.set(k, v);
                });
                resolve();
              }, 50); // Fast timeout for tests
            });
            return self.animationPromise;
          }
          return Promise.resolve();
        }
      }),
      playing: () => true,
      stop: () => {
        self.animationPromise = null;
      }
    };
  }
}

// Mock NodeCollection
class MockNodeCollection {
  private nodes: MockNode[];

  constructor(nodes: MockNode[]) {
    this.nodes = nodes;
  }

  forEach(callback: (node: any) => void): void {
    this.nodes.forEach(callback);
  }
}

describe('BreathingAnimationManager', () => {
  let manager: BreathingAnimationManager;
  let mockNode: MockNode;
  let mockCollection: MockNodeCollection;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new BreathingAnimationManager({
      duration: 100,
      timeout: 1000
    });
    mockNode = new MockNode('test-node', ['pinned']);
    mockCollection = new MockNodeCollection([mockNode]);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    manager.destroy();
  });

  test('should add breathing animation to nodes', () => {
    manager.addBreathingAnimation(mockCollection as any);
    
    expect(mockNode.data('breathingActive')).toBe(true);
    expect(mockNode.data('originalBorderWidth')).toBeDefined();
    expect(mockNode.data('originalBorderColor')).toBeDefined();
  });

  test('should stop animation after timeout', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    manager.addBreathingAnimation(mockCollection as any);
    
    // Fast-forward past timeout
    jest.advanceTimersByTime(1000);
    
    expect(mockNode.data('breathingActive')).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Stopping breathing animation for node test-node after 1000ms')
    );
    
    consoleSpy.mockRestore();
  });

  test('should stop animation manually', () => {
    manager.addBreathingAnimation(mockCollection as any);
    
    expect(mockNode.data('breathingActive')).toBe(true);
    
    manager.stopAnimationForNode(mockNode as any);
    
    expect(mockNode.data('breathingActive')).toBe(false);
  });

  test('should check if animation is active', () => {
    manager.addBreathingAnimation(mockCollection as any);
    
    expect(manager.isAnimationActive(mockNode as any)).toBe(true);
    
    manager.stopAnimationForNode(mockNode as any);
    
    expect(manager.isAnimationActive(mockNode as any)).toBe(false);
  });

  test('should stop all animations', () => {
    const mockNode2 = new MockNode('test-node-2', ['pinned']);
    const collection = new MockNodeCollection([mockNode, mockNode2]);
    
    manager.addBreathingAnimation(collection as any);
    
    expect(mockNode.data('breathingActive')).toBe(true);
    expect(mockNode2.data('breathingActive')).toBe(true);
    
    manager.stopAllAnimations(collection as any);
    
    expect(mockNode.data('breathingActive')).toBe(false);
    expect(mockNode2.data('breathingActive')).toBe(false);
    expect(mockNode.data('originalBorderWidth')).toBeUndefined();
    expect(mockNode2.data('originalBorderWidth')).toBeUndefined();
  });

  test('should not animate unpinned nodes', () => {
    const unpinnedNode = new MockNode('unpinned-node', []);
    const collection = new MockNodeCollection([unpinnedNode]);
    
    manager.addBreathingAnimation(collection as any);
    
    // Animation should start but stop immediately in the loop
    expect(unpinnedNode.data('breathingActive')).toBe(true);
    
    // Let the animation loop check run
    jest.advanceTimersByTime(100);
    
    // Since node doesn't have 'pinned' class, animation should not continue
  });

  test('should clean up resources on destroy', () => {
    manager.addBreathingAnimation(mockCollection as any);
    
    manager.destroy();
    
    // Advance timers to ensure no callbacks execute
    jest.advanceTimersByTime(2000);
    
    // No errors should occur and node should remain unchanged
    expect(mockNode.data('breathingActive')).toBe(true); // Not cleared by destroy
  });
});