# Test Manuel de la Gestion des Erreurs de Formulaires

Ce document décrit les tests manuels à effectuer pour vérifier la gestion des erreurs dans les formulaires de l'application.

## 1. Formulaire de Connexion (`/fr/login`)

### Test 1.1: Identifiants invalides

1. Aller sur `/fr/login`
2. Entrer l'email: `test@example.com`
3. Entrer le mot de passe: `wrongpassword`
4. Cliquer sur "Se connecter"
5. **Résultat attendu**: Message d'erreur "Email ou mot de passe incorrect" sous le champ mot de passe

### Test 1.2: Format d'email invalide

1. Aller sur `/fr/login`
2. Entrer l'email: `invalid-email`
3. Entrer le mot de passe: `password123`
4. Cliquer sur "Se connecter"
5. **Résultat attendu**: Message d'erreur "Adresse email invalide" sous le champ email

### Test 1.3: Champs vides

1. Aller sur `/fr/login`
2. Ne pas remplir les champs
3. Cliquer sur "Se connecter"
4. **Résultat attendu**:
   - "L'email est requis" sous le champ email
   - "Le mot de passe est requis" sous le champ mot de passe

### Test 1.4: Email non confirmé

1. Utiliser un compte avec email non confirmé
2. Entrer les identifiants corrects
3. **Résultat attendu**:
   - Message "Email non confirmé. Veuillez vérifier votre boîte de réception."
   - Bouton "Renvoyer l'email de confirmation" visible

## 2. Formulaire d'Inscription (`/fr/register`)

### Test 2.1: Mot de passe faible

1. Aller sur `/fr/register`
2. Entrer l'email: `newuser@example.com`
3. Entrer le mot de passe: `weak`
4. **Résultat attendu**: Les indicateurs de force du mot de passe affichent:
   - ❌ Au moins 8 caractères
   - ❌ Au moins une majuscule
   - ❌ Au moins un chiffre
   - ❌ Au moins un caractère spécial
   - Force: "Très faible"

### Test 2.2: Mots de passe non correspondants

1. Entrer l'email: `newuser@example.com`
2. Entrer le mot de passe: `ValidPassword123!`
3. Entrer la confirmation: `DifferentPassword123!`
4. Soumettre le formulaire
5. **Résultat attendu**: "Les mots de passe ne correspondent pas" sous le champ de confirmation

### Test 2.3: Email déjà existant

1. Entrer l'email: `inherbver@gmail.com`
2. Entrer un mot de passe valide dans les deux champs
3. Soumettre le formulaire
4. **Résultat attendu**: "Un compte existe déjà avec cet email"

## 3. Formulaire de Modification du Profil (`/fr/profile/account/edit`)

### Test 3.1: Modification réussie

1. Se connecter avec `inherbver@gmail.com` / `Admin123!`
2. Aller sur `/fr/profile/account/edit`
3. Modifier le prénom
4. Cliquer sur "Enregistrer les Modifications"
5. **Résultat attendu**:
   - Message de succès "Profile updated successfully!"
   - Toast de succès visible

### Test 3.2: Champ requis vide

1. Dans le formulaire de modification
2. Vider le champ "Prénom"
3. Soumettre le formulaire
4. **Résultat attendu**: "Ce champ est requis" sous le champ prénom

## 4. Formulaire de Changement de Mot de Passe (`/fr/profile/password`)

### Test 4.1: Mot de passe actuel incorrect

1. Se connecter et aller sur `/fr/profile/password`
2. Entrer un mot de passe actuel incorrect
3. Entrer un nouveau mot de passe valide
4. Soumettre le formulaire
5. **Résultat attendu**: "Le mot de passe actuel est incorrect" sous le premier champ

### Test 4.2: Indicateurs de force du mot de passe

1. Dans le champ "Nouveau mot de passe"
2. Taper progressivement:
   - `weak` → Force: Très faible (0/4 critères)
   - `weaklong` → Force: Faible (1/4 critères - longueur)
   - `Weaklong` → Force: Moyen (2/4 critères - longueur + majuscule)
   - `Weaklong1` → Force: Fort (3/4 critères)
   - `Weaklong1!` → Force: Très fort (4/4 critères)

### Test 4.3: Mots de passe non correspondants

1. Entrer le mot de passe actuel correct
2. Entrer un nouveau mot de passe valide
3. Entrer une confirmation différente
4. Soumettre le formulaire
5. **Résultat attendu**: "Les mots de passe ne correspondent pas"

## 5. Notifications Toast

### Test 5.1: Toast d'erreur

- Les erreurs serveur doivent afficher un toast rouge avec le message d'erreur
- Le toast doit disparaître automatiquement après quelques secondes

### Test 5.2: Toast de succès

- Les actions réussies doivent afficher un toast vert
- Ex: "Profile updated successfully!" après modification du profil

## Résumé de l'Architecture de Gestion des Erreurs

### Architecture Implémentée

1. **Hook Centralisé `useAuthForm`**
   - Gère la validation côté client avec React Hook Form
   - Intègre les schémas Zod avec i18n
   - Affiche les erreurs serveur automatiquement
   - Gère les états de chargement

2. **Classe `AuthErrorHandler`**
   - Mappe les erreurs Supabase vers des messages utilisateur
   - Gère les contextes d'erreur spécifiques
   - Retourne des `FormActionResult` cohérents

3. **Type `FormActionResult<T>`**
   - Structure unifiée pour toutes les réponses d'actions
   - Support des erreurs par champ et générales
   - Données typées pour les cas spéciaux

4. **Traductions i18n**
   - Fichier `errors.json` avec toutes les traductions
   - Messages cohérents dans toute l'application
   - Support multilingue

### Points Clés Testés

- ✅ Validation côté client en temps réel
- ✅ Messages d'erreur traduits et contextuels
- ✅ Gestion des erreurs serveur (Supabase)
- ✅ Indicateurs visuels de validation
- ✅ Notifications toast pour les actions
- ✅ États de chargement pendant les soumissions
- ✅ Boutons d'action contextuels (ex: renvoyer email)
