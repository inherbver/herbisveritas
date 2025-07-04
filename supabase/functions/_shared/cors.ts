// supabase/functions/_shared/cors.ts

// Headers CORS partagés pour autoriser les requêtes depuis le navigateur.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Pour le développement. En production, vous devriez restreindre à votre domaine.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
