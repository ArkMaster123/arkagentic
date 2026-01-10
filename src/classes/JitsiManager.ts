/**
 * JitsiManager - Handles proximity-based video/voice chat using Jitsi Meet
 * 
 * This implementation uses the zone-based pattern (like WorkAdventure):
 * - Players enter predefined zones to join video chat rooms
 * - Each zone maps to a unique Jitsi room
 * - Supports both public meet.jit.si and self-hosted Jitsi servers
 * 
 * For self-hosting, see: /docs/JITSI_MEET_INTEGRATION_RESEARCH.md
 */

import { playJoinSound, playLeaveSound, playPlayerNearbySound } from '../utils/sounds';

// Jitsi Meet External API types
interface JitsiMeetAPIOptions {
  roomName: string;
  parentNode?: HTMLElement;
  width?: string | number;
  height?: string | number;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  jwt?: string;
  userInfo?: {
    displayName?: string;
    email?: string;
  };
}

interface JitsiParticipant {
  id: string;
  displayName?: string;
}

// Event data types from Jitsi API
interface JitsiConferenceJoinedData {
  roomName: string;
  id: string;
  displayName: string;
}

interface JitsiParticipantData {
  id: string;
  displayName?: string;
}

interface JitsiMuteData {
  muted: boolean;
}

interface JitsiErrorData {
  error: unknown;
  message?: string;
}

interface JitsiMeetAPI {
  dispose(): void;
  executeCommand(command: string, ...args: unknown[]): void;
  addListener(event: string, callback: (data: unknown) => void): void;
  removeListener(event: string, callback: (data: unknown) => void): void;
  getParticipantsInfo(): JitsiParticipant[];
  isAudioMuted(): Promise<boolean>;
  isVideoMuted(): Promise<boolean>;
}

interface JitsiMeetExternalAPIConstructor {
  new (domain: string, options: JitsiMeetAPIOptions): JitsiMeetAPI;
}

// Declare the external Jitsi API type
declare global {
  interface Window {
    JitsiMeetExternalAPI: JitsiMeetExternalAPIConstructor;
  }
}

export interface JitsiZone {
  id: string;
  roomName: string;
  displayName?: string;
  trigger: 'onenter' | 'onaction';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface JitsiConfig {
  /** Jitsi server domain (if set, uses this; otherwise tries freeServers list) */
  domain?: string | null;
  /** List of free Jitsi servers to try (in order) */
  freeServers?: string[];
  /** Fallback domain if primary fails */
  fallbackDomain?: string;
  /** Container element ID for the Jitsi iframe */
  containerId: string;
  /** Player display name */
  playerName: string;
  /** Player email (optional, for gravatar) */
  playerEmail?: string;
  /** Enable video by default */
  startWithVideo?: boolean;
  /** Enable audio by default */
  startWithAudio?: boolean;
  /** JWT token for authenticated rooms (self-hosted only) */
  jwt?: string;
  /** Room name prefix */
  roomPrefix?: string;
  /** Add random suffix to room names for privacy */
  useRandomRoomSuffix?: boolean;
}

type JitsiEventCallback = (data: unknown) => void;

export class JitsiManager {
  private api: JitsiMeetAPI | null = null;
  private currentZone: JitsiZone | null = null;
  private container: HTMLElement | null = null;        // The iframe container (jitsi-frame)
  private wrapperContainer: HTMLElement | null = null; // The outer wrapper (jitsi-container)
  public config: JitsiConfig;
  private isJitsiLoaded: boolean = false;
  private listeners: Map<string, JitsiEventCallback[]> = new Map();
  private workingDomain: string | null = null;        // The domain that successfully loaded
  
  // Track if we're in the process of joining/leaving
  private isTransitioning: boolean = false;
  
  // Proximity tracking for other players
  private nearbyPlayers: Map<string, { distance: number; volume: number }> = new Map();
  private readonly PROXIMITY_RADIUS = 150; // pixels - can hear players within this range
  private readonly MIN_VOLUME = 0.1;
  private readonly MAX_VOLUME = 1.0;

  constructor(config: JitsiConfig) {
    this.config = {
      startWithVideo: false,
      startWithAudio: true,
      roomPrefix: 'arkagentic-',
      useRandomRoomSuffix: false,
      ...config
    };
    this.container = document.getElementById(config.containerId);
    // Get the wrapper container (parent of jitsi-frame)
    this.wrapperContainer = document.getElementById('jitsi-container');
    this.loadJitsiScript();
  }
  
  /**
   * Play a sound effect using Web Audio API
   */
  private playSound(sound: 'join' | 'leave' | 'playerNear'): void {
    try {
      switch (sound) {
        case 'join':
          playJoinSound();
          break;
        case 'leave':
          playLeaveSound();
          break;
        case 'playerNear':
          playPlayerNearbySound();
          break;
      }
    } catch (e) {
      // Audio not available
    }
  }

  /**
   * Load the Jitsi external API script
   * Tries multiple free servers in order until one works
   */
  private async loadJitsiScript(): Promise<void> {
    if (window.JitsiMeetExternalAPI) {
      this.isJitsiLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      // Get list of servers to try
      const serversToTry: string[] = [];
      
      // If domain is explicitly set, use that first
      if (this.config.domain) {
        serversToTry.push(this.config.domain);
      } else if ((this.config as any).freeServers && Array.isArray((this.config as any).freeServers)) {
        // Otherwise try free servers list
        serversToTry.push(...(this.config as any).freeServers);
      } else {
        // Fallback to meet.jit.si
        serversToTry.push('meet.jit.si');
      }
      
      // Add fallback domain at the end if it's not already in the list
      if (this.config.fallbackDomain && !serversToTry.includes(this.config.fallbackDomain)) {
        serversToTry.push(this.config.fallbackDomain);
      }
      
      let currentIndex = 0;
      
      const tryLoad = (domain: string) => {
        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        
        // Timeout after 5 seconds to try next server faster
        const timeout = setTimeout(() => {
          if (!this.isJitsiLoaded) {
            console.warn(`[JitsiManager] ⏱️ Timeout loading from ${domain}, trying next...`);
            script.onload = null;
            script.onerror = null;
            tryNextServer();
          }
        }, 5000);
        
        const tryNextServer = () => {
          clearTimeout(timeout);
          currentIndex++;
          
          // Try next server in list
          if (currentIndex < serversToTry.length) {
            console.log(`[JitsiManager] Trying next server: ${serversToTry[currentIndex]}`);
            tryLoad(serversToTry[currentIndex]);
          } else {
            console.error('[JitsiManager] Failed to load Jitsi external API from all servers');
            reject(new Error('Failed to load Jitsi API from any server'));
          }
        };
        
        script.onload = () => {
          clearTimeout(timeout);
          this.isJitsiLoaded = true;
          this.workingDomain = domain; // Store the working domain
          console.log(`[JitsiManager] ✅ External API loaded from ${domain}`);
          resolve();
        };
        
        script.onerror = () => {
          console.warn(`[JitsiManager] ❌ Failed to load from ${domain}`);
          tryNextServer();
        };
        
        document.head.appendChild(script);
      };
      
      // Start with first server
      if (serversToTry.length > 0) {
        console.log(`[JitsiManager] Attempting to load from ${serversToTry[0]}...`);
        tryLoad(serversToTry[0]);
      } else {
        reject(new Error('No Jitsi servers configured'));
      }
    });
  }

  /**
   * Check if a player position is inside a zone
   */
  public isInZone(playerX: number, playerY: number, zone: JitsiZone): boolean {
    return (
      playerX >= zone.x &&
      playerX <= zone.x + zone.width &&
      playerY >= zone.y &&
      playerY <= zone.y + zone.height
    );
  }

  /**
   * Called when player enters a Jitsi zone
   */
  public async enterZone(zone: JitsiZone): Promise<void> {
    // Already in this zone
    if (this.currentZone?.id === zone.id) return;
    
    // Prevent rapid transitions
    if (this.isTransitioning) return;
    
    console.log(`[JitsiManager] Entering zone: ${zone.displayName || zone.roomName}`);
    
    // Leave current zone first if any
    if (this.api) {
      await this.leaveRoom();
    }
    
    if (zone.trigger === 'onenter') {
      await this.joinRoom(zone);
    }
    // For 'onaction', the UI should display a prompt and call joinRoom manually
  }

  /**
   * Called when player leaves a Jitsi zone
   */
  public async exitZone(zoneId: string): Promise<void> {
    if (this.currentZone?.id === zoneId) {
      await this.leaveRoom();
    }
  }

