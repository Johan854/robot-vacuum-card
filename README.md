# Robot Vacuum Card (FR)

Carte Home Assistant pour robot aspirateur, testée avec un **Ecovacs DEEBOT N20 COMBO** (intégration Ecovacs). Ta **photo du robot** en tête de carte, l'état et la batterie, puis quatre onglets :

- **Contrôle** : Départ / Pause / Reprendre, retour à la base, localiser, puissance d'aspiration, débit d'eau, options (boost tapis, nettoyage en continu, sécurité enfant, repositionner…), dernier ménage (surface, durée) ;
- **Carte** : le plan du logement fourni par l'intégration (mis à jour pendant le ménage, touche pour l'agrandir) ;
- **Pièces** : choisis une ou plusieurs pièces, 1 ou 2 passages, puis « Nettoyer » ;
- **Entretien** : usure des consommables (brosses, filtre, serpillière…) avec remise à neuf, état de la station, fréquence de vidage automatique, vider le bac, statistiques totales.

Un badge « Serpillière » s'affiche quand la serpillière est fixée.

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
room_names:                     # facultatif : renommer les pièces (par numéro de zone)
  "0": Salon
  "1": Cuisine
```

Seul `entity` est obligatoire. La carte trouve seule les autres entités du même appareil : image de la carte, batterie, dernier ménage, statistiques, consommables et leurs boutons de remise à zéro, débit d'eau, actions de la station, erreur. Si la détection se trompe pour la carte, renseigne `map_entity`.

Un onglet n'apparaît que si les entités correspondantes existent (pas de carte → pas d'onglet Carte). Certaines entités Ecovacs sont **désactivées par défaut** (remise à zéro des consommables, erreur) : active-les dans Paramètres → Entités pour les voir sur la carte.

### Ménage par pièce
Les pièces viennent de l'attribut `rooms` de l'aspirateur. La carte affiche une puce par zone : si les pièces n'ont pas de nom dans l'appli Ecovacs, elles apparaissent en « Pièce 1 », « Pièce 2 »… Nomme-les dans l'appli Ecovacs, ou dans la carte avec `room_names` (clé = numéro de zone, visible dans l'attribut `rooms`). Le bouton « Nettoyer » envoie :
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

- **1.1.0** : une puce par zone pour les pièces sans nom, options (interrupteurs du robot, repositionner), badge serpillière, état de la station et fréquence de vidage automatique, détection renforcée des entités en français.
- **1.0.0** : première version (photo, état, batterie, onglets Contrôle, Carte, Pièces, Entretien).
