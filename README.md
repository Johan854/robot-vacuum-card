# Robot Vacuum Card (FR)

Carte Home Assistant pour robot aspirateur, testée avec un **Ecovacs DEEBOT N20 COMBO** (intégration Ecovacs). Ta **photo du robot** en tête de carte, l'état et la batterie, puis quatre onglets :

- **Contrôle** : Départ / Pause / Reprendre, retour à la base, localiser, puissance d'aspiration, débit d'eau, dernier ménage (surface, durée) ;
- **Carte** : le plan du logement fourni par l'intégration (mis à jour pendant le ménage, touche pour l'agrandir) ;
- **Pièces** : choisis une ou plusieurs pièces, 1 ou 2 passages, puis « Nettoyer » ;
- **Entretien** : usure des consommables (brosses, filtre…) avec remise à neuf, actions de la station (vider le bac…), statistiques totales.

Style verre, thème clair/sombre automatique, nuance de couleur commune, éditeur visuel, textes en français. Les actions sensibles (remise à neuf, station) demandent une confirmation (second appui).

## Installation (HACS)
1. HACS → ⋮ → *Dépôts personnalisés* → `https://github.com/Johan854/robot-vacuum-card`, catégorie **Tableau de bord**.
2. Installer, puis recharger le navigateur.

## Exemple
```yaml
type: custom:robot-vacuum-card
entity: vacuum.r2d2
image: /local/robot/r2d2.jpg   # ta photo (dossier /config/www/robot/)
image_height: 150
image_position: center          # center, top ou bottom
default_tab: controle           # controle, carte, pieces ou entretien
room_names:                     # facultatif : renommer les pièces
  living_room: Salon
  bedroom: Chambre des enfants
```

Seul `entity` est obligatoire. La carte trouve seule les autres entités du même appareil : image de la carte, batterie, dernier ménage, statistiques, consommables et leurs boutons de remise à zéro, débit d'eau, actions de la station, erreur. Si la détection se trompe pour la carte, renseigne `map_entity`.

Un onglet n'apparaît que si les entités correspondantes existent (pas de carte → pas d'onglet Carte). Certaines entités Ecovacs sont **désactivées par défaut** (remise à zéro des consommables, erreur) : active-les dans Paramètres → Entités pour les voir sur la carte.

### Ménage par pièce
Les pièces viennent de l'attribut `rooms` de l'aspirateur (noms définis dans l'appli Ecovacs). Le bouton « Nettoyer » envoie :
```yaml
action: vacuum.send_command
data:
  entity_id: vacuum.r2d2
  command: spot_area
  params: { rooms: "0,2", cleanings: 1 }
```

## Apparence : nuance de couleur

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème `carte-nuance: "#2f8fd8"`.

## Historique des versions

- **1.0.0** : première version (photo, état, batterie, onglets Contrôle, Carte, Pièces, Entretien).
