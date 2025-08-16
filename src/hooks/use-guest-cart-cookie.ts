/**
 * Hook pour gérer le cookie herbis-cart-id côté client
 * Utilisé après les Server Actions qui retournent un guestCartId
 */

export function setGuestCartCookie(guestCartId: string) {
  if (typeof document !== "undefined") {
    const maxAge = 60 * 60 * 24 * 30; // 30 jours
    const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
    document.cookie = `herbis-cart-id=${guestCartId}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
  }
}

export function getGuestCartCookie(): string | null {
  if (typeof document === "undefined") return null;

  const name = "herbis-cart-id=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

export function removeGuestCartCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "herbis-cart-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
