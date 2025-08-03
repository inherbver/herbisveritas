/**
 * Toast Manager - Gestionnaire intelligent des notifications
 * Évite les toasts multiples et gère les types de messages
 */

import { toast } from "sonner";

interface ToastOptions {
  id?: string;
  duration?: number;
  description?: string;
}

class ToastManager {
  private static instance: ToastManager;
  private pendingToasts = new Map<string, NodeJS.Timeout>();
  private lastToastTime = new Map<string, number>();
  
  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * Affiche un toast de succès avec debouncing intelligent
   */
  success(message: string, options: ToastOptions = {}) {
    this.showToast('success', message, options);
  }

  /**
   * Affiche un toast d'erreur avec debouncing intelligent
   */
  error(message: string, options: ToastOptions = {}) {
    this.showToast('error', message, options);
  }

  /**
   * Affiche un toast d'info avec debouncing intelligent
   */
  info(message: string, options: ToastOptions = {}) {
    this.showToast('info', message, options);
  }

  private showToast(type: 'success' | 'error' | 'info', message: string, options: ToastOptions) {
    const toastKey = options.id || `${type}-${message}`;
    const now = Date.now();
    
    // Vérifier si le même toast a été affiché récemment (dans les 1000ms)
    const lastTime = this.lastToastTime.get(toastKey) || 0;
    if (now - lastTime < 1000) {
      console.log(`[ToastManager] Skipping duplicate toast: ${message}`);
      return;
    }

    // Annuler tout toast en attente avec la même clé
    const pendingTimeout = this.pendingToasts.get(toastKey);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.pendingToasts.delete(toastKey);
    }

    // Programmer l'affichage du toast avec un léger délai pour permettre la consolidation
    const timeout = setTimeout(() => {
      this.lastToastTime.set(toastKey, Date.now());
      this.pendingToasts.delete(toastKey);

      switch (type) {
        case 'success':
          toast.success(message, {
            duration: options.duration || 3000,
            description: options.description,
          });
          break;
        case 'error':
          toast.error(message, {
            duration: options.duration || 4000,
            description: options.description,
          });
          break;
        case 'info':
          toast.info(message, {
            duration: options.duration || 3000,
            description: options.description,
          });
          break;
      }
    }, 100); // Délai de 100ms pour consolidation

    this.pendingToasts.set(toastKey, timeout);
  }

  /**
   * Nettoie les toasts en attente (utile lors du démontage des composants)
   */
  cleanup() {
    this.pendingToasts.forEach(timeout => clearTimeout(timeout));
    this.pendingToasts.clear();
  }

  /**
   * Force l'affichage immédiat d'un toast (contourne le debouncing)
   */
  immediate = {
    success: (message: string, options?: Omit<ToastOptions, 'id'>) => {
      toast.success(message, options);
    },
    error: (message: string, options?: Omit<ToastOptions, 'id'>) => {
      toast.error(message, options);
    },
    info: (message: string, options?: Omit<ToastOptions, 'id'>) => {
      toast.info(message, options);
    }
  };
}

// Instance singleton exportée
export const toastManager = ToastManager.getInstance();

// Hook React pour utiliser le toast manager
export function useToastManager() {
  return toastManager;
}

// Types utilitaires pour les messages de panier
export const CartToastMessages = {
  ITEM_ADDED: 'cart-item-added',
  ITEM_REMOVED: 'cart-item-removed',
  QUANTITY_UPDATED: 'cart-quantity-updated',
  CART_ERROR: 'cart-error'
} as const;