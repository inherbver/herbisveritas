"use client";

/**
 * Supprime les erreurs communes des extensions de navigateur
 * qui n'affectent pas le fonctionnement de l'application
 */
export function setupErrorSuppression() {
  if (typeof window === "undefined") return;

  // Capturer les erreurs de listener asynchrone des extensions
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type === "error") {
      const wrappedListener = (event: ErrorEvent) => {
        // Ignorer les erreurs connues des extensions
        if (
          event.message?.includes("message channel closed") ||
          event.message?.includes(
            "listener indicated an asynchronous response",
          ) ||
          event.error?.message?.includes("Extension context invalidated")
        ) {
          console.warn("Extension error suppressed:", event.message);
          return;
        }

        // Appeler le listener original pour les vraies erreurs
        if (typeof listener === "function") {
          listener(event);
        } else if (listener && typeof listener.handleEvent === "function") {
          listener.handleEvent(event);
        }
      };

      originalAddEventListener.call(this, type, wrappedListener, options);
    } else {
      originalAddEventListener.call(
        this,
        type,
        listener as EventListener,
        options,
      );
    }
  };

  // Gestionnaire d'erreur global pour les promesses non gérées
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.message?.includes("message channel closed") ||
      event.reason?.message?.includes(
        "listener indicated an asynchronous response",
      )
    ) {
      console.warn("Extension promise rejection suppressed:", event.reason);
      event.preventDefault();
    }
  });
}
