/**
 * Client-Side Security Utilities
 *
 * Provides additional security layers for browser environment
 */

/**
 * Content Security Policy violation handler
 */
export function setupCSPViolationReporting(): void {
  if (typeof window === "undefined") return;

  document.addEventListener("securitypolicyviolation", (event) => {
    console.warn("[CSP Violation]", {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
    });

    // Send to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      fetch("/api/security/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}); // Silent fail for security reporting
    }
  });
}

/**
 * XSS Protection utilities
 */
export const XSSProtection = {
  /**
   * Sanitize user input before displaying
   */
  sanitizeDisplay(input: string): string {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Validate URL before navigation
   */
  isSecureURL(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      // Only allow same origin or HTTPS external links
      return (
        parsed.origin === window.location.origin || parsed.protocol === "https:"
      );
    } catch {
      return false;
    }
  },

  /**
   * Safe innerHTML replacement
   */
  safeSetHTML(element: HTMLElement, html: string): void {
    // Remove script tags and event handlers
    const cleaned = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/javascript:/gi, "");

    element.innerHTML = cleaned;
  },
};

/**
 * Session security monitoring
 */
export class SessionSecurity {
  private static instance: SessionSecurity;
  private lastActivity = Date.now();
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static getInstance(): SessionSecurity {
    if (!this.instance) {
      this.instance = new SessionSecurity();
    }
    return this.instance;
  }

  /**
   * Initialize session monitoring
   */
  init(): void {
    if (typeof window === "undefined") return;

    // Track user activity
    ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.lastActivity = Date.now();
        },
        { passive: true },
      );
    });

    // Check for session timeout
    setInterval(() => {
      if (Date.now() - this.lastActivity > this.INACTIVITY_TIMEOUT) {
        this.handleInactiveSession();
      }
    }, 60000); // Check every minute

    // Monitor for tab visibility (detect if user switches away)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.lastActivity = Date.now();
      }
    });
  }

  private handleInactiveSession(): void {
    console.warn("[Session] Inactive session detected");
    // Could trigger logout or session refresh
    // window.location.href = '/login?reason=timeout';
  }
}

/**
 * Browser security checks
 */
export const BrowserSecurity = {
  /**
   * Check if browser meets minimum security requirements
   */
  checkBrowserSecurity(): { secure: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for HTTPS in production
    if (
      process.env.NODE_ENV === "production" &&
      location.protocol !== "https:"
    ) {
      warnings.push("Insecure connection detected");
    }

    // Check for modern browser features
    if (!window.crypto || !window.crypto.subtle) {
      warnings.push("Browser lacks modern cryptography support");
    }

    if (!window.localStorage) {
      warnings.push("Browser lacks local storage support");
    }

    if (!("serviceWorker" in navigator)) {
      warnings.push("Browser lacks service worker support");
    }

    return {
      secure: warnings.length === 0,
      warnings,
    };
  },

  /**
   * Initialize browser security monitoring
   */
  init(): void {
    if (typeof window === "undefined") return;

    const { secure, warnings } = this.checkBrowserSecurity();

    if (!secure) {
      console.warn("[Browser Security]", warnings);
    }

    // Setup other security features
    setupCSPViolationReporting();
    SessionSecurity.getInstance().init();
  },
};
