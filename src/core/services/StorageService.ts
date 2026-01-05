/**
 * StorageService - Centralized localStorage abstraction
 * 
 * Provides type-safe access to localStorage with proper error handling.
 * Replaces scattered localStorage calls throughout the codebase.
 */

// Storage keys - centralized to avoid typos and enable refactoring
export const STORAGE_KEYS = {
  USER_ID: 'arkagentic_user_id',
  SESSION_TOKEN: 'arkagentic_session_token',
  OFFLINE_NAME: 'arkagentic_offline_name',
  OFFLINE_AVATAR: 'arkagentic_offline_avatar',
  USER: 'arkagentic_user', // Legacy - cached user data
  PREFERRED_MODEL: 'arkagentic_preferred_model',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * User data structure stored in localStorage
 */
export interface StoredUser {
  id: string;
  display_name: string;
  avatar_sprite: string;
  created_at?: string;
}

/**
 * Session credentials structure
 */
export interface SessionCredentials {
  userId: string;
  sessionToken: string;
}

/**
 * Offline credentials structure
 */
export interface OfflineCredentials {
  name: string;
  avatar: string;
}

class StorageServiceClass {
  /**
   * Get a value from localStorage with type safety
   */
  get<T = string>(key: StorageKey): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`[StorageService] Error reading ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Set a value in localStorage
   */
  set<T>(key: StorageKey, value: T): boolean {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`[StorageService] Error writing ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Remove a value from localStorage
   */
  remove(key: StorageKey): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[StorageService] Error removing ${key}:`, error);
      return false;
    }
  }
  
  // ============================================
  // High-level helper methods
  // ============================================
  
  /**
   * Get session credentials if they exist
   */
  getSessionCredentials(): SessionCredentials | null {
    const userId = this.get(STORAGE_KEYS.USER_ID);
    const sessionToken = this.get(STORAGE_KEYS.SESSION_TOKEN);
    
    if (userId && sessionToken) {
      return { userId, sessionToken };
    }
    return null;
  }
  
  /**
   * Set session credentials
   */
  setSessionCredentials(userId: string, sessionToken: string): boolean {
    return this.set(STORAGE_KEYS.USER_ID, userId) && 
           this.set(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
  }
  
  /**
   * Get offline credentials if they exist
   */
  getOfflineCredentials(): OfflineCredentials | null {
    const name = this.get(STORAGE_KEYS.OFFLINE_NAME);
    const avatar = this.get(STORAGE_KEYS.OFFLINE_AVATAR);
    
    if (name && avatar) {
      return { name, avatar };
    }
    return null;
  }
  
  /**
   * Set offline credentials (for offline mode)
   */
  setOfflineCredentials(name: string, avatar: string): boolean {
    return this.set(STORAGE_KEYS.OFFLINE_NAME, name) && 
           this.set(STORAGE_KEYS.OFFLINE_AVATAR, avatar);
  }
  
  /**
   * Clear all authentication-related credentials
   */
  clearCredentials(): void {
    this.remove(STORAGE_KEYS.USER_ID);
    this.remove(STORAGE_KEYS.SESSION_TOKEN);
    this.remove(STORAGE_KEYS.OFFLINE_NAME);
    this.remove(STORAGE_KEYS.OFFLINE_AVATAR);
    this.remove(STORAGE_KEYS.USER);
  }
  
  /**
   * Get cached user data (legacy)
   */
  getCachedUser(): StoredUser | null {
    return this.get<StoredUser>(STORAGE_KEYS.USER);
  }
  
  /**
   * Set cached user data (legacy)
   */
  setCachedUser(user: StoredUser): boolean {
    return this.set(STORAGE_KEYS.USER, user);
  }
  
  /**
   * Get user's preferred AI model
   */
  getPreferredModel(): string {
    return this.get(STORAGE_KEYS.PREFERRED_MODEL) || 'mistralai/mistral-nemo';
  }
  
  /**
   * Set user's preferred AI model
   */
  setPreferredModel(modelId: string): boolean {
    return this.set(STORAGE_KEYS.PREFERRED_MODEL, modelId);
  }
  
  /**
   * Check if user is in offline mode (has offline credentials but no valid session)
   */
  isOfflineMode(): boolean {
    const session = this.getSessionCredentials();
    const offline = this.getOfflineCredentials();
    
    // Offline mode if we have offline credentials but no session,
    // or if user ID starts with 'offline-'
    if (offline && !session) return true;
    if (session?.userId.startsWith('offline-')) return true;
    
    return false;
  }
  
  /**
   * Generate a secure random session token
   */
  generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export singleton instance
export const StorageService = new StorageServiceClass();

// Default export for convenience
export default StorageService;
