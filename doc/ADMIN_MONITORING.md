# ⚠️ DOCUMENTATION OBSOLÈTE

**Ce fichier a été remplacé par :** [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md)

**Raison :** Le système de surveillance admin a été intégré dans le nouveau système de gestion des rôles unifié. Les fonctionnalités décrites ici sont maintenant implémentées et opérationnelles.

**Nouvelles fonctionnalités disponibles :**

- ✅ Script d'audit automatisé (`npm run audit-roles`)
- ✅ Monitoring temps réel via `/admin/security-test`
- ✅ Logs de sécurité centralisés dans `audit_logs`
- ✅ Alertes automatiques pour admins non autorisés

**Veuillez consulter :** [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md) section "Monitoring et Surveillance"

---

# ~~Stratégie de Surveillance Administrative Temps Réel~~ [OBSOLÈTE]

~~Ce document décrit l'architecture et la feuille de route pour l'implémentation d'un système de surveillance des rôles administrateur en temps réel.~~

## Phase 1 : API de Base (Polling Périodique)

### 1.1 Route API Sécurisée

Création d'un endpoint `GET /api/admin/check-admins` qui, après avoir vérifié que l'appelant est un administrateur autorisé, retourne la liste des administrateurs non autorisés.

```typescript
// src/app/api/admin/check-admins/route.ts
import { NextResponse } from "next/server";
import { checkForUnauthorizedAdmins } from "@/lib/admin/monitoring-service";
import { checkUserPermission } from "@/lib/auth/server-auth"; // Utilisation de la fonction existante

export async function GET(request: Request) {
  try {
    // Vérification d'accès admin
    const adminCheck = await checkUserPermission("admin:access");
    if (!adminCheck.isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const unauthorizedAdmins = await checkForUnauthorizedAdmins();

    return NextResponse.json({
      success: true,
      threats: unauthorizedAdmins,
      timestamp: new Date().toISOString(),
      admin_id: adminCheck.user?.id,
    });
  } catch (error) {
    console.error("Erreur API check-admins:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
```

### 1.2 Hook React Périodique

Un hook `useAdminMonitoring` qui appelle l'API à intervalle régulier (ex: 2 minutes) pour rafraîchir l'état des menaces.

```typescript
// src/hooks/use-admin-monitoring.ts
// ... (code fourni par l'utilisateur)
```

## Phase 2 : Amélioration Temps Réel (V2)

### 2.1 Migration vers une Surveillance via Audit Log

Étant donné que le rôle de l'utilisateur est stocké dans les `app_metadata` du JWT et géré via l'API GoTrue de Supabase, la surveillance des changements sur la table `profiles` n'est pas une méthode fiable pour détecter les promotions de rôle.

Une architecture plus robuste consisterait à :

1.  **Créer une table d'audit** (`admin_audit_log`) où toute action administrative (y compris la modification de rôle via une fonction serveur sécurisée) est enregistrée.
2.  **Utiliser Supabase Realtime** pour s'abonner aux `INSERT` sur cette nouvelle table `admin_audit_log`.
3.  Lorsqu'un nouvel événement est détecté, le client peut alors déclencher une nouvelle vérification de sécurité.

Cette approche est plus sécurisée et découplée de la table `profiles`.

```typescript
// src/hooks/use-admin-monitoring-realtime.ts
// ... (code fourni par l'utilisateur)
```

### 2.2 Composant avec Indicateur Temps Réel

Ajout d'un indicateur visuel dans l'UI pour montrer si la connexion temps réel est active.

```typescript
// Indicateur de connexion temps réel
function RealtimeIndicator({ isConnected }: { isConnected: boolean }) {
  // ... (code fourni par l'utilisateur)
}
```

## Phase 3 : Optimisations Avancées (V3)

### 3.1 Cache et Performance

Mise en place d'un cache côté serveur pour la fonction `checkForUnauthorizedAdmins` afin d'éviter des appels redondants à la base de données lors de requêtes très rapprochées.

### 3.2 Alertes Progressives

Développement d'un système d'escalade des alertes dans l'UI en fonction du nombre de menaces détectées (ex: warning pour 1 menace, critical pour plusieurs).

## Avantages du Temps Réel

- **Détection instantanée** des menaces.
- **Réduction de la charge serveur** (pas de polling constant).
- **Meilleure expérience utilisateur** pour l'administrateur.
- **Alertes plus fiables** et immédiates.
