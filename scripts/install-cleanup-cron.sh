#!/bin/bash

# Script d'installation du cron job pour le nettoyage automatique des paniers invités
# Usage: ./scripts/install-cleanup-cron.sh

set -e

echo "🔧 Installation du cron job de nettoyage automatique des paniers invités"
echo "=================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Obtenir le chemin absolu du projet
PROJECT_PATH=$(pwd)
SCRIPT_PATH="$PROJECT_PATH/scripts/schedule-cleanup.ts"

# Vérifier que le script existe
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Erreur: Le script schedule-cleanup.ts n'existe pas"
    exit 1
fi

# Vérifier que tsx est installé
if ! command -v tsx &> /dev/null; then
    echo "❌ Erreur: tsx n'est pas installé. Installez-le avec: npm install -g tsx"
    exit 1
fi

# Configuration du cron job
CRON_SCHEDULE="0 2 * * *"  # Tous les jours à 2h du matin
CRON_USER=$(whoami)
LOG_PATH="$PROJECT_PATH/logs/cleanup-cron.log"

# Créer le répertoire de logs s'il n'existe pas
mkdir -p "$PROJECT_PATH/logs"

# Créer la ligne de cron
CRON_COMMAND="cd $PROJECT_PATH && tsx $SCRIPT_PATH >> $LOG_PATH 2>&1"
CRON_LINE="$CRON_SCHEDULE $CRON_COMMAND"

echo "📋 Configuration du cron job:"
echo "   Planification: $CRON_SCHEDULE (tous les jours à 2h)"
echo "   Utilisateur: $CRON_USER"
echo "   Script: $SCRIPT_PATH"
echo "   Logs: $LOG_PATH"
echo ""

# Demander confirmation
read -p "🤔 Voulez-vous installer ce cron job ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation annulée"
    exit 0
fi

# Sauvegarder le cron actuel
echo "💾 Sauvegarde du crontab actuel..."
crontab -l > "$PROJECT_PATH/crontab.backup" 2>/dev/null || true

# Vérifier si la ligne existe déjà
if crontab -l 2>/dev/null | grep -q "schedule-cleanup.ts"; then
    echo "⚠️  Un cron job pour schedule-cleanup.ts existe déjà"
    read -p "🤔 Voulez-vous le remplacer ? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Supprimer l'ancienne ligne
        crontab -l 2>/dev/null | grep -v "schedule-cleanup.ts" | crontab -
        echo "🗑️  Ancien cron job supprimé"
    else
        echo "❌ Installation annulée"
        exit 0
    fi
fi

# Ajouter la nouvelle ligne
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo "✅ Cron job installé avec succès !"
echo ""
echo "📊 Vérification:"
crontab -l | grep "schedule-cleanup.ts" || echo "❌ Erreur: le cron job n'a pas été trouvé"

echo ""
echo "🛠️  Commandes utiles:"
echo "   Voir tous les cron jobs: crontab -l"
echo "   Éditer les cron jobs: crontab -e"
echo "   Supprimer ce cron job: crontab -l | grep -v 'schedule-cleanup.ts' | crontab -"
echo "   Voir les logs: tail -f $LOG_PATH"
echo "   Test manuel: tsx $SCRIPT_PATH"

echo ""
echo "📝 Variables d'environnement configurables:"
echo "   CLEANUP_MAX_AGE_HOURS=336    # 14 jours par défaut"
echo "   CLEANUP_BATCH_SIZE=100       # Taille des batches"
echo "   CLEANUP_DRY_RUN=false        # Mode simulation"

echo ""
echo "🎉 Installation terminée ! Le nettoyage s'exécutera automatiquement tous les jours à 2h."