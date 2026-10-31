{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Robot Vacuum Card (FR)
 * Carte Home Assistant pour robot aspirateur (testée avec Ecovacs / Deebot) : photo personnelle en tête, état et batterie,
 * onglets Contrôle (départ, pause, base, puissance, débit d'eau, dernier ménage), Carte (plan fourni par l'intégration),
 * Pièces (ménage pièce par pièce) et Entretien (usure des consommables, remise à zéro, statistiques, station).
 * Les entités du robot sont détectées automatiquement à partir de l'aspirateur choisi.
 * Style verre, thème clair/sombre automatique, nuance commune, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.1.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  title: "",
  theme: "auto", nuance: "theme", intensite: 1,
  entity: "",
  image: "",
  image_height: 150,
  image_position: "center",
  map_entity: "",
  default_tab: "controle",
  room_names: {},
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gone = (st) => !st || st.state === "unavailable" || st.state === "unknown" || st.state === "";
const fmt = (n, d = 0) => Number(n).toFixed(d).replace(".", ",");
const num = (st) => (gone(st) ? NaN : Number(st.state));

const STATES = {
  cleaning: ["En nettoyage", "run", "mdi:robot-vacuum"],
  returning: ["Retour à la base", "run", "mdi:home-import-outline"],
  docked: ["À la base", "ok", "mdi:home-battery-outline"],
  paused: ["En pause", "mid", "mdi:pause-circle-outline"],
  idle: ["Au repos", "ok", "mdi:robot-vacuum"],
  error: ["Erreur", "crit", "mdi:alert-circle-outline"],
  unavailable: ["Hors ligne", "na", "mdi:wifi-off"],
  unknown: ["Inconnu", "na", "mdi:help-circle-outline"],
};
const FAN = { quiet: "Silencieux", normal: "Normal", standard: "Normal", max: "Max", max_plus: "Max+", strong: "Fort", turbo: "Turbo", gentle: "Doux" };
const WATER = { low: "Faible", medium: "Moyen", high: "Élevé", ultrahigh: "Très élevé" };
const ROOMS = {
  living_room: "Salon", kitchen: "Cuisine", bedroom: "Chambre", bathroom: "Salle de bain", corridor: "Couloir", study: "Bureau",
  dining_room: "Salle à manger", balcony: "Balcon", laundry: "Buanderie", storeroom: "Cellier", sunroom: "Véranda", toilet: "Toilettes",
  children_room: "Chambre d'enfant", entrance: "Entrée", lounge: "Salon", default: "Pièce", master_bedroom: "Chambre parentale", guest_room: "Chambre d'amis",
};
const PARTS = { brush: "Brosse principale", side_brush: "Brosse latérale", filter: "Filtre", unit_care: "Entretien général", round_mop: "Serpillières", dust_bag: "Sac à poussière", cleaning_fluid: "Liquide de nettoyage", blade: "Lames", lens_brush: "Brosse de capteur", strainer: "Filtre à eau", hand_filter: "Filtre aspirateur à main" };
const STATION_STATE = { idle: "Au repos", emptying_dustbin: "Vidage du bac", washing_mop: "Lavage des serpillières", drying_mop: "Séchage des serpillières" };
const AUTO_EMPTY = { auto: "Automatique", smart: "Intelligent", off: "Désactivé" };
const STATION = { empty_dustbin: ["Vider le bac", "mdi:delete-empty-outline"], clean_base: ["Nettoyer la base", "mdi:water-sync"], dry_mop: ["Sécher les serpillières", "mdi:fan"], wash_mop: ["Laver les serpillières", "mdi:washing-machine"] };

const shortName = (st, dev) => { const f = (st && st.attributes && st.attributes.friendly_name) || ""; const t = f.startsWith(dev) ? f.slice(dev.length).replace(/^[\s:–-]+/, "") : f; return t.charAt(0).toUpperCase() + t.slice(1); };
const prettySlug = (s) => { const t = String(s).replace(/_/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const roomLabel = (slug, names) => (names && names[slug]) || ROOMS[slug.replace(/_\d+$/, "")] && (ROOMS[slug.replace(/_\d+$/, "")] + (slug.match(/_(\d+)$/) ? " " + slug.match(/_(\d+)$/)[1] : "")) || prettySlug(slug);
const durMin = (st) => {
  const v = num(st); if (!isFinite(v)) return NaN;
  const u = (st.attributes && st.attributes.unit_of_measurement) || "min";
  return u === "s" ? v / 60 : u === "h" ? v * 60 : u === "d" ? v * 1440 : v;
};
const durTxt = (m) => !isFinite(m) ? "—" : m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}` : `${fmt(m / 60, 0)} h`;

class RobotVacuumCard extends HTMLElement {
  static getConfigElement() { return document.createElement("robot-vacuum-card-editor"); }
  static getStubConfig(hass) {
    const id = hass && Object.keys(hass.states).find((e) => e.startsWith("vacuum."));
    return { entity: id || "" };
  }

  constructor() {
    super(); this.attachShadow({ mode: "open" });
    this._sig = ""; this._tab = null; this._sel = new Set(); this._passes = 1; this._confirm = null; this._done = null; this._eCache = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!this._tab) this._tab = this._config.default_tab || "controle";
    this._eCache = null; this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) this._sigCheck();
  }

  getCardSize() { return 6; }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _sigCheck(force) {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const e = this._ents();
    const ids = [c.entity, e.map, e.battery, e.area, e.time, e.totArea, e.totTime, e.totCount, e.water, e.error, e.mop, e.stationState, e.autoEmpty, ...e.switches, ...e.parts.map((p) => p.id), ...e.station.map((s) => s.id)];
    const v = h.states[c.entity];
    const sig = ids.map((i) => { const s = i && h.states[i]; return s ? s.state : "x"; }).join("|")
      + "|" + (v ? JSON.stringify([v.attributes.fan_speed, v.attributes.battery_level, v.attributes.rooms]) : "")
      + (this._isDark() ? "d" : "l") + this._tab + [...this._sel].join(",") + this._passes + (this._confirm || "") + (this._done || "");
    if (force || sig !== this._sig) { this._sig = sig; this._render(); }
  }

  /* Entités sœurs de l'aspirateur (même appareil), détectées par clé de traduction puis par nom. Cache d'une minute. */
  _ents() {
    const c = this._config, h = this._hass;
    const sc = this._eCache;
    if (sc && Date.now() - sc.at < 60000) return sc.val;
    const out = { map: "", battery: "", area: "", time: "", totArea: "", totTime: "", totCount: "", water: "", error: "", mop: "", stationState: "", autoEmpty: "", relocate: "", parts: [], station: [], switches: [] };
    const reg = (h && h.entities) || {};
    const dev = reg[c.entity] && reg[c.entity].device_id;
    const sib = dev ? Object.values(reg).filter((r) => r.device_id === dev && r.entity_id !== c.entity && !r.hidden) : [];
    const tk = (r) => String(r.translation_key || "");
    const dom = (r) => r.entity_id.split(".")[0];
    const find = (d, keys, rx) => {
      const byKey = sib.find((r) => dom(r) === d && keys.includes(tk(r)));
      if (byKey) return byKey.entity_id;
      const byId = rx && sib.find((r) => dom(r) === d && rx.test(r.entity_id));
      return byId ? byId.entity_id : "";
    };
    out.map = c.map_entity || find("image", ["map"], /map|carte/);
    out.battery = sib.filter((r) => dom(r) === "sensor").map((r) => r.entity_id).find((id) => h.states[id] && h.states[id].attributes.device_class === "battery") || "";
    out.area = find("sensor", ["stats_area"], /_area_cleaned$|surface_nettoyee$/);
    out.time = find("sensor", ["stats_time"], /_cleaning_duration$|duree_de_nettoyage$/);
    out.totArea = find("sensor", ["total_stats_area"], /total_area_cleaned|surface_totale/);
    out.totTime = find("sensor", ["total_stats_time"], /total_cleaning_duration|duree_totale/);
    out.totCount = find("sensor", ["total_stats_cleanings"], /total_cleanings|nombre_total/);
    out.water = find("select", ["water_amount", "water_info"], /water|debit/);
    out.error = find("sensor", ["error"], /_error$|_erreur$/);
    out.mop = find("binary_sensor", ["water_mop_attached", "mop_attached"], /mop|serpilliere/);
    out.stationState = find("sensor", ["station_state"], /station_state|etat_de_la_station/);
    out.autoEmpty = find("select", ["auto_empty", "auto_empty_frequency"], /auto_empty|vidage/);
    out.relocate = find("button", ["relocate"], /relocate|repositionner/);
    out.switches = sib.filter((r) => dom(r) === "switch" && r.entity_category !== "diagnostic").map((r) => r.entity_id);
    const resets = sib.filter((r) => dom(r) === "button" && /reset|reinitialis/.test(tk(r) + r.entity_id));
    sib.filter((r) => dom(r) === "sensor" && (tk(r).startsWith("lifespan") || /lifespan|duree_de_vie/.test(r.entity_id))).forEach((r) => {
      const key = tk(r).replace(/^lifespan_?/, "") || r.entity_id.replace(/^.*(lifespan|duree_de_vie)_?/, "");
      const rs = resets.find((b) => key && (tk(b).endsWith(key) || b.entity_id.endsWith(key)));
      out.parts.push({ id: r.entity_id, key, reset: rs ? rs.entity_id : "" });
    });
    sib.filter((r) => dom(r) === "button" && !resets.includes(r) && (tk(r).startsWith("station_action") || /station|vider|empty_dustbin/.test(r.entity_id))).forEach((r) => {
      out.station.push({ id: r.entity_id, key: tk(r).replace(/^station_action_?/, "") || r.entity_id.split(".")[1] });
    });
    this._eCache = { at: Date.now(), val: out };
    return out;
  }

  _call(domain, service, data) { return this._hass.callService(domain, service, data); }
  _more(id) { if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })); }

  _flash(kind, key, ms) {
    this[kind] = key; this._sigCheck(true);
    clearTimeout(this["_t" + kind]);
    this["_t" + kind] = setTimeout(() => { this[kind] = null; this._sigCheck(true); }, ms);
  }
  /* Actions sensibles : premier appui = « Confirmer ? », second appui = exécution. */
  _confirmed(key, fn) {
    if (this._confirm !== key) { this._flash("_confirm", key, 5000); return; }
    clearTimeout(this["_t_confirm"]); this._confirm = null;
    fn(); this._flash("_done", key, 3000);
  }

  _rooms() {
    const v = this._hass.states[this._config.entity];
    const r = (v && v.attributes && v.attributes.rooms) || {};
    const names = this._config.room_names || {};
    /* Une puce par zone : une pièce sans nom dans l'appli (« default ») regroupe plusieurs zones, on les sépare. */
    return Object.entries(r).flatMap(([slug, ids]) => {
      const list = Array.isArray(ids) ? ids : [ids];
      return list.map((rid, i) => ({ slug: String(rid), ids: [rid],
        label: names[String(rid)] || (list.length === 1 && names[slug]) || (slug === "default" ? `Pièce ${i + 1}` : roomLabel(slug, names) + (list.length > 1 ? ` ${i + 1}` : "")) }));
    }).sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  }

  _action(a, arg) {
    const c = this._config, id = c.entity;
    switch (a) {
      case "start": return this._call("vacuum", "start", { entity_id: id });
      case "pause": return this._call("vacuum", "pause", { entity_id: id });
      case "stop": return this._call("vacuum", "stop", { entity_id: id });
      case "base": return this._call("vacuum", "return_to_base", { entity_id: id });
      case "locate": this._flash("_done", "locate", 3000); return this._call("vacuum", "locate", { entity_id: id });
      case "fan": return this._call("vacuum", "set_fan_speed", { entity_id: id, fan_speed: arg });
      case "water": return this._call("select", "select_option", { entity_id: this._ents().water, option: arg });
      case "autoempty": return this._call("select", "select_option", { entity_id: this._ents().autoEmpty, option: arg });
      case "switch": return this._call("switch", "toggle", { entity_id: arg });
      case "relocate": this._flash("_done", "relocate", 3000); return this._call("button", "press", { entity_id: this._ents().relocate });
      case "room": this._sel.has(arg) ? this._sel.delete(arg) : this._sel.add(arg); return this._sigCheck(true);
      case "passes": this._passes = this._passes === 1 ? 2 : 1; return this._sigCheck(true);
      case "clean_rooms": {
        const ids = this._rooms().filter((r) => this._sel.has(r.slug)).flatMap((r) => r.ids);
        if (!ids.length) return;
        this._call("vacuum", "send_command", { entity_id: id, command: "spot_area", params: { rooms: ids.join(","), cleanings: this._passes } });
        this._sel.clear(); this._flash("_done", "clean_rooms", 3000); return;
      }
      case "reset": return this._confirmed("reset:" + arg, () => this._call("button", "press", { entity_id: arg }));
      case "station": return this._confirmed("station:" + arg, () => this._call("button", "press", { entity_id: arg }));
      case "tab": this._tab = arg; this._confirm = null; return this._sigCheck(true);
      default: return undefined;
    }
  }

  _batt() {
    const h = this._hass, v = h.states[this._config.entity], e = this._ents();
    const a = v && v.attributes && Number(v.attributes.battery_level);
    if (isFinite(a) && v.attributes.battery_level != null) return a;
    return num(h.states[e.battery]);
  }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const dark = this._isDark();
    const v = h.states[c.entity];
    const e = this._ents();
    const name = c.title || (v && v.attributes.friendly_name) || "Robot";
    const stKey = !c.entity ? "unknown" : gone(v) ? (v ? v.state || "unknown" : "unavailable") : v.state;
    const [stTxt, stLvl, stIcon] = STATES[stKey] || [prettySlug(stKey), "ok", "mdi:robot-vacuum"];
    const batt = this._batt();
    const charging = stKey === "docked" && isFinite(batt) && batt < 100;
    const bIcon = !isFinite(batt) ? "mdi:battery-unknown" : charging ? "mdi:battery-charging" : batt >= 95 ? "mdi:battery" : `mdi:battery-${Math.max(10, Math.round(batt / 10) * 10)}`;
    const bLvl = !isFinite(batt) ? "na" : batt > 40 ? "ok" : batt > 15 ? "mid" : "crit";
    const errSt = e.error && h.states[e.error];
    const mopOn = e.mop && h.states[e.mop] && h.states[e.mop].state === "on";
    const errTxt = errSt && !gone(errSt) && !/^(0|no_error|none|ok|aucune.*)$/i.test(errSt.state) ? errSt.state : "";

    const tabs = [["controle", "Contrôle", "mdi:gamepad-round-outline"]];
    if (e.map) tabs.push(["carte", "Carte", "mdi:map-outline"]);
    if (this._rooms().length) tabs.push(["pieces", "Pièces", "mdi:floor-plan"]);
    if (e.parts.length || e.totArea || e.station.length) tabs.push(["entretien", "Entretien", "mdi:wrench-outline"]);
    if (!tabs.find((t) => t[0] === this._tab)) this._tab = "controle";

    const btn = (a, label, icon, cls = "", arg = "") => `<button class="act ${cls}" data-a="${a}" data-arg="${esc(arg)}"><ha-icon icon="${icon}"></ha-icon><span>${label}</span></button>`;
    const chip = (a, arg, label, on) => `<button class="chip ${on ? "on" : ""}" data-a="${a}" data-arg="${esc(arg)}">${esc(label)}</button>`;
    const stat = (id, label, val, icon) => id ? `<button class="stat glass" data-more="${esc(id)}"><ha-icon icon="${icon}"></ha-icon><div><div class="sv">${val}</div><div class="sl">${label}</div></div></button>` : "";

    let body = "";
    if (!c.entity) body = `<div class="empty">Choisis ton robot aspirateur dans l'éditeur.</div>`;
    else if (this._tab === "controle") {
      const running = stKey === "cleaning" || stKey === "returning";
      const main = running ? btn("pause", "Pause", "mdi:pause", "big") : btn("start", stKey === "paused" ? "Reprendre" : "Départ", "mdi:play", "big");
      const fans = (v && v.attributes.fan_speed_list) || [];
      const ws = e.water && h.states[e.water];
      const area = num(h.states[e.area]), tmin = durMin(h.states[e.time]);
      const opts = e.switches.map((sid) => { const ss = h.states[sid]; if (gone(ss)) return ""; return chip("switch", sid, shortName(ss, name), ss.state === "on"); }).join("")
        + (e.relocate ? chip("relocate", "", this._done === "relocate" ? "Repositionnement…" : "Repositionner", this._done === "relocate") : "");
      body = `<div class="row">${main}${btn("base", "Base", "mdi:home-import-outline")}${btn("locate", this._done === "locate" ? "Bip !" : "Localiser", "mdi:map-marker-radius-outline")}</div>
        ${fans.length ? `<div class="grp"><div class="gl"><ha-icon icon="mdi:fan"></ha-icon>Puissance d'aspiration</div><div class="chips">${fans.map((f) => chip("fan", f, FAN[f] || prettySlug(f), v.attributes.fan_speed === f)).join("")}</div></div>` : ""}
        ${ws && !gone(ws) && (ws.attributes.options || []).length ? `<div class="grp"><div class="gl"><ha-icon icon="mdi:water-outline"></ha-icon>Débit d'eau</div><div class="chips">${ws.attributes.options.map((o) => chip("water", o, WATER[o] || prettySlug(o), ws.state === o)).join("")}</div></div>` : ""}
        ${opts ? `<div class="grp"><div class="gl"><ha-icon icon="mdi:tune-variant"></ha-icon>Options</div><div class="chips">${opts}</div></div>` : ""}
        ${e.area || e.time ? `<div class="gl"><ha-icon icon="mdi:history"></ha-icon>Dernier ménage</div><div class="stats">${stat(e.area, "Surface", isFinite(area) ? `${fmt(area)} m²` : "—", "mdi:texture-box")}${stat(e.time, "Durée", durTxt(tmin), "mdi:timer-outline")}</div>` : ""}`;
    } else if (this._tab === "carte") {
      const ms = h.states[e.map];
      const pic = ms && ms.attributes && ms.attributes.entity_picture;
      body = pic ? `<button class="map glass" data-more="${esc(e.map)}"><img src="${esc(pic)}${pic.includes("?") ? "&" : "?"}v=${encodeURIComponent(ms.state)}" alt="Carte du logement"></button>
        <div class="hint">${stKey === "cleaning" ? "Carte mise à jour pendant le ménage." : "Touche la carte pour l'agrandir."}</div>`
        : `<div class="empty">Carte indisponible pour le moment.</div>`;
    } else if (this._tab === "pieces") {
      const rooms = this._rooms(), n = this._sel.size;
      body = `<div class="chips rooms">${rooms.map((r) => chip("room", r.slug, r.label, this._sel.has(r.slug))).join("")}</div>
        <div class="row">${btn("passes", this._passes === 2 ? "2 passages" : "1 passage", this._passes === 2 ? "mdi:numeric-2-circle-outline" : "mdi:numeric-1-circle-outline")}
        ${btn("clean_rooms", this._done === "clean_rooms" ? "C'est parti ✓" : n ? `Nettoyer ${n} pièce${n > 1 ? "s" : ""}` : "Choisis des pièces", "mdi:broom", `big ${n ? "" : "off"} ${this._done === "clean_rooms" ? "done" : ""}`)}</div>`;
    } else if (this._tab === "entretien") {
      const parts = e.parts.map((p) => {
        const st = h.states[p.id], val = num(st), lvl = !isFinite(val) ? "na" : val > 30 ? "ok" : val > 10 ? "mid" : "crit";
        const fn = shortName(st, name).replace(/^(durée de vie|lifespan)( de la| du| de l'| des| de)?\s*/i, "").replace(/^./, (m) => m.toUpperCase());
        const label = PARTS[p.key] || fn || prettySlug(p.key);
        const rk = "reset:" + p.reset;
        const rb = p.reset ? `<button class="mini ${this._confirm === rk ? "confirm" : this._done === rk ? "done" : ""}" data-a="reset" data-arg="${esc(p.reset)}">${this._confirm === rk ? "Confirmer ?" : this._done === rk ? "Fait ✓" : "Remis à neuf"}</button>` : "";
        return `<div class="part"><button class="pl" data-more="${esc(p.id)}">${esc(label)}</button><span class="pv ${lvl}">${isFinite(val) ? Math.round(val) + " %" : "—"}</span>${rb}
          <div class="bar"><i class="${lvl}" style="width:${isFinite(val) ? Math.max(0, Math.min(100, val)) : 0}%"></i></div></div>`;
      }).join("");
      const sta = e.station.map((s) => {
        const sk = STATION[s.key] ? s.key : /vider|empty/.test(s.key) ? "empty_dustbin" : s.key;
        const [lab, ic] = STATION[sk] || [shortName(h.states[s.id], name) || prettySlug(s.key), "mdi:home-automation"];
        const k = "station:" + s.id;
        return btn("station", this._confirm === k ? "Confirmer ?" : this._done === k ? "Fait ✓" : lab, ic, this._confirm === k ? "confirm" : this._done === k ? "done" : "", s.id);
      }).join("");
      const ss = e.stationState && h.states[e.stationState], ae = e.autoEmpty && h.states[e.autoEmpty];
      const staInfo = (ss && !gone(ss) ? `<div class="sti"><ha-icon icon="mdi:home-automation"></ha-icon>${esc(STATION_STATE[ss.state] || prettySlug(ss.state))}</div>` : "")
        + (ae && !gone(ae) && (ae.attributes.options || []).length ? `<div class="grp"><div class="sl">Vidage automatique</div><div class="chips">${ae.attributes.options.map((o) => chip("autoempty", o, AUTO_EMPTY[o] || prettySlug(o), ae.state === o)).join("")}</div></div>` : "");
      const ta = num(h.states[e.totArea]), tc = num(h.states[e.totCount]), tt = durMin(h.states[e.totTime]);
      body = `${parts ? `<div class="gl"><ha-icon icon="mdi:cog-outline"></ha-icon>Consommables</div><div class="parts glass">${parts}</div>` : ""}
        ${sta || staInfo ? `<div class="gl"><ha-icon icon="mdi:home-automation"></ha-icon>Station</div>${staInfo}${sta ? `<div class="row">${sta}</div>` : ""}` : ""}
        ${e.totArea || e.totCount || e.totTime ? `<div class="gl"><ha-icon icon="mdi:chart-box-outline"></ha-icon>Depuis la mise en service</div><div class="stats">
          ${stat(e.totCount, "Ménages", isFinite(tc) ? fmt(tc) : "—", "mdi:counter")}${stat(e.totArea, "Surface", isFinite(ta) ? `${fmt(ta)} m²` : "—", "mdi:texture-box")}${stat(e.totTime, "Durée", durTxt(tt), "mdi:timer-outline")}</div>` : ""}`;
    }

    const head = c.image
      ? `<div class="hero" style="height:${Math.max(60, Number(c.image_height) || 150)}px"><div class="hero-img" style="background-image:url('${esc(c.image)}');background-position:${esc(c.image_position || "center")}"></div><div class="hero-fade"></div>
          <div class="hero-in"><div class="t">${esc(name)}</div></div></div>`
      : `<div class="nohero"><ha-icon icon="mdi:robot-vacuum"></ha-icon><div class="t">${esc(name)}</div></div>`;

    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --rv-text:#f4f6fb; --rv-muted:#a9afc0; --rv-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#1f1b2c 55%,#1c1620 100%)); --rv-border:rgba(255,255,255,.14); --rv-shadow:0 .6em 2em rgba(0,0,0,.35);
        --rv-glass:rgba(255,255,255,.07); --rv-glass-b:rgba(255,255,255,.13); --rv-acc:var(--acc-ui-x,#4aa8ff); --rv-ok:#3ddc84; --rv-mid:#ffb86b; --rv-crit:#ff5a5f; --rv-run:#4aa8ff; --rv-na:#8a90a2; --rv-fade:rgba(20,22,36,.92); }
      ha-card.light { --rv-text:#1c2030; --rv-muted:#5d6477; --rv-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8f8fa 100%)); --rv-border:rgba(20,24,40,.12); --rv-shadow:0 .4em 1.4em rgba(20,24,40,.12);
        --rv-glass:rgba(255,255,255,.7); --rv-glass-b:rgba(20,24,40,.1); --rv-acc:var(--acc-ui-x,#1f78d1); --rv-ok:#1a9d55; --rv-mid:#c77a14; --rv-crit:#d32f35; --rv-run:#1f78d1; --rv-na:#8a90a2; --rv-fade:rgba(248,249,253,.94); }
      ha-card { position:relative; container-type:inline-size; display:flex; flex-direction:column; color:var(--rv-text); border-radius:24px; border:1px solid var(--rv-border); background:var(--rv-bg); box-shadow:var(--rv-shadow); overflow:hidden; }
      ha-icon { --mdc-icon-size:1.25em; flex:none; }
      button { font:inherit; color:inherit; background:none; border:0; padding:0; text-align:left; cursor:pointer; -webkit-tap-highlight-color:transparent; }
      .glass { background:var(--rv-glass); border:1px solid var(--rv-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
      .t { font-weight:800; font-size:1.25em; letter-spacing:.01em; }
      .hero { position:relative; }
      .hero-img { position:absolute; inset:0; background-size:cover; }
      .hero-fade { position:absolute; inset:0; background:linear-gradient(180deg,transparent 35%,var(--rv-fade) 100%); }
      .hero-in { position:absolute; left:16px; right:16px; bottom:10px; }
      .nohero { display:flex; align-items:center; gap:.5em; padding:16px 16px 4px; } .nohero ha-icon { --mdc-icon-size:1.6em; color:var(--rv-acc); }
      .main { display:flex; flex-direction:column; gap:12px; padding:12px 16px 16px; }
      .status { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .pill { display:inline-flex; align-items:center; gap:.35em; padding:5px 12px; border-radius:999px; font-size:.85em; font-weight:700; }
      .pill.ok { color:var(--rv-ok); } .pill.mid { color:var(--rv-mid); } .pill.crit { color:var(--rv-crit); } .pill.run { color:var(--rv-run); } .pill.na { color:var(--rv-na); }
      .pill.run ha-icon { animation:rv-spin 2.4s linear infinite; }
      @keyframes rv-spin { to { transform:rotate(360deg); } }
      .al { display:flex; align-items:center; gap:.6em; padding:10px 14px; border-radius:16px; font-size:.9em; border-color:var(--rv-crit); } .al ha-icon { color:var(--rv-crit); }
      .tabs { display:flex; gap:4px; padding:3px; border-radius:999px; overflow-x:auto; scrollbar-width:none; }
      .tab { flex:1; display:flex; align-items:center; justify-content:center; gap:.35em; padding:7px 10px; border-radius:999px; font-size:.85em; font-weight:600; color:var(--rv-muted); white-space:nowrap; }
      .tab ha-icon { --mdc-icon-size:1.1em; } .tab.on { color:#fff; background:var(--rv-acc); }
      @container (max-width: 340px) { .tab span { display:none; } }
      .row { display:flex; gap:8px; flex-wrap:wrap; }
      .act { flex:1; min-width:6.5em; display:flex; align-items:center; justify-content:center; gap:.4em; padding:10px 12px; border-radius:16px; font-weight:700; font-size:.9em; background:var(--rv-glass); border:1px solid var(--rv-glass-b); transition:transform .1s, background .2s; }
      .act:active { transform:scale(.96); }
      .act.big { color:#fff; background:var(--rv-acc); border-color:transparent; flex:1.4; }
      .act.off { opacity:.55; pointer-events:none; }
      .act.confirm, .mini.confirm { color:#fff; background:var(--rv-mid); border-color:transparent; animation:rv-p 1s ease-in-out infinite; }
      .act.done, .mini.done { color:#fff; background:var(--rv-ok); border-color:transparent; }
      @keyframes rv-p { 50% { box-shadow:0 0 0 3px color-mix(in srgb, var(--rv-mid) 35%, transparent); } }
      .grp { display:flex; flex-direction:column; gap:6px; }
      .gl { display:flex; align-items:center; gap:.4em; font-size:.82em; font-weight:700; color:var(--rv-muted); text-transform:uppercase; letter-spacing:.04em; } .gl ha-icon { --mdc-icon-size:1.15em; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { padding:7px 14px; border-radius:999px; font-size:.88em; font-weight:600; background:var(--rv-glass); border:1px solid var(--rv-glass-b); }
      .chip.on { color:#fff; background:var(--rv-acc); border-color:transparent; }
      .rooms .chip { padding:9px 16px; }
      .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(7.5em,1fr)); gap:8px; }
      .stat { display:flex; align-items:center; gap:.6em; padding:10px 12px; border-radius:16px; } .stat ha-icon { color:var(--rv-acc); }
      .sv { font-weight:800; font-variant-numeric:tabular-nums; } .sl { font-size:.78em; color:var(--rv-muted); }
      .map { display:block; width:100%; padding:8px; border-radius:18px; } .map img { display:block; width:100%; height:auto; max-height:420px; object-fit:contain; border-radius:12px; }
      .sti { display:flex; align-items:center; gap:.5em; font-size:.9em; font-weight:600; } .sti ha-icon { color:var(--rv-acc); }
      .hint, .empty { font-size:.85em; color:var(--rv-muted); text-align:center; } .empty { padding:18px 0; }
      .parts { display:flex; flex-direction:column; gap:12px; padding:12px 14px; border-radius:18px; }
      .part { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:4px 10px; }
      .pl { font-weight:600; font-size:.9em; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .pv { font-weight:800; font-size:.9em; font-variant-numeric:tabular-nums; } .pv.ok { color:var(--rv-ok); } .pv.mid { color:var(--rv-mid); } .pv.crit { color:var(--rv-crit); }
      .mini { font-size:.75em; font-weight:700; padding:4px 10px; border-radius:999px; background:var(--rv-glass); border:1px solid var(--rv-glass-b); }
      .bar { grid-column:1 / -1; height:6px; border-radius:3px; background:var(--rv-glass-b); overflow:hidden; }
      .bar i { display:block; height:100%; border-radius:3px; transition:width .6s ease; } .bar i.ok { background:var(--rv-ok); } .bar i.mid { background:var(--rv-mid); } .bar i.crit { background:var(--rv-crit); } .bar i.na { background:var(--rv-na); }
      @media (prefers-reduced-motion: reduce) { .pill.run ha-icon, .act.confirm, .mini.confirm { animation:none; } }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">
      ${head}
      <div class="main">
        <div class="status">
          <button class="pill glass ${stLvl}" data-more="${esc(c.entity)}"><ha-icon icon="${stIcon}"></ha-icon>${esc(stTxt)}</button>
          ${mopOn ? `<button class="pill glass run" data-more="${esc(e.mop)}"><ha-icon icon="mdi:water"></ha-icon>Serpillière</button>` : ""}
          ${isFinite(batt) ? `<button class="pill glass ${bLvl}" data-more="${esc(e.battery || c.entity)}"><ha-icon icon="${bIcon}"></ha-icon>${Math.round(batt)} %</button>` : ""}
        </div>
        ${errTxt ? `<button class="al glass" data-more="${esc(e.error)}"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>${esc(errTxt)}</span></button>` : ""}
        ${tabs.length > 1 ? `<div class="tabs glass" role="tablist">${tabs.map((t) => `<button class="tab ${this._tab === t[0] ? "on" : ""}" data-a="tab" data-arg="${t[0]}" role="tab"><ha-icon icon="${t[2]}"></ha-icon><span>${t[1]}</span></button>`).join("")}</div>` : ""}
        ${body}
      </div>
    </ha-card>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._more(el.dataset.more)));
    sr.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", () => this._action(el.dataset.a, el.dataset.arg)));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS, entity: "Robot aspirateur", title: "Titre (nom du robot si vide)", theme: "Thème", image: "Photo du robot (URL ou /local/…)",
  image_height: "Hauteur de la photo (px)", image_position: "Cadrage de la photo", map_entity: "Image de la carte (auto si vide)", default_tab: "Onglet affiché par défaut",
  room_names: "Noms des pièces (numéro de zone ou nom : 0: Salon)" };
const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "vacuum" } } },
  { type: "grid", name: "", schema: [{ name: "title", selector: { text: {} } },
    { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }, ...GV_FIELDS] },
  { name: "image", selector: { text: {} } },
  { type: "grid", name: "", schema: [{ name: "image_height", selector: { number: { min: 60, max: 320, step: 10, mode: "slider" } } },
    { name: "image_position", selector: { select: { mode: "dropdown", options: [{ value: "center", label: "Centre" }, { value: "top", label: "Haut" }, { value: "bottom", label: "Bas" }] } } }] },
  { name: "default_tab", selector: { select: { mode: "dropdown", options: [{ value: "controle", label: "Contrôle" }, { value: "carte", label: "Carte" }, { value: "pieces", label: "Pièces" }, { value: "entretien", label: "Entretien" }] } } },
  { type: "expandable", name: "", flatten: true, title: "Avancé", icon: "mdi:tune-variant", schema: [
    { name: "map_entity", selector: { entity: { domain: "image" } } },
    { name: "room_names", selector: { object: {} } }] },
];

class RobotVacuumCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    if (!this._form) this._build(); else this._form.data = this._config;
  }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._config; el.schema = SCHEMA; el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const cfg = { ...ev.detail.value };
      ["title", "image", "map_entity"].forEach((k) => { if (cfg[k] === "" || cfg[k] == null) delete cfg[k]; });
      if (cfg.room_names && !Object.keys(cfg.room_names).length) delete cfg.room_names;
      this._config = cfg;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    });
    this._form = el; this.appendChild(el);
  }
}

customElements.define("robot-vacuum-card", RobotVacuumCard);
customElements.define("robot-vacuum-card-editor", RobotVacuumCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "robot-vacuum-card", name: "Robot Vacuum Card (FR)", description: "Robot aspirateur : photo, état, batterie, carte du logement, ménage par pièce, consommables.", preview: true });
console.info(`%c ROBOT-VACUUM-CARD %c v${CARD_VERSION} `, "color:#fff;background:#1f78d1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#1f78d1;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
