import type { NodeCollection, NodeSingular } from 'cytoscape';
import { CLASS_PINNED } from '../../constants';

export enum AnimationType {
  PINNED = 'pinned',
  NEW_NODE = 'new_node',
  APPENDED_CONTENT = 'appended_content'
}

export interface BreathingAnimationConfig {
  duration?: number;
  timeout?: number;
  expandWidth?: number;
  expandColor?: string;
  expandOpacity?: number;
  contractColor?: string;
  contractOpacity?: number;
  type?: AnimationType;
}

export class BreathingAnimationManager {
  private breathingAnimations: Map<string, any> = new Map();
  private breathingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private defaultConfigs: Map<AnimationType, Required<BreathingAnimationConfig>>;

  constructor() {
    // Set up different configurations for each animation type
    this.defaultConfigs = new Map([
      [AnimationType.PINNED, {
        duration: 1200,
        timeout: 0,
        expandWidth: 5,
        expandColor: 'rgba(0, 255, 255, 0.9)',
        expandOpacity: 0.9,
        contractColor: 'rgba(0, 255, 255, 0.6)',
        contractOpacity: 0.8,
        type: AnimationType.PINNED
      }],
      [AnimationType.NEW_NODE, {
        duration: 1000,
        timeout: 0,
        expandWidth: 4,
        expandColor: 'rgba(0, 255, 0, 0.9)', // Green for new nodes
        expandOpacity: 0.9,
        contractColor: 'rgba(0, 255, 0, 0.5)',
        contractOpacity: 0.7,
        type: AnimationType.NEW_NODE
      }],
      [AnimationType.APPENDED_CONTENT, {
        duration: 800,
        timeout: 0, // Run forever until hover
        expandWidth: 4,
        expandColor: 'rgba(255, 165, 0, 0.9)', // Orange for appended content
        expandOpacity: 0.8,
        contractColor: 'rgba(255, 165, 0, 0.4)',
        contractOpacity: 0.6,
        type: AnimationType.APPENDED_CONTENT
      }]
    ]);
  }

  private getConfig(type: AnimationType): Required<BreathingAnimationConfig> {
    return this.defaultConfigs.get(type) || this.defaultConfigs.get(AnimationType.PINNED)!;
  }

  public addBreathingAnimation(nodes: NodeCollection, type: AnimationType = AnimationType.PINNED): void {
    const config = this.getConfig(type);
    
    nodes.forEach((node) => {
      const nodeId = node.id();
      
      // Stop any existing animation for this node
      this.stopAnimation(nodeId);

      // Log current style state for debugging
      console.log(`[Juggl] Initializing breathing animation for node ${nodeId}, type: ${type}`);
      console.log(`[Juggl] Current border-width: ${node.style('border-width')}, border-color: ${node.style('border-color')}`);

      // Use default values instead of reading from potentially uninitialized styles
      const defaultBorderWidth = '2';
      const defaultBorderColor = 'rgba(0, 255, 255, 0.8)';
      
      // Store default values in node data - these will be used as the "original" values
      node.data('originalBorderWidth', defaultBorderWidth);
      node.data('originalBorderColor', defaultBorderColor);
      node.data('breathingActive', true);
      node.data('animationType', type);
      
      // Set initial border style if node has no border
      const currentBorderWidth = node.style('border-width');
      if (!currentBorderWidth || currentBorderWidth === '0px' || currentBorderWidth === '0') {
        console.log(`[Juggl] Setting initial border for node ${nodeId} to enable animation`);
        node.style({
          'border-width': defaultBorderWidth,
          'border-color': defaultBorderColor,
          'border-style': 'solid',
          'border-opacity': 1
        });
      }
      
      // Create the breathing animation loop
      this.createBreathingLoop(node, config);
      
      // Set timeout to stop the animation (only if timeout > 0)
      if (config.timeout > 0) {
        const timeout = setTimeout(() => {
          console.log(`[Juggl] Stopping ${type} breathing animation for node ${nodeId} after ${config.timeout}ms`);
          this.stopAnimationForNode(node);
        }, config.timeout);
        
        this.breathingTimeouts.set(nodeId, timeout);
      }
    });
  }

  private createBreathingLoop(node: NodeSingular, config: Required<BreathingAnimationConfig>): void {
    if (!node.data('breathingActive')) {
      this.breathingAnimations.delete(node.id());
      return;
    }

    // Create forward animation (expand)
    const expandAnimation = node.animation({
      style: {
        'border-width': config.expandWidth,
        'border-color': config.expandColor,
        'border-opacity': config.expandOpacity
      },
      duration: config.duration,
      easing: 'ease-in-out-sine'
    });

    // Store reference
    this.breathingAnimations.set(node.id(), expandAnimation);

    // Play expand animation
    expandAnimation
      .play()
      .promise('completed')
      .then(() => {
        if (!node.data('breathingActive')) {
          this.breathingAnimations.delete(node.id());
          return;
        }

        // Create contract animation
        const contractAnimation = node.animation({
          style: {
            'border-width': node.data('originalBorderWidth') || '2',
            'border-color': config.contractColor,
            'border-opacity': config.contractOpacity
          },
          duration: config.duration,
          easing: 'ease-in-out-sine'
        });

        // Update reference
        this.breathingAnimations.set(node.id(), contractAnimation);

        return contractAnimation.play().promise('completed');
      })
      .then(() => {
        // Continue the loop
        if (node.data('breathingActive')) {
          this.createBreathingLoop(node, config);
        } else {
          this.breathingAnimations.delete(node.id());
        }
      })
      .catch(() => {
        // Clean up on error
        this.breathingAnimations.delete(node.id());
      });
  }

  public stopAnimation(nodeId: string): void {
    // Clear timeout
    const timeout = this.breathingTimeouts.get(nodeId);
    if (timeout) {
      clearTimeout(timeout);
      this.breathingTimeouts.delete(nodeId);
    }
    
    // Stop animation
    const animation = this.breathingAnimations.get(nodeId);
    if (animation && animation.playing()) {
      animation.stop();
    }
    this.breathingAnimations.delete(nodeId);
  }

  public stopAnimationForNode(node: NodeSingular): void {
    const nodeId = node.id();
    
    // Mark as inactive
    node.data('breathingActive', false);
    
    // Stop animation
    this.stopAnimation(nodeId);
    
    // Restore original style
    const originalBorderWidth = node.data('originalBorderWidth') || '2';
    const originalBorderColor = node.data('originalBorderColor') || 'rgba(0, 255, 255, 0.8)';
    const originalBorderOpacity = node.data('originalBorderOpacity') || '1';
    
    node.style({
      'border-width': originalBorderWidth,
      'border-color': originalBorderColor,
      'border-opacity': originalBorderOpacity
    });
    
    console.log(`[Juggl] Stopped breathing animation for node ${nodeId}`);
  }

  public stopAllAnimations(nodes: NodeCollection): void {
    nodes.forEach((node) => {
      this.stopAnimationForNode(node);
      
      // Clean up data
      node.removeData('breathingActive originalBorderWidth originalBorderColor originalBorderOpacity');
    });
  }

  public isAnimationActive(node: NodeSingular): boolean {
    return node.data('breathingActive') === true;
  }

  public destroy(): void {
    // Clear all timeouts
    this.breathingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.breathingTimeouts.clear();

    // Stop all animations
    this.breathingAnimations.forEach((animation) => {
      if (animation && animation.playing()) {
        animation.stop();
      }
    });
    this.breathingAnimations.clear();
  }
}