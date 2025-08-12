/**
 * Stripe Utility Functions
 */

import { stripe } from "./index";
import Stripe from "stripe";

/**
 * Formats amount from cents to decimal
 */
export function formatStripeAmount(amount: number, _currency: string = "eur"): number {
  return amount / 100;
}

/**
 * Formats amount from decimal to cents for Stripe
 */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Validates Stripe webhook signature
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Retrieves a Stripe checkout session
 */
export async function getStripeSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent"],
  });
}

/**
 * Creates a Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata || {},
  });
}

/**
 * Updates a Stripe customer
 */
export async function updateStripeCustomer(
  customerId: string,
  params: {
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Customer> {
  return await stripe.customers.update(customerId, params);
}

/**
 * Retrieves a Stripe customer by email
 */
export async function getStripeCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data.length > 0 ? customers.data[0] : null;
}

/**
 * Creates a refund for a payment
 */
export async function createStripeRefund(params: {
  paymentIntentId: string;
  amount?: number;
  reason?: Stripe.RefundCreateParams.Reason;
  metadata?: Record<string, string>;
}): Promise<Stripe.Refund> {
  return await stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    reason: params.reason,
    metadata: params.metadata || {},
  });
}

/**
 * Retrieves payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Creates a payment method
 */
export async function createPaymentMethod(params: {
  type: Stripe.PaymentMethodCreateParams.Type;
  card?: Stripe.PaymentMethodCreateParams.Card;
  customerId?: string;
}): Promise<Stripe.PaymentMethod> {
  const paymentMethodParams: Stripe.PaymentMethodCreateParams = {
    type: params.type,
  };

  if (params.card) {
    paymentMethodParams.card = params.card;
  }

  const paymentMethod = await stripe.paymentMethods.create(paymentMethodParams);

  // Attach to customer if provided
  if (params.customerId) {
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: params.customerId,
    });
  }

  return paymentMethod;
}

/**
 * Validates card details format
 */
export function validateCardDetails(card: {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic card number validation (Luhn algorithm would be better)
  if (!card.number || card.number.length < 13 || card.number.length > 19) {
    errors.push("Invalid card number length");
  }

  // Expiry month validation
  if (!card.exp_month || card.exp_month < 1 || card.exp_month > 12) {
    errors.push("Invalid expiry month");
  }

  // Expiry year validation
  const currentYear = new Date().getFullYear();
  if (!card.exp_year || card.exp_year < currentYear || card.exp_year > currentYear + 20) {
    errors.push("Invalid expiry year");
  }

  // CVC validation
  if (!card.cvc || card.cvc.length < 3 || card.cvc.length > 4) {
    errors.push("Invalid CVC");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Determines card brand from number
 */
export function getCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, "");

  if (/^4/.test(number)) {
    return "visa";
  } else if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) {
    return "mastercard";
  } else if (/^3[47]/.test(number)) {
    return "amex";
  } else if (/^6/.test(number)) {
    return "discover";
  }

  return "unknown";
}

/**
 * Formats card number for display
 */
export function formatCardNumber(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, "");
  return number.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/**
 * Masks card number for secure display
 */
export function maskCardNumber(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, "");
  if (number.length < 4) return "*".repeat(number.length);

  const last4 = number.slice(-4);
  const maskedLength = number.length - 4;

  // Create masked string with proper grouping
  const maskedPart = "*".repeat(maskedLength);
  const fullMasked = maskedPart + last4;

  // Format with spaces: group by 4s
  return fullMasked.replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * Converts Stripe error to user-friendly message
 */
export function formatStripeError(error: Stripe.StripeRawError): string {
  switch (error.code) {
    case "card_declined":
      return "Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.";
    case "insufficient_funds":
      return "Fonds insuffisants sur votre carte.";
    case "expired_card":
      return "Votre carte a expiré.";
    case "incorrect_cvc":
      return "Le code de sécurité de votre carte est incorrect.";
    case "processing_error":
      return "Une erreur s'est produite lors du traitement de votre paiement.";
    case "rate_limit":
      return "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
    default:
      return "Une erreur de paiement s'est produite. Veuillez réessayer.";
  }
}

/**
 * Checks if payment requires additional authentication
 */
export function requiresAuthentication(paymentIntent: Stripe.PaymentIntent): boolean {
  return paymentIntent.status === "requires_action";
}

/**
 * Gets supported payment methods for a country
 */
export function getSupportedPaymentMethods(country: string): string[] {
  const baseMethod = ["card"];

  switch (country.toUpperCase()) {
    case "FR":
      return [...baseMethod, "sepa_debit", "bancontact"];
    case "DE":
      return [...baseMethod, "sepa_debit", "sofort", "giropay"];
    case "NL":
      return [...baseMethod, "sepa_debit", "ideal", "bancontact"];
    case "BE":
      return [...baseMethod, "sepa_debit", "bancontact"];
    case "IT":
      return [...baseMethod, "sepa_debit"];
    case "ES":
      return [...baseMethod, "sepa_debit"];
    case "US":
      return [...baseMethod, "us_bank_account"];
    case "GB":
      return [...baseMethod, "bacs_debit"];
    default:
      return baseMethod;
  }
}
