/**
 * Utilitaires de cleanup automatique pour les tests
 * Garantit que les tests sont isolés et ne laissent pas de résidus
 */

import { cleanup as rtlCleanup } from '@testing-library/react';

/**
 * Interface pour les ressources qui peuvent être nettoyées
 */
interface CleanupResource {
  cleanup: () => void | Promise<void>;
}

/**
 * Gestionnaire global de cleanup
 */
class CleanupManager {
  private resources: CleanupResource[] = [];
  private timers: NodeJS.Timeout[] = [];
  
  /**
   * Enregistre une ressource pour cleanup automatique
   */
  register(resource: CleanupResource | (() => void | Promise<void>)) {
    if (typeof resource === 'function') {
      this.resources.push({ cleanup: resource });
    } else {
      this.resources.push(resource);
    }
  }
  
  /**
   * Enregistre un timer pour cleanup automatique
   */
  registerTimer(timer: NodeJS.Timeout) {
    this.timers.push(timer);
  }
  
  /**
   * Nettoie toutes les ressources enregistrées
   */
  async cleanupAll() {
    // Nettoyer les timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
    
    // Nettoyer les ressources
    const cleanupPromises = this.resources.map(async (resource) => {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn('Erreur lors du cleanup:', error);
      }
    });
    
    await Promise.all(cleanupPromises);
    this.resources = [];
    
    // Cleanup React Testing Library
    rtlCleanup();
    
    // Nettoyer tous les mocks Jest
    jest.clearAllMocks();
    
    // Reset des timers Jest si utilisés
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  }
  
  /**
   * Reset complet - utilisé après chaque test
   */
  reset() {
    this.resources = [];
    this.timers = [];
  }
}

// Instance globale du gestionnaire
const globalCleanupManager = new CleanupManager();

/**
 * Hook pour cleanup automatique
 * Utilise cette fonction dans beforeEach/afterEach
 */
export const useTestCleanup = () => {
  const cleanup = () => globalCleanupManager.cleanupAll();
  const register = (resource: CleanupResource | (() => void | Promise<void>)) => 
    globalCleanupManager.register(resource);
  const registerTimer = (timer: NodeJS.Timeout) => 
    globalCleanupManager.registerTimer(timer);
  
  return { cleanup, register, registerTimer };
};

/**
 * Setup automatique pour les tests - place dans beforeEach/afterEach
 */
export const setupAutoCleanup = () => {
  const { cleanup } = useTestCleanup();
  
  beforeEach(() => {
    // Reset avant chaque test
    globalCleanupManager.reset();
  });
  
  afterEach(async () => {
    // Cleanup après chaque test
    await cleanup();
  });
  
  return useTestCleanup();
};

/**
 * Cleanup spécifique pour les stores Zustand
 */
export const cleanupZustandStores = () => {
  // Reset du store de cart
  try {
    const { useCartStore } = require('@/stores/cartStore');
    if (useCartStore?.getState) {
      useCartStore.setState({
        items: [],
        isLoading: false,
        error: null
      });
    }
  } catch (error) {
    // Store non disponible dans ce test
  }
  
  // Reset du store d'addresses
  try {
    const { useAddressStore } = require('@/stores/addressStore');
    if (useAddressStore?.getState) {
      useAddressStore.setState({
        addresses: [],
        selectedAddressId: null,
        isLoading: false,
        error: null
      });
    }
  } catch (error) {
    // Store non disponible dans ce test
  }
  
  // Reset du store de profil
  try {
    const { useProfileStore } = require('@/stores/profileStore');
    if (useProfileStore?.getState) {
      useProfileStore.setState({
        profile: null,
        isLoading: false,
        error: null
      });
    }
  } catch (error) {
    // Store non disponible dans ce test
  }
};

/**
 * Cleanup du localStorage/sessionStorage pour les tests
 */
export const cleanupStorage = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
  
  // Reset des mocks storage si ils existent
  if (jest.isMockFunction(window?.localStorage?.getItem)) {
    (window.localStorage as any).clear.mockClear();
  }
};

/**
 * Cleanup complet pour les tests d'intégration
 */
export const fullTestCleanup = async () => {
  // Cleanup React Testing Library
  rtlCleanup();
  
  // Cleanup stores Zustand
  cleanupZustandStores();
  
  // Cleanup storage
  cleanupStorage();
  
  // Cleanup mocks Jest
  jest.clearAllMocks();
  
  // Reset timers si nécessaire
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
  
  // Attendre que tous les microtasks se terminent
  await new Promise(resolve => process.nextTick(resolve));
};

/**
 * Template de test avec cleanup automatique
 */
export const createCleanTest = (testFn: () => void | Promise<void>) => {
  return async () => {
    const { cleanup } = useTestCleanup();
    
    try {
      await testFn();
    } finally {
      await cleanup();
    }
  };
};