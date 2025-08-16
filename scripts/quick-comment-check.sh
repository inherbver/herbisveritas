#!/bin/bash
# Script d'analyse rapide des commentaires pour HerbisVeritas
# Usage: ./scripts/quick-comment-check.sh [--summary|--detailed|--files]

set -e

# Configuration
SRC_DIR="./src"
TEMP_DIR="./temp-audit"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Créer le dossier temporaire
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}🔍 Analyse rapide des commentaires HerbisVeritas${NC}\n"

# Fonction pour compter les lignes et commentaires
count_stats() {
    echo -e "${BLUE}📊 STATISTIQUES GÉNÉRALES${NC}"
    echo "=================================================="
    
    # Compter les fichiers
    TOTAL_FILES=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | wc -l)
    echo "📁 Fichiers TypeScript/React: $TOTAL_FILES"
    
    # Compter les lignes totales
    TOTAL_LINES=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 | awk '{print $1}')
    echo "📝 Lignes de code totales: $TOTAL_LINES"
    
    # Compter les commentaires
    SINGLE_LINE_COMMENTS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -h "^\s*//" | wc -l)
    MULTI_LINE_COMMENTS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -h "^\s*/\*" | wc -l)
    JSDOC_COMMENTS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -h "^\s*/\*\*" | wc -l)
    
    TOTAL_COMMENTS=$((SINGLE_LINE_COMMENTS + MULTI_LINE_COMMENTS))
    
    echo "💬 Commentaires simples (//): $SINGLE_LINE_COMMENTS"
    echo "📝 Commentaires multi-lignes (/* */): $MULTI_LINE_COMMENTS"
    echo "📚 Commentaires JSDoc (/** */): $JSDOC_COMMENTS"
    echo "🔢 Total commentaires: $TOTAL_COMMENTS"
    
    # Calculer la densité
    if [ "$TOTAL_LINES" -gt 0 ]; then
        DENSITY=$(echo "scale=2; ($TOTAL_COMMENTS * 100) / $TOTAL_LINES" | bc)
        echo "📊 Densité de commentaires: ${DENSITY}%"
    fi
    
    echo ""
}

# Fonction pour détecter les commentaires évidents
detect_obvious_comments() {
    echo -e "${YELLOW}🚨 COMMENTAIRES ÉVIDENTS DÉTECTÉS${NC}"
    echo "=================================================="
    
    # Créer un fichier temporaire avec tous les commentaires
    find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -n -h "^\s*//.*" > "$TEMP_DIR/all_comments.txt" 2>/dev/null || echo "" > "$TEMP_DIR/all_comments.txt"
    
    # Patterns de commentaires évidents
    OBVIOUS_PATTERNS=(
        "Set\s\+\w\+"
        "Get\s\+\w\+"
        "Create\s\+\w\+"
        "Initialize\s\+\w\+"
        "Call\s\+\w\+"
        "TODO:\s*$"
        "FIXME:\s*$"
        "HACK:"
        "^\s*//\s*$"
    )
    
    OBVIOUS_COUNT=0
    
    for pattern in "${OBVIOUS_PATTERNS[@]}"; do
        matches=$(grep -i "$pattern" "$TEMP_DIR/all_comments.txt" | wc -l)
        if [ "$matches" -gt 0 ]; then
            echo -e "${RED}❌ Pattern '$pattern': $matches occurrences${NC}"
            OBVIOUS_COUNT=$((OBVIOUS_COUNT + matches))
            
            # Afficher quelques exemples
            echo "   Exemples:"
            grep -i "$pattern" "$TEMP_DIR/all_comments.txt" | head -3 | sed 's/^/   📄 /'
            echo ""
        fi
    done
    
    echo "🔢 Total commentaires évidents: $OBVIOUS_COUNT"
    
    if [ "$OBVIOUS_COUNT" -gt 0 ]; then
        PERCENTAGE=$(echo "scale=1; ($OBVIOUS_COUNT * 100) / $TOTAL_COMMENTS" | bc 2>/dev/null || echo "0")
        echo "📊 Pourcentage du total: ${PERCENTAGE}%"
    fi
    
    echo ""
}

# Fonction pour vérifier les JSDoc manquantes
check_missing_jsdoc() {
    echo -e "${BLUE}📝 VÉRIFICATION JSDOC${NC}"
    echo "=================================================="
    
    # Compter les fonctions exportées
    EXPORTED_FUNCTIONS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -h "^export.*function\|^export.*Action\|^async function" | wc -l)
    echo "🔧 Fonctions exportées trouvées: $EXPORTED_FUNCTIONS"
    
    # Chercher les Server Actions
    SERVER_ACTIONS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -h "Action(" | wc -l)
    echo "⚙️  Server Actions trouvées: $SERVER_ACTIONS"
    
    # Chercher les fonctions sans JSDoc (approximatif)
    echo "🔍 Vérification des JSDoc manquantes..."
    
    find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | while read file; do
        # Rechercher les fonctions exportées sans JSDoc précédente
        grep -n "^export.*function\|^export.*Action\|^async function" "$file" | while IFS=: read -r line_num line_content; do
            # Vérifier s'il y a une JSDoc dans les 3 lignes précédentes
            start_line=$((line_num - 3))
            if [ "$start_line" -lt 1 ]; then
                start_line=1
            fi
            
            has_jsdoc=$(sed -n "${start_line},${line_num}p" "$file" | grep -c "/\*\*" || echo 0)
            
            if [ "$has_jsdoc" -eq 0 ]; then
                echo "❌ $file:$line_num - $(echo "$line_content" | cut -c1-60)..."
            fi
        done
    done | head -20
    
    echo ""
}

# Fonction pour analyser les TODO/FIXME
analyze_todos() {
    echo -e "${YELLOW}📋 ANALYSE TODO/FIXME${NC}"
    echo "=================================================="
    
    # Compter les TODOs
    TODO_COUNT=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -i "TODO" | wc -l)
    FIXME_COUNT=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -i "FIXME" | wc -l)
    HACK_COUNT=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -i "HACK" | wc -l)
    
    echo "📝 TODOs trouvés: $TODO_COUNT"
    echo "🔧 FIXMEs trouvés: $FIXME_COUNT"
    echo "⚠️  HACKs trouvés: $HACK_COUNT"
    
    # TODOs vides (sans description)
    EMPTY_TODOS=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -i "TODO:\s*$" | wc -l)
    EMPTY_FIXMES=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -i "FIXME:\s*$" | wc -l)
    
    echo "❌ TODOs vides (sans description): $EMPTY_TODOS"
    echo "❌ FIXMEs vides (sans description): $EMPTY_FIXMES"
    
    if [ "$TODO_COUNT" -gt 0 ]; then
        echo ""
        echo "📋 Exemples de TODOs:"
        find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -n -i "TODO" | head -5 | sed 's/^/   /'
    fi
    
    echo ""
}

# Fonction pour générer des recommandations
generate_recommendations() {
    echo -e "${GREEN}💡 RECOMMANDATIONS${NC}"
    echo "=================================================="
    
    # Calculer l'effort estimé
    OBVIOUS_TIME_MIN=$((OBVIOUS_COUNT * 2))  # 2 min par commentaire évident
    JSDOC_TIME_MIN=$((SERVER_ACTIONS * 5))   # 5 min par Server Action pour JSDoc
    TODO_TIME_MIN=$((EMPTY_TODOS * 1))       # 1 min par TODO vide
    
    TOTAL_TIME_MIN=$((OBVIOUS_TIME_MIN + JSDOC_TIME_MIN + TODO_TIME_MIN))
    TOTAL_TIME_HOURS=$((TOTAL_TIME_MIN / 60))
    REMAINING_MIN=$((TOTAL_TIME_MIN % 60))
    
    echo "🎯 Actions prioritaires:"
    
    if [ "$OBVIOUS_COUNT" -gt 0 ]; then
        echo "   1. Supprimer $OBVIOUS_COUNT commentaires évidents (~${OBVIOUS_TIME_MIN}min)"
    fi
    
    if [ "$EMPTY_TODOS" -gt 0 ]; then
        echo "   2. Compléter ou supprimer $EMPTY_TODOS TODOs vides (~${TODO_TIME_MIN}min)"
    fi
    
    if [ "$SERVER_ACTIONS" -gt 0 ]; then
        echo "   3. Ajouter JSDoc à $SERVER_ACTIONS Server Actions (~${JSDOC_TIME_MIN}min)"
    fi
    
    echo ""
    echo "⏱️  Temps total estimé: ${TOTAL_TIME_HOURS}h ${REMAINING_MIN}min"
    echo "🎯 Objectif: Réduire de 40% les commentaires évidents"
    echo "📊 Cible qualité: Couverture JSDoc > 90% pour les Server Actions"
    
    echo ""
    echo "🔧 Commandes suggérées:"
    echo "   • Audit complet: node scripts/comment-audit.js --report=html"
    echo "   • Correction auto: node scripts/comment-audit.js --fix"
    echo "   • Validation ESLint: npm run lint"
    
    echo ""
}

# Fonction pour créer un rapport de fichiers problématiques
generate_file_report() {
    echo -e "${BLUE}📄 FICHIERS NÉCESSITANT ATTENTION${NC}"
    echo "=================================================="
    
    find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | while read file; do
        obvious_in_file=$(grep -c "Set \|Get \|Create \|Initialize \|TODO:\s*$\|FIXME:\s*$" "$file" 2>/dev/null || echo 0)
        functions_in_file=$(grep -c "^export.*function\|Action(" "$file" 2>/dev/null || echo 0)
        jsdoc_in_file=$(grep -c "/\*\*" "$file" 2>/dev/null || echo 0)
        
        # Score problématique (plus c'est haut, plus c'est problématique)
        problem_score=$((obvious_in_file * 2 + functions_in_file - jsdoc_in_file))
        
        if [ "$problem_score" -gt 3 ]; then
            echo "⚠️  $file"
            echo "   📊 Score problème: $problem_score"
            echo "   ❌ Commentaires évidents: $obvious_in_file"
            echo "   🔧 Fonctions: $functions_in_file"
            echo "   📝 JSDoc: $jsdoc_in_file"
            echo ""
        fi
    done | head -20
}

# Parse des arguments
case "${1:-summary}" in
    --summary|summary)
        count_stats
        detect_obvious_comments
        generate_recommendations
        ;;
    --detailed|detailed)
        count_stats
        detect_obvious_comments
        check_missing_jsdoc
        analyze_todos
        generate_recommendations
        ;;
    --files|files)
        generate_file_report
        ;;
    --help|help)
        echo "Usage: $0 [--summary|--detailed|--files|--help]"
        echo ""
        echo "Options:"
        echo "  --summary    Analyse rapide avec statistiques de base"
        echo "  --detailed   Analyse complète avec vérifications JSDoc"
        echo "  --files      Liste des fichiers nécessitant le plus d'attention"
        echo "  --help       Affiche cette aide"
        echo ""
        ;;
    *)
        echo "Option inconnue: $1"
        echo "Utilisez --help pour voir les options disponibles"
        exit 1
        ;;
esac

# Nettoyage
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Analyse terminée${NC}"
echo ""
echo "💡 Pour une analyse plus détaillée:"
echo "   node scripts/comment-audit.js --report=html"