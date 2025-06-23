import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Type definitions for clarity
type ProductInfo = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

type CartItem = {
  product_id: string;
  quantity: number;
  product: ProductInfo;
};

/**
 * @description Gère les webhooks entrants de Stripe, notamment pour finaliser les commandes après un paiement réussi.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Error message: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = await createSupabaseServerClient();

    try {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_checkout_session_id", session.id)
        .single();

      if (existingOrder) {
        console.log(`[STRIPE_WEBHOOK] Order for session ${session.id} already exists. Skipping.`);
        return NextResponse.json({ received: true, message: "Order already processed." });
      }

      const cartId = session.client_reference_id;
      if (!cartId) {
        throw new Error("Cart ID not found in Stripe session.");
      }

      const { data: cartData, error: cartError } = await supabase
        .from("carts")
        .select("id, user_id, items:cart_items(*, product:products(id, name, price, image_url))")
        .eq("id", cartId)
        .single();

      if (cartError || !cartData || !cartData.items) {
        throw new Error(`Could not retrieve cart with ID ${cartId} or cart is empty.`);
      }

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: cartData.user_id,
          stripe_checkout_session_id: session.id,
          status: "processing",
          total_amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          payment_status: "paid",
          payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .select("id")
        .single();

      if (orderError || !newOrder) {
        throw new Error(`Failed to create order: ${orderError?.message}`);
      }

      const orderItems = cartData.items.map((item: CartItem) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product.price,
        product_name_at_purchase: item.product.name,
        product_image_url_at_purchase: item.product.image_url,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) {
        console.error(`Failed to create order items, rolling back order ${newOrder.id}`);
        await supabase.from("orders").delete().eq("id", newOrder.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      await supabase.from("cart_items").delete().eq("cart_id", cartId);

      console.log(
        `[STRIPE_WEBHOOK] Successfully created order ${newOrder.id} for session ${session.id}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown processing error";
      console.error("[STRIPE_WEBHOOK_PROCESSING_ERROR]", error);
      return new NextResponse(`Webhook handler failed: ${errorMessage}`, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
