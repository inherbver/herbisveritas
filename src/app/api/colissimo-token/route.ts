import { NextRequest, NextResponse } from "next/server";
import { mockColissimoToken } from "@/mocks/colissimo-data";

/**
 * API Route pour obtenir un token Colissimo
 * En développement : retourne un token mock
 * En production : appellera l'edge function Supabase
 */
export async function POST(_request: NextRequest) {
  try {
    // Check if we should use mock mode
    const useMock =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_USE_MOCK_COLISSIMO === "true" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (useMock) {
      // Return mock token for development
      console.log("[Colissimo Token API] Using mock token for development");
      return NextResponse.json(mockColissimoToken);
    }

    // In production, call the Supabase edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Colissimo Token API] Missing Supabase configuration");
      // Fallback to mock in case of missing config
      return NextResponse.json(mockColissimoToken);
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/colissimo-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Colissimo Token API] Edge function error:", errorText);

      // In case of error, fallback to mock
      if (process.env.NODE_ENV === "development") {
        console.log("[Colissimo Token API] Falling back to mock token");
        return NextResponse.json(mockColissimoToken);
      }

      return NextResponse.json(
        { error: "Failed to get Colissimo token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Colissimo Token API] Error:", error);

    // Fallback to mock in development
    if (process.env.NODE_ENV === "development") {
      console.log("[Colissimo Token API] Error occurred, using mock token");
      return NextResponse.json(mockColissimoToken);
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
