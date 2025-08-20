import { AuthError } from "@supabase/supabase-js";
import { AuthErrorTranslationKey } from "@/types/i18n";

/**
 * Mappe les erreurs Supabase vers des clés de traduction spécifiques
 */
export class AuthErrorMapper {
  /**
   * Mappe une erreur de connexion Supabase vers une clé de traduction
   */
  static mapLoginError(error: AuthError): AuthErrorTranslationKey {
    const message = error.message?.toLowerCase() || "";

    // Erreurs spécifiques de Supabase Auth (clés relatives au namespace Auth)
    if (message.includes("invalid login credentials")) {
      return "errors.login.invalidCredentials";
    }

    if (message.includes("email not confirmed")) {
      return "errors.login.emailNotConfirmed";
    }

    if (message.includes("user not found")) {
      return "errors.login.userNotFound";
    }

    if (
      message.includes("too many requests") ||
      message.includes("rate limit")
    ) {
      return "errors.login.tooManyRequests";
    }

    if (
      message.includes("account locked") ||
      message.includes("account suspended")
    ) {
      return "errors.login.accountLocked";
    }

    if (
      message.includes("session expired") ||
      message.includes("token expired")
    ) {
      return "errors.login.sessionExpired";
    }

    // Erreurs réseau
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("offline")
    ) {
      return "errors.login.networkError";
    }

    // Erreurs serveur
    if (
      message.includes("internal server error") ||
      message.includes("service unavailable")
    ) {
      return "errors.login.serverError";
    }

    // Erreur générique
    return "errors.login.generic";
  }

  /**
   * Mappe une erreur d'inscription Supabase vers une clé de traduction
   */
  static mapSignupError(error: AuthError): AuthErrorTranslationKey {
    const message = error.message?.toLowerCase() || "";

    // Erreurs spécifiques de Supabase Auth (clés relatives au namespace Auth)
    if (
      message.includes("user already registered") ||
      message.includes("email already in use")
    ) {
      return "errors.signup.emailAlreadyRegistered";
    }

    if (
      message.includes("weak password") ||
      message.includes("password too weak")
    ) {
      return "errors.signup.weakPassword";
    }

    if (
      message.includes("invalid email") ||
      message.includes("invalid email format")
    ) {
      return "errors.signup.invalidEmailFormat";
    }

    if (
      message.includes("password too short") ||
      message.includes("password must be")
    ) {
      return "errors.signup.passwordTooShort";
    }

    if (message.includes("email already confirmed")) {
      return "errors.signup.emailAlreadyConfirmed";
    }

    if (
      message.includes("signup disabled") ||
      message.includes("registration disabled")
    ) {
      return "errors.signup.signupDisabled";
    }

    if (
      message.includes("too many requests") ||
      message.includes("rate limit")
    ) {
      return "errors.signup.tooManyRequests";
    }

    // Erreurs réseau
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("offline")
    ) {
      return "errors.signup.networkError";
    }

    // Erreurs serveur
    if (
      message.includes("internal server error") ||
      message.includes("service unavailable")
    ) {
      return "errors.signup.serverError";
    }

    // Erreur générique
    return "errors.signup.generic";
  }

  /**
   * Vérifie si une erreur est temporaire et peut être réessayée
   */
  static isTemporaryError(error: AuthError): boolean {
    const message = error.message?.toLowerCase() || "";

    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("offline") ||
      message.includes("timeout") ||
      message.includes("server error") ||
      message.includes("service unavailable") ||
      message.includes("too many requests")
    );
  }

  /**
   * Obtient une suggestion d'action pour l'utilisateur basée sur l'erreur
   */
  static getActionSuggestion(error: AuthError): string | null {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("email not confirmed")) {
      return "resendConfirmation";
    }

    if (message.includes("user not found")) {
      return "createAccount";
    }

    if (message.includes("too many requests")) {
      return "waitAndRetry";
    }

    if (message.includes("weak password")) {
      return "strengthenPassword";
    }

    if (this.isTemporaryError(error)) {
      return "retry";
    }

    return null;
  }
}

/**
 * Types pour les suggestions d'actions
 */
export type AuthErrorAction =
  | "resendConfirmation"
  | "createAccount"
  | "waitAndRetry"
  | "strengthenPassword"
  | "retry"
  | null;