  /**
   * Join a Jitsi room
   */
  public async joinRoom(zone: JitsiZone): Promise<void> {
    if (!this.isJitsiLoaded) {
      console.warn('[JitsiManager] Jitsi API not loaded yet, waiting...');
      await this.loadJitsiScript();
    }

    if (!this.container) {
      console.error('[JitsiManager] Container element not found');
      return;
    }

    if (!window.JitsiMeetExternalAPI) {
      console.error('[JitsiManager] JitsiMeetExternalAPI not available');
      return;
    }

    this.isTransitioning = true;

    try {
      // Show the wrapper container (not the iframe container)
      if (this.wrapperContainer) {
        this.wrapperContainer.style.display = 'flex';
        this.wrapperContainer.classList.add('active');
      }

      // Sanitize room name for URL safety
      const roomName = this.sanitizeRoomName(zone.roomName);

      // Use the working domain (the one that successfully loaded the API)
      // If not set, fall back to config.domain or first free server
      const domainToUse = this.workingDomain || 
                         this.config.domain || 
                         ((this.config as any).freeServers?.[0]) || 
                         'meet.jit.si';

      console.log(`[JitsiManager] Creating Jitsi API instance with domain: ${domainToUse}`);

      // Create Jitsi API instance
      this.api = new window.JitsiMeetExternalAPI(domainToUse, {
        roomName: roomName,
        parentNode: this.container,
        width: '100%',
        height: '100%',

        userInfo: {
          displayName: this.config.playerName,
          email: this.config.playerEmail || ''
        },

        // JWT for authenticated rooms (self-hosted)
        jwt: this.config.jwt,

        // Config overrides
        configOverwrite: {
          startWithAudioMuted: !this.config.startWithAudio,
          startWithVideoMuted: !this.config.startWithVideo,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: true,
          hideConferenceSubject: false,
          subject: zone.displayName || zone.roomName,
          // Disable moderator requirement - allow anyone to start meetings
          requireDisplayName: false,
          enableNoAudioDetection: false,
          // Disable some features for simpler UX
          disablePolls: true,
          disableReactions: true,
          disableSelfView: false,
          // Audio settings
          disableAudioLevels: false,
          enableNoisyMicDetection: true,
          // P2P for small rooms (faster)
          p2p: {
            enabled: true
          },
          // Allow anonymous users to start meetings without moderator
          enableLayerSuspension: false,
          // Disable authentication prompts
          disableThirdPartyRequests: false
        },

        // Interface customization
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'tileview',
            'settings',
            'videoquality'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_FOCUS_INDICATOR: true,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
          DISABLE_VIDEO_BACKGROUND: true,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          DISPLAY_WELCOME_FOOTER: false,
          DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          SETTINGS_SECTIONS: ['devices', 'language'],
          // Filmstrip (video tiles) settings
          FILM_STRIP_MAX_HEIGHT: 120,
          TILE_VIEW_MAX_COLUMNS: 3
        }
      });

      this.currentZone = zone;
      this.setupEventListeners();
      
      // Play join sound
      this.playSound('join');
      
      console.log(`[JitsiManager] Joined room: ${roomName}`);

    } catch (error) {
      console.error('[JitsiManager] Failed to join room:', error);
      if (this.wrapperContainer) {
        this.wrapperContainer.style.display = 'none';
        this.wrapperContainer.classList.remove('active');
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Leave the current Jitsi room
   */
  public async leaveRoom(): Promise<void> {
    if (!this.api) return;

    this.isTransitioning = true;

    try {
      console.log('[JitsiManager] Leaving room');
      
      // Play leave sound
      this.playSound('leave');
      
      this.api.executeCommand('hangup');
      this.api.dispose();
      this.api = null;
      this.currentZone = null;
      
      // Clear proximity tracking
      this.clearProximityTracking();

      // Hide the wrapper container
      if (this.wrapperContainer) {
        this.wrapperContainer.style.display = 'none';
        this.wrapperContainer.classList.remove('active');
      }

    } catch (error) {
      console.error('[JitsiManager] Error leaving room:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Set up Jitsi event listeners
   */
  private setupEventListeners(): void {
    if (!this.api) return;

    this.api.addListener('videoConferenceJoined', (rawData: unknown) => {
      const data = rawData as JitsiConferenceJoinedData;
      console.log('[JitsiManager] Conference joined:', data.roomName);
      this.emit('joined', {
        roomName: data.roomName,
        participantId: data.id,
        displayName: data.displayName
      });
    });

    this.api.addListener('videoConferenceLeft', () => {
      console.log('[JitsiManager] Conference left');
      this.leaveRoom();
      this.emit('left', {});
    });

    this.api.addListener('participantJoined', (rawData: unknown) => {
      const data = rawData as JitsiParticipantData;
      console.log('[JitsiManager] Participant joined:', data.displayName);
      this.emit('participantJoined', {
        id: data.id,
        displayName: data.displayName
      });
    });

    this.api.addListener('participantLeft', (rawData: unknown) => {
      const data = rawData as JitsiParticipantData;
      console.log('[JitsiManager] Participant left:', data.id);
      this.emit('participantLeft', { id: data.id });
    });

    this.api.addListener('audioMuteStatusChanged', (rawData: unknown) => {
      const data = rawData as JitsiMuteData;
      this.emit('audioMuteChanged', { muted: data.muted });
    });

    this.api.addListener('videoMuteStatusChanged', (rawData: unknown) => {
      const data = rawData as JitsiMuteData;
      this.emit('videoMuteChanged', { muted: data.muted });
    });

    // Handle errors
    this.api.addListener('errorOccurred', (error: unknown) => {
      console.error('[JitsiManager] Error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Sanitize room name for URL safety
   */
  private sanitizeRoomName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ==========================================
  // Public Control Methods
  // ==========================================

  public toggleAudio(): void {
    this.api?.executeCommand('toggleAudio');
  }

  public toggleVideo(): void {
    this.api?.executeCommand('toggleVideo');
  }

  public setDisplayName(name: string): void {
    this.api?.executeCommand('displayName', name);
  }

  public sendChatMessage(message: string, to?: string): void {
    this.api?.executeCommand('sendChatMessage', message, to);
  }

  public setVideoQuality(height: number): void {
    this.api?.executeCommand('setVideoQuality', height);
  }

  public isInRoom(): boolean {
    return this.api !== null;
  }

  public getCurrentZone(): JitsiZone | null {
    return this.currentZone;
  }

  public getParticipants(): JitsiParticipant[] {
    return this.api?.getParticipantsInfo() || [];
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  public on(event: string, callback: JitsiEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: JitsiEventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  // ==========================================
  // Proximity Audio (distance-based volume)
  // ==========================================
  
  /**
   * Update proximity-based volume for a player
   * Call this from the game update loop with player positions
   */
  public updatePlayerProximity(
    playerId: string, 
    distance: number,
    displayName?: string
  ): void {
    if (!this.api) return;
    
    const wasNearby = this.nearbyPlayers.has(playerId);
    
    if (distance <= this.PROXIMITY_RADIUS) {
      // Calculate volume based on distance (closer = louder)
      const normalizedDistance = distance / this.PROXIMITY_RADIUS;
      const volume = this.MAX_VOLUME - (normalizedDistance * (this.MAX_VOLUME - this.MIN_VOLUME));
      
      // Store proximity info
      this.nearbyPlayers.set(playerId, { distance, volume });
      
      // Set participant volume in Jitsi
      try {
        this.api.executeCommand('setParticipantVolume', playerId, volume);
      } catch (e) {
        // Participant might not be in the Jitsi room
      }
      
      // Play sound when someone first comes near
      if (!wasNearby) {
        this.playSound('playerNear');
        this.emit('playerNearby', { playerId, displayName, distance });
      }
    } else if (wasNearby) {
      // Player left proximity
      this.nearbyPlayers.delete(playerId);
      
      // Mute them
      try {
        this.api.executeCommand('setParticipantVolume', playerId, 0);
      } catch (e) {
        // Ignore
      }
      
      this.emit('playerLeftProximity', { playerId });
    }
  }
  
  /**
   * Get all players currently in proximity
   */
  public getNearbyPlayers(): Map<string, { distance: number; volume: number }> {
    return new Map(this.nearbyPlayers);
  }
  
  /**
   * Clear all proximity tracking (e.g., when leaving a room)
   */
  private clearProximityTracking(): void {
    this.nearbyPlayers.clear();
  }

  // ==========================================
  // Cleanup
  // ==========================================

  public dispose(): void {
    this.leaveRoom();
    this.listeners.clear();
    this.clearProximityTracking();
  }
}

export default JitsiManager;
