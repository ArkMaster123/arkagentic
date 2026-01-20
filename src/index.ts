import { Game, Scale, Types, WEBGL, CANVAS, AUTO } from 'phaser';
import { LoadingScene } from './scenes/LoadingScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { TownScene } from './scenes/TownScene';
import { RoomScene } from './scenes/RoomScene';
import { MeetingRoomScene } from './scenes/MeetingRoomScene';
import { ChatbotRuinsScene } from './scenes/ChatbotRuinsScene';
import { SlimShadyScene } from './scenes/SlimShadyScene';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';
import { GameBridge } from './core';

declare global {
  interface Window {
    sizeChanged: () => void;
    game: Game;
    navigateTo: (path: string) => void;
  }
}

// Room route mapping
const ROOM_ROUTES: Record<string, string> = {
  'researchlab': 'scout',
  'strategyroom': 'sage',
  'newsroom': 'chronicle',
  'intelligencehub': 'trends',
  'welcomecenter': 'maven',
  'meetings': 'meetings',  // Special route for meeting rooms
};

// Reverse mapping for generating URLs
const AGENT_TO_ROUTE: Record<string, string> = {
  'scout': 'researchlab',
  'sage': 'strategyroom',
  'chronicle': 'newsroom',
  'trends': 'intelligencehub',
  'maven': 'welcomecenter',
  'meetings': 'meetings',
};

// Route data types
interface RoomSceneData {
  agentType: string;
  fromTown: boolean;
}

interface MeetingRoomSceneData {
  fromTown: boolean;
}

type SceneData = RoomSceneData | MeetingRoomSceneData | undefined;

// Parse current URL to determine starting scene
function parseRoute(): { scene: string; data?: SceneData } {
  const path = window.location.pathname.toLowerCase();
  
  // Check for chatbotruins route
  if (path === '/chatbotruins' || path === '/chatbotruins/') {
    return {
      scene: 'chatbotruins-scene',
      data: { fromTown: false }
    };
  }
  
  // Check for slimshady secret room route
  if (path === '/slimshady' || path === '/slimshady/') {
    return {
      scene: 'slimshady-scene',
      data: { fromTown: false }
    };
  }
  
  // Check for room routes: /town/researchlab, /town/newsroom, /town/meetings, etc.
  const roomMatch = path.match(/^\/town\/([a-z]+)\/?$/);
  if (roomMatch) {
    const roomSlug = roomMatch[1];
    
    // Special handling for meeting rooms
    if (roomSlug === 'meetings') {
      return {
        scene: 'meeting-room-scene',
        data: { fromTown: false }
      };
    }
    
    const agentType = ROOM_ROUTES[roomSlug];
    if (agentType) {
      return { 
        scene: 'room-scene', 
        data: { agentType, fromTown: false } 
      };
    }
  }
  
  // Default to town scene for /town or /
  return { scene: 'town-scene' };
}

// Navigate to a new route
function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleRouteChange();
}

// Handle route changes (back/forward buttons)
function handleRouteChange() {
  const route = parseRoute();
  const game = window.game;
  
  if (!game || !game.scene) return;
  
  // Stop all scenes first
  game.scene.scenes.forEach(scene => {
    if (scene.scene.isActive()) {
      scene.scene.stop();
    }
  });
  
  // Start the appropriate scene
  if (route.scene === 'room-scene' && route.data) {
    game.scene.start('room-scene', route.data);
  } else if (route.scene === 'meeting-room-scene') {
    game.scene.start('meeting-room-scene', route.data || {});
  } else if (route.scene === 'chatbotruins-scene') {
    game.scene.start('chatbotruins-scene', route.data || {});
  } else {
    game.scene.start('town-scene');
  }
}

// Expose navigation and route helpers globally
window.navigateTo = navigateTo;

// Set up GameBridge with route mappings and install on window for backward compatibility
GameBridge.agentToRoute = AGENT_TO_ROUTE;
GameBridge.roomRoutes = ROOM_ROUTES;
GameBridge.installOnWindow();

// Detect mobile device for scaling
function isMobileDevice(): boolean {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth <= 1024;
  return hasTouch && (isMobileUA || isSmallScreen);
}

// Determine the game canvas size
const isMobile = isMobileDevice();
const isFirefox = /firefox/i.test(navigator.userAgent);
const useCanvasRenderer = isMobile || isFirefox;

// IMPORTANT: Keep internal game resolution fixed at 800x600 for consistent rendering
// Phaser's scale manager will handle fitting to the screen
// Using dynamic resolution was causing tilemap rendering issues on mobile
export const gameConfig: Types.Core.GameConfig = {
  title: 'AgentVerse - Multi-Agent Collaboration',
  // Force CANVAS on mobile/Firefox - WebGL tilemaps can fail on some devices
  // Use WEBGL on desktop for better performance
  type: useCanvasRenderer ? CANVAS : WEBGL,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    // Always use 800x600 internal resolution
    // On mobile, use FIT to scale down while maintaining aspect ratio
    // On desktop, use NONE for pixel-perfect rendering
    mode: isMobile ? Scale.ScaleModes.FIT : Scale.ScaleModes.NONE,
    width: 800,
    height: 600,
    autoCenter: isMobile ? Scale.CENTER_HORIZONTALLY : Scale.NO_CENTER,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  render: {
    antialiasGL: false,
    pixelArt: true,
  },
  callbacks: {
    postBoot: () => {
      window.sizeChanged();
      
      // After game boots, check if we need to navigate to a room
      const route = parseRoute();
      if (route.scene === 'room-scene' && route.data) {
        // Note: Using setTimeout here is intentional - we're outside scene context
        // and need to wait for Phaser scenes to initialize before navigating
        setTimeout(() => {
          const game = window.game;
          if (game && game.scene) {
            // Check if loading is done
            const checkAndNavigate = () => {
              const loadingScene = game.scene.getScene('loading-scene');
              const townScene = game.scene.getScene('town-scene');
              
              if (townScene && townScene.scene.isActive()) {
                // Town scene is ready, now switch to room
                game.scene.start('room-scene', route.data);
              } else {
                // Polling for scene readiness - setTimeout is appropriate here
                setTimeout(checkAndNavigate, 100);
              }
            };
            checkAndNavigate();
          }
        }, 100);
      }
    },
  },
  canvasStyle: 'display: block;',
  autoFocus: true,
  audio: {
    disableWebAudio: false,
  },
  scene: [LoadingScene, CharacterSelectScene, TownScene, RoomScene, MeetingRoomScene, ChatbotRuinsScene, SlimShadyScene],
  dom: {
    createContainer: true,
  },
  plugins: {
    scene: [
      {
        key: 'rexUI',
        plugin: UIPlugin,
        mapping: 'rexUI',
      },
      {
        key: 'rexBoard',
        plugin: BoardPlugin,
        mapping: 'rexBoard',
      },
    ],
  },
};

window.sizeChanged = () => {
  // On mobile, Phaser's FIT mode handles resizing automatically
  // On desktop, game stays at fixed 800x600 - no resize needed
  if (isMobileDevice() && window.game) {
    // Just refresh the scale manager - it handles fitting automatically
    window.game.scale.refresh();
  }
};

window.onresize = () => window.sizeChanged();

// Handle browser back/forward buttons
window.addEventListener('popstate', handleRouteChange);

window.game = new Game(gameConfig);
