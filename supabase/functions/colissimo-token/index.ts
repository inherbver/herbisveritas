import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface _TokenRequest {
  apikey?: string;
  partnerClientCode?: string;
}

interface ColissimoTokenResponse {
  token?: string;
  errorCode?: string;
  errorLabel?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Récupération des credentials depuis les variables d'environnement
    const apiKey = Deno.env.get("COLISSIMO_API_KEY");
    const apiSecret = Deno.env.get("COLISSIMO_API_SECRET"); // Clé La Poste Developer
    const login = Deno.env.get("COLISSIMO_LOGIN");
    const password = Deno.env.get("COLISSIMO_PASSWORD");
    const partnerClientCode = Deno.env.get("COLISSIMO_PARTNER_CLIENT_CODE");
    const testMode = Deno.env.get("COLISSIMO_TEST_MODE") === "true";
    const sandboxMode = Deno.env.get("COLISSIMO_SANDBOX_MODE") === "true";

    // Configuration des endpoints selon le mode
    let baseUrl: string;
    let authEndpoint: string;

    if (apiSecret) {
      // Mode La Poste Developer (Okapi)
      baseUrl = Deno.env.get("LAPOSTE_API_BASE_URL") || "https://api.laposte.fr";
      authEndpoint = "/pointsderetrait/v1/auth"; // Endpoint supposé pour La Poste Developer
    } else {
      // Mode Colissimo Entreprise classique
      baseUrl = Deno.env.get("COLISSIMO_BASE_URL") || "https://ws.colissimo.fr";
      authEndpoint = "/widget-colissimo/rest/authenticate.rest";
    }

    // Validation : au moins une méthode d'authentification doit être disponible
    if (!apiKey && !apiSecret && (!login || !password)) {
      return new Response(
        JSON.stringify({
          error:
            "Missing Colissimo credentials. Set either COLISSIMO_API_KEY, COLISSIMO_API_SECRET, or both COLISSIMO_LOGIN and COLISSIMO_PASSWORD",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construction du payload d'authentification
    const authPayload: Record<string, string> = {};

    if (apiSecret) {
      // Utilisation de la clé La Poste Developer (sandbox ou production)
      authPayload.apikey = apiSecret;
    } else if (apiKey) {
      authPayload.apikey = testMode ? Deno.env.get("COLISSIMO_TEST_API_KEY") || apiKey : apiKey;
    } else {
      authPayload.login = login!;
      authPayload.password = password!;
    }

    // Ajout du code partenaire si disponible
    if (partnerClientCode) {
      authPayload.partnerClientCode = partnerClientCode;
    }

    console.log(`Requesting Colissimo token (test mode: ${testMode}, sandbox: ${sandboxMode})`);
    console.log(`Using API Secret: ${apiSecret ? "YES" : "NO"}`);
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Auth endpoint: ${authEndpoint}`);
    console.log(`Auth payload keys: ${Object.keys(authPayload).join(", ")}`);

    // Configuration des headers selon l'API utilisée
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiSecret) {
      // Pour l'API La Poste Developer, l'authentification se fait souvent via headers
      headers["X-Okapi-Key"] = apiSecret;
      headers["Authorization"] = `Bearer ${apiSecret}`;
    }

    // Appel à l'API Colissimo ou La Poste pour obtenir le token
    const colissimoResponse = await fetch(`${baseUrl}${authEndpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(authPayload),
    });

    if (!colissimoResponse.ok) {
      const errorText = await colissimoResponse.text();
      console.error(
        `Colissimo API error: ${colissimoResponse.status} ${colissimoResponse.statusText}`
      );
      console.error(`Response body: ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `Colissimo API error: ${colissimoResponse.status}`,
          details: colissimoResponse.statusText,
          responseBody: errorText,
        }),
        {
          status: colissimoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData: ColissimoTokenResponse = await colissimoResponse.json();

    if (!tokenData.token) {
      console.error("No token received from Colissimo:", tokenData);
      return new Response(
        JSON.stringify({
          error: "No token received from Colissimo",
          colissimoError: tokenData.errorLabel || "Unknown error",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Colissimo token generated successfully");

    return new Response(
      JSON.stringify({
        token: tokenData.token,
        expiresIn: 30 * 60, // 30 minutes en secondes
        testMode,
        sandboxMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating Colissimo token:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
