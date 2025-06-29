export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

// Ceci est une implémentation factice. Remplacez-la par votre vrai fournisseur de messagerie (Resend, SendGrid, etc.)
export async function sendEmail(payload: EmailPayload): Promise<void> {
  console.log("--- ENVOI D'EMAIL (MOCK) ---");
  console.log(`Destinataire: ${payload.to}`);
  console.log(`Sujet: ${payload.subject}`);
  console.log("--------------------------");
  // Dans une vraie application, vous appelleriez votre API de messagerie ici.
  // Exemple: await resend.emails.send({ from: '...', to: payload.to, ... });
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simule une latence réseau
  console.log("Email envoyé (simulation).");
}
