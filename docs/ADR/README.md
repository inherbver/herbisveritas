# Architecture Decision Records (ADR)

## Vue d'ensemble

Ce dossier contient les Architecture Decision Records (ADR) du projet HerbisVeritas, documentant les décisions architecturales importantes prises lors du refactoring des phases 1-3.

## Format des ADR

Chaque ADR suit la structure standardisée suivante :

- **Statut** : Proposé | Accepté | Déprécié | Remplacé
- **Date** : Date de la décision
- **Décideurs** : Équipe technique
- **Contexte** : Situation qui nécessite une décision
- **Décision** : Ce qui a été décidé
- **Conséquences** : Résultats de cette décision

## Index des ADR

| N° | Titre | Statut | Date | Phase |
|----|-------|--------|------|-------|
| [001](./ADR-001-cart-architecture-consolidation.md) | Consolidation Architecture Cart | Accepté | 2025-08-16 | Phase 1 |
| [002](./ADR-002-result-pattern-migration.md) | Migration vers Result Pattern | Accepté | 2025-08-16 | Phase 1 |
| [003](./ADR-003-database-performance-strategy.md) | Stratégie Performance Base de Données | Accepté | 2025-08-16 | Phase 2 |
| [004](./ADR-004-security-rate-limiting.md) | Sécurisation Rate Limiting Universelle | Accepté | 2025-08-16 | Phase 3 |
| [005](./ADR-005-component-architecture-simplification.md) | Simplification Architecture Composants | Accepté | 2025-08-16 | Phase 1 |

## Utilisation

Les ADR servent de référence pour :

1. **Compréhension historique** des décisions architecturales
2. **Onboarding** des nouveaux développeurs
3. **Justification** des choix techniques
4. **Base de réflexion** pour les évolutions futures

## Création d'un nouvel ADR

1. Copier le template `ADR-000-template.md`
2. Numéroter séquentiellement (prochain : 006)
3. Compléter toutes les sections
4. Faire relire par l'équipe technique
5. Mettre à jour cet index

## Maintenance

Les ADR sont des documents vivants qui doivent être :

- **Consultés** avant toute décision architecturale majeure
- **Mis à jour** si le contexte change
- **Dépréciés** si la décision devient obsolète
- **Remplacés** par un nouvel ADR si nécessaire