// Type-safe translation keys for next-intl
// This ensures we don't use non-existent translation keys

export type AuthErrorTranslationKey =
  | "errors.login.invalidCredentials"
  | "errors.login.emailNotConfirmed"
  | "errors.login.userNotFound"
  | "errors.login.tooManyRequests"
  | "errors.login.accountLocked"
  | "errors.login.sessionExpired"
  | "errors.login.networkError"
  | "errors.login.serverError"
  | "errors.login.generic"
  | "errors.signup.emailAlreadyRegistered"
  | "errors.signup.weakPassword"
  | "errors.signup.invalidEmailFormat"
  | "errors.signup.passwordTooShort"
  | "errors.signup.emailAlreadyConfirmed"
  | "errors.signup.signupDisabled"
  | "errors.signup.tooManyRequests"
  | "errors.signup.networkError"
  | "errors.signup.serverError"
  | "errors.signup.generic";

// Helper function to safely get translated error messages
export async function getTranslatedErrorMessage(
  translator: () => Promise<string>,
  errorKey: AuthErrorTranslationKey,
  fallbackMessages: Record<AuthErrorTranslationKey, string>,
): Promise<string> {
  try {
    return await translator();
  } catch {
    return fallbackMessages[errorKey] || "Une erreur inattendue est survenue";
  }
}

// Default fallback messages for auth errors
export const DEFAULT_AUTH_ERROR_MESSAGES: Record<
  AuthErrorTranslationKey,
  string
> = {
  "errors.login.invalidCredentials":
    "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.",
  "errors.login.emailNotConfirmed":
    "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception.",
  "errors.login.userNotFound": "Aucun compte trouvé avec cette adresse email.",
  "errors.login.tooManyRequests":
    "Trop de tentatives de connexion. Attendez quelques minutes.",
  "errors.login.accountLocked":
    "Votre compte est temporairement verrouillé. Contactez le support.",
  "errors.login.sessionExpired":
    "Votre session a expiré. Veuillez vous reconnecter.",
  "errors.login.networkError":
    "Erreur de connexion. Vérifiez votre connexion internet.",
  "errors.login.serverError": "Erreur serveur temporaire. Veuillez réessayer.",
  "errors.login.generic":
    "Une erreur de connexion s'est produite. Veuillez réessayer.",
  "errors.signup.emailAlreadyRegistered":
    "Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
  "errors.signup.weakPassword":
    "Le mot de passe est trop faible. Il doit contenir au moins 8 caractères avec majuscules, minuscules et chiffres.",
  "errors.signup.invalidEmailFormat":
    "Le format de l'adresse email n'est pas valide.",
  "errors.signup.passwordTooShort":
    "Le mot de passe doit contenir au moins 8 caractères.",
  "errors.signup.emailAlreadyConfirmed":
    "Cette adresse email est déjà confirmée.",
  "errors.signup.signupDisabled":
    "Les inscriptions sont temporairement désactivées.",
  "errors.signup.tooManyRequests":
    "Trop de tentatives d'inscription. Attendez quelques minutes.",
  "errors.signup.networkError":
    "Erreur de connexion. Vérifiez votre connexion internet.",
  "errors.signup.serverError": "Erreur serveur temporaire. Veuillez réessayer.",
  "errors.signup.generic":
    "Une erreur d'inscription s'est produite. Veuillez réessayer.",
};
