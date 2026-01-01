import { Game, Scale, Types, WEBGL } from 'phaser';
import { LoadingScene } from './scenes/LoadingScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { TownScene } from './scenes/TownScene';
import { RoomScene } from './scenes/RoomScene';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin';

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
};

// Reverse mapping for generating URLs
const AGENT_TO_ROUTE: Record<string, string> = {
  'scout': 'researchlab',
  'sage': 'strategyroom',
  'chronicle': 'newsroom',
  'trends': 'intelligencehub',
  'maven': 'welcomecenter',
};

// Parse current URL to determine starting scene
function parseRoute(): { scene: string; data?: any } {
  const path = window.location.pathname.toLowerCase();
  
  // Check for room routes: /town/researchlab, /town/newsroom, etc.
  const roomMatch = path.match(/^\/town\/([a-z]+)\/?$/);
  if (roomMatch) {
    const roomSlug = roomMatch[1];
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
  } else {
    game.scene.start('town-scene');
  }
}

// Expose navigation and route helpers globally
window.navigateTo = navigateTo;
(window as any).AGENT_TO_ROUTE = AGENT_TO_ROUTE;
(window as any).ROOM_ROUTES = ROOM_ROUTES;

export const gameConfig: Types.Core.GameConfig = {
  title: 'AgentVerse - Multi-Agent Collaboration',
  type: WEBGL,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Scale.ScaleModes.NONE,
    width: 800,
    height: 600,
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
        // Wait for loading scene to finish, then navigate
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
  scene: [LoadingScene, CharacterSelectScene, TownScene, RoomScene],
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
  // Game stays at fixed 800x600 - no resize needed
};

window.onresize = () => window.sizeChanged();

// Handle browser back/forward buttons
window.addEventListener('popstate', handleRouteChange);

window.game = new Game(gameConfig);
