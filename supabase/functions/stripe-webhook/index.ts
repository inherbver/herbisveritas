// Add reference to Supabase's edge function types for IDE support
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// Stripe webhooks handler
// Based on: https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/stripe-webhooks/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.8.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// 1. Get the required environment variables with validation
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY environment variable is missing");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL environment variable is missing");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is missing");
if (!signingSecret) throw new Error("STRIPE_WEBHOOK_SECRET environment variable is missing");

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // @ts-expect-error -- Deno/Edge runtime requires a custom fetch client.
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-04-10", // IMPORTANT: Match the API version in your Stripe dashboard
});
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// 2. The main webhook handler function
serve(async (req: Request) => {
  const signature = req.headers.get("Stripe-Signature");

  // First, extract the body from the request
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      signingSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return new Response(message, { status: 400 });
  }

  console.log(`🔔 Stripe event received: ${event.type} (${event.id})`);

  // 3. Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // The cart ID was passed in client_reference_id
        const cartId = session.client_reference_id;
        if (!cartId) {
          throw new Error(`Missing client_reference_id on checkout session ${session.id}`);
        }

        const { data, error } = await supabase.rpc("create_order_from_cart", {
          p_cart_id: cartId,
          p_stripe_checkout_id: session.id,
        });

        if (error) {
          console.error("RPC Error:", error);
          throw new Error(`RPC error: ${error.message}`);
        }

        if (typeof data === "string" && data.startsWith("ERROR")) {
          console.error("Business logic error from RPC:", data);
          throw new Error(`Business logic error from RPC: ${data}`);
        }

        break;
      }

      default:
        console.log(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", message);
    // We return a 200 status code to Stripe to prevent retries for application-level errors.
    // The error is logged for debugging.
    return new Response(JSON.stringify({ error: "Webhook handler failed", details: message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Return a success response to Stripe
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
