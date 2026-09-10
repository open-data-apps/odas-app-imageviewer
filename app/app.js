/*
 * Diese Funktion ist für die Inhalte der App zuständig.
 * Es wird zunächst eine Startseite mit Galerieübersicht (Titel und Beschreibung)
 * angezeigt. Über einen Button gelangt man in die Slideshow, in der
 * nacheinander alle Bilder mit Titel und Beschreibung (aus den Ressourcen) angezeigt werden.
 *
 * ConfigData ist ein JSON enthält die Referenz auf die Daten im CKAN Open Data Portal:
 *     {
 *         "apiurls": [
 *             { "name": "bilder", "label": "URL zu den Daten", "url": "https://open-data-musterstadt.ckan.de/dataset/db92da8e40f9/download/formular_multitemplate.json" }
 *         ]
 *     }
 *
 * @param {Object} configData - Alle Konfigurationsdaten der App
 * @param {HTMLElement} enclosingHtmlDivElement - HTML Knoten, in den der App-Inhalt eingefügt wird
 * @returns {string | NULL} - darzustellendes HTML oder NULL, wenn direkt im DOM manipuliert wird
 */

let ivInstanzZaehler = 0;

// IV-B1: Instanz-Registry je Container. Die App hatte keinen Lifecycle-Schutz;
// nach einem Seitenwechsel liefen spaete Antworten in einen TypeError, weil der
// eigene Untercontainer nicht mehr existiert.
const ivInstanzen = new Map();

function onPageLeave() {
  ivInstanzen.forEach(function (zustand) {
    try {
      zustand.abmelden();
    } catch (error) {
      console.warn("Fehler beim Abraeumen der Bildergalerie-Instanz:", error);
    }
  });
  ivInstanzen.clear();
}

function ivZustand(root) {
  return (root && ivInstanzen.get(root)) || null;
}

function ivVerworfen(root) {
  const zustand = ivZustand(root);
  return !zustand || zustand.disposed;
}

// IV-B2: Bilderkennung nicht nur an der Datei-Endung. CKAN-Ressourcen tragen
// haeufig Query-Strings oder gar keine Endung; dort ist format/mimetype
// massgeblich. Der akzeptierte Typumfang bleibt unveraendert.
function istBildRessource(resource) {
  const url = String((resource && resource.url) || "")
    .split("?")[0]
    .split("#")[0];
  if (/\.(jpe?g|png|gif|webp)$/i.test(url)) return true;
  const format = String(
    (resource && (resource.format || resource.mimetype)) || "",
  )
    .toLowerCase()
    .replace(/^image\//, "");
  return /^(jpe?g|png|gif|webp)$/.test(format);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Laesst nur http- und https-URLs durch. Bildadressen stammen aus dem
// CKAN-Datensatz und sind damit fremdbestimmt.
function safeUrl(value = "") {
  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function app(configData, enclosingHtmlDivElement) {
  const ivUid = "i" + ++ivInstanzZaehler;

  // IV-B1: Zustand und Teardown SOFORT registrieren — vor DOM- und Async-Arbeit.
  const state = {
    disposed: false,
    controller: new AbortController(),
    keydownHandler: null,
    abmelden: function () {
      this.disposed = true;
      this.controller.abort();
      // IV-B4: Tastatur-Listener der Slideshow gehoert der Instanz.
      if (this.keydownHandler) {
        document.removeEventListener("keydown", this.keydownHandler);
        this.keydownHandler = null;
      }
    },
  };
  const ivVorheriger = ivInstanzen.get(enclosingHtmlDivElement);
  if (ivVorheriger) {
    try {
      ivVorheriger.abmelden();
    } catch (_e) {}
  }
  ivInstanzen.set(enclosingHtmlDivElement, state);
  const rootIv = enclosingHtmlDivElement;

  // Da der Hauptinhalt bereits existiert, wird dieser Knoten genutzt.
  // Füge einen internen Container für die App-Inhalte ein.
  enclosingHtmlDivElement.innerHTML = `<div id="iv-datenfrische"></div><div id="iv-app-container"></div><div id="iv-schale4"></div>`;

  var ivSchale4 = enclosingHtmlDivElement.querySelector("#iv-schale4");
  if (ivSchale4) {
    ivSchale4.innerHTML = methodikBox(configData, ivUid) + renderWeitereInfos(configData);
  }

  // Starte das Laden der Galerie-Daten
  const quelle = getOdasApiUrl(configData, "bilder");
  if (!quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle)) {
    renderOdasFehler(
      enclosingHtmlDivElement.querySelector("#iv-app-container"),
      new Error("Keine Datenquelle konfiguriert."),
      {
        url: quelle,
        label: "Bildergalerie-API",
        typLabel: "Datensatz-API",
        erwarteterTyp: "ckan-ps",
      },
    );
    return;
  }
  // Variante A (F-92): Typprüfung vor dem ersten Fetch.
  const ivTypWarn = validateUrlTypErwartung(quelle, "ckan-ps");
  if (ivTypWarn) {
    renderOdasFehler(
      enclosingHtmlDivElement.querySelector("#iv-app-container"),
      new Error(ivTypWarn),
      {
        url: quelle,
        label: "Bildergalerie-API",
        typLabel: "Datensatz-API",
        erwarteterTyp: "ckan-ps",
      },
    );
    return;
  }
  fetchGalleryData(getOdasApiUrl(configData, "bilder"), configData, rootIv);
}

/**
 * Extrahiert den Pfad aus einer vollständigen URL.
 * @param {string} url
 * @returns {string}
 */
function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(targetUrl)}`;
}

async function fetchViaOdasProxy(targetUrl, options = {}) {
  if (typeof isKeineDatenquelleKonfiguriert === "function" && isKeineDatenquelleKonfiguriert(targetUrl)) {
    throw new Error("Keine Datenquelle konfiguriert.");
  } else if (typeof isKeineDatenquelleKonfiguriert !== "function") {
    const v = String(targetUrl || "").trim();
    if (!v || /^\{\{.*\}\}$/.test(v) || /^<.*>$/.test(v)) throw new Error("Keine Datenquelle konfiguriert.");
  }

  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
    signal: options && options.signal ? options.signal : undefined,
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch (_e) {}
    const originHint = /origin not allowed/i.test(body) ? " – URL origin not allowed" : "";
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}${originHint}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}, options = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl, options);
  }

  try {
    const response = await fetch(targetUrl, {
      signal: options && options.signal ? options.signal : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

/**
 * Löst eine benannte Datenressource aus configdata.apiurls auf.
 * Neue apiurls-Form (typ: "array"); das frühere skalare apiurl wird nicht mehr gelesen.
 * @returns {string} getrimmte URL, oder "" für den Zustand "keine Quelle konfiguriert"
 */
function getOdasApiUrl(configdata, name) {
  const liste = Array.isArray(configdata && configdata.apiurls) ? configdata.apiurls : [];
  const treffer = liste.find((eintrag) => eintrag && eintrag.name === name);
  return String((treffer && treffer.url) || "").trim();
}

async function fetchOdasJson(targetUrl, configdata = {}, options = {}) {
  const rawContent = await fetchOdasResource(targetUrl, configdata, options);
  try {
    return JSON.parse(rawContent);
  } catch (_error) {
    throw new Error(
      `Die konfigurierte Daten-URL liefert kein JSON, sondern ${describeNonJsonPayload(rawContent)}. ` +
        "Bitte in der Instanzkonfiguration den API-Endpunkt der Datenquelle eintragen, " +
        "nicht den Datensatz- oder Download-Link.",
    );
  }
}

function describeNonJsonPayload(rawContent) {
  const text = String(rawContent == null ? "" : rawContent).trim();
  if (!text) return "eine leere Antwort";
  if (text.startsWith("<")) return "eine HTML-Seite";
  const firstLine = text.split(/\r?\n/, 1)[0];
  if (/[,;]/.test(firstLine)) return "eine CSV- oder Textdatei";
  return "unlesbaren Inhalt";
}

function isKeineDatenquelleKonfiguriert(targetUrl) {
  const quelle = String(targetUrl || "").trim();
  return !quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle);
}


const TYP_BEZEICHNUNG = {
  "ckan-dkan-ds": "Tabellen-API mit Daten-ID",
  "ckan-ps": "Datensatz-API",
  "ckan-dl": "Datei-Download",
  "ods21": "Open-Data-Suche (API v2.1)",
  "wfs": "Kartendienst (WFS)",
  "sparql": "Wissensdatenbank (SPARQL)",
  "csv-zip": "Statische Datei"
};

function validateUrlTypErwartung(url, erwarteterTyp) {
  const u = String(url || "");
  if (!erwarteterTyp || isKeineDatenquelleKonfiguriert(u)) return null;
  const checks = {
    "ckan-dkan-ds": /\/api\/3\/action\/datastore_search\?resource_id=/i,
    "ckan-ps": /\/api\/3\/action\/package_show\?id=/i,
    "ckan-dl": /\/dataset\/.*\/resource\/.*\/download\//i,
    "ods21": /\/api\/explore\/v2\.1\//i,
    "wfs": /service=WFS/i,
    "sparql": /\/api\/ts\/v1\/kg\/sparql/i,
    "csv-zip": /\.(csv|json|zip)(\?|$)/i
  };
  const re = checks[erwarteterTyp];
  if (!re) return null;
  if (!re.test(u)) {
    const soll = TYP_BEZEICHNUNG[erwarteterTyp] || erwarteterTyp;
    return `Typ passt nicht: erwartet „${soll}", erhalten „${u.slice(0, 60)}…". Prüfen Sie den Hilfe-Tooltip bei „URLs zu Datenressourcen".`;
  }
  return null;
}

function classifyOdasFehler(error, kontext = {}) {
  const msg = String((error && error.message) || error || "");
  const url = String(kontext.url || "");
  const label = String(kontext.label || "Datenressource");
  const typLabel = String(kontext.typLabel || TYP_BEZEICHNUNG[kontext.erwarteterTyp] || "Datenquelle");
  if (/Keine Datenquelle konfiguriert/i.test(msg) || isKeineDatenquelleKonfiguriert(url)) {
    return {
      kind: "KEINE_QUELLE",
      titel: "Es ist keine Datenquelle konfiguriert.",
      hinweis: `Prüfen Sie unter „URLs zu Datenressourcen → ${label}" ob eine gültige ${typLabel}-URL eingetragen ist (Hilfe-Tooltip beachten).`,
      detail: msg,
      alertClass: "alert-info"
    };
  }
  if (/Typ passt nicht: erwartet/i.test(msg)) {
    return {
      kind: "TYP_MISMATCH",
      titel: msg,
      hinweis: `Diese App erwartet ${typLabel}. Korrigieren Sie die URL gemäß Hilfe-Tooltip (Beispiel dort).`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/URL origin not allowed/i.test(msg)) {
    return {
      kind: "PROXY_ORIGIN",
      titel: "ODAS-Proxy blockiert: Ziel-Origin nicht freigegeben.",
      hinweis: "Tragen Sie die Ziel-Origin als eigenen Eintrag unter „URLs zu Datenressourcen“ ein oder prüfen Sie proxyAktiv.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/ODAS-Proxy-Fehler/i.test(msg) || /kein content-String/i.test(msg)) {
    return {
      kind: "PROXY_HTTP",
      titel: msg,
      hinweis: "Prüfen Sie proxyAktiv und Erreichbarkeit im ODAS-Live-System (lokal 404 ist normal).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/Direkter Datenabruf fehlgeschlagen/i.test(msg) || /Failed to fetch/i.test(msg)) {
    const corsHint = /Failed to fetch/i.test(msg) ? " – vermutlich CORS blockiert → im ODAS-Live proxyAktiv=ja." : "";
    return {
      kind: "DIREKT_CORS_HTTP",
      titel: msg,
      hinweis: `Prüfen Sie URL und CORS der Quelle${corsHint}`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/liefert kein JSON/i.test(msg) || /HTML-Seite|CSV-|leere Antwort|unlesbaren/i.test(msg)) {
    return {
      kind: "PAYLOAD_TYP",
      titel: msg,
      hinweis: "Tragen Sie den passenden Endpunkt ein – nicht die Datensatzseite (/dataset/…) – Hilfe-Tooltip beachten.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/CKAN.*Fehler|success:false/i.test(msg)) {
    return {
      kind: "CKAN_API",
      titel: msg,
      hinweis: "Prüfen Sie Daten-ID / Datensatz-ID (existiert die Tabelle/Datei noch auf dem Portal?).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/404|Nicht gefunden/i.test(msg)) {
    return {
      kind: "HTTP_404",
      titel: msg,
      hinweis: "Ressource/Datensatz auf dem Portal nicht gefunden (404).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  return {
    kind: "UNBEKANNT",
    titel: msg || "Unbekannter Fehler beim Laden.",
    hinweis: "Prüfen Sie Konfiguration und Erreichbarkeit der Quelle.",
    detail: msg,
    alertClass: "alert-danger"
  };
}

function renderOdasFehler(container, error, kontext = {}) {
  if (!container) return;
  const typWarn = validateUrlTypErwartung(kontext.url, kontext.erwarteterTyp);
  if (typWarn && !/Typ passt nicht/i.test(String(error && error.message))) {
    error = new Error(typWarn);
  }
  const info = classifyOdasFehler(error, kontext);
  const url = String(kontext.url || "");
  const urlZeile = url ? `<p class="mb-1 small text-muted">Konfigurierte URL: <code>${escapeHtml(url.length > 80 ? url.slice(0, 80) + "…" : url)}</code></p>` : "";
  const titel = kontext.leer ? "Keine Datensätze gefunden." : info.titel;
  const alertClass = kontext.leer ? "alert-info" : info.alertClass;
  container.innerHTML = `<div class="alert ${alertClass}" role="alert"><strong>${escapeHtml(titel)}</strong><p class="mb-1">${escapeHtml(info.hinweis)}</p>${urlZeile}<details class="small"><summary>Details</summary><code>${escapeHtml(info.detail || String(error))}</code></details></div>`;
}

/**
 * Lädt die Galerie-Daten aus der API (über Proxy) und startet die Darstellung.
 * @param {string} apiurl - URL zur API
 */
async function fetchGalleryData(apiurl, configdata = {}, root) {
  try {
    const data = await fetchOdasJson(apiurl, configdata, {
      signal: ivZustand(root) ? ivZustand(root).controller.signal : undefined,
    });
    // IV-B1: Nach einem Seitenwechsel weder Datenstand noch Inhalt schreiben.
    if (ivVerworfen(root)) return;
    const datenfrische = extractDatenStandIv(data);
    updateIvFrische(datenfrische, root);
    // Annahme: Die API liefert ein Objekt in data.result mit folgenden Feldern:
    // - notes: Beschreibung der Galerie
    // - title: (optional) Titel der Galerie
    // - resources: Array von Objekten mit Bilddaten (url, name, description)
    const galleryInfo = {
      title: data.result.title || "Galerie",
      notes: data.result.notes || "",
    };

    // IV-B2: Filtere Bildressourcen ueber Endung ODER format/mimetype.
    const imageData = (data.result.resources || [])
      .filter(istBildRessource)
      .map((resource) => ({
        url: resource.url,
        title: resource.name || "Kein Titel",
        description: resource.description || "",
      }));

    if (imageData.length === 0) {
      const leerContainer = root.querySelector("#iv-app-container");
      if (leerContainer) {
        leerContainer.innerHTML =
          "<p>Keine Bilder gefunden. Bitte versuche es später erneut.</p>";
      }
      return;
    }

    // Zeige die Startseite mit Galerieübersicht
    showStartPage(galleryInfo, imageData, root);
  } catch (err) {
    if (err && err.name === "AbortError") return;
    if (ivVerworfen(root)) return;
    console.error("Fehler beim Laden der Galerie-Daten:", err);
    renderOdasFehler(root.querySelector("#iv-app-container"), err, {
      url: apiurl,
      label: "Bildergalerie-API",
      typLabel: "Datensatz-API",
      erwarteterTyp: "ckan-ps",
    });
  }
}

/**
 * Zeigt die Startseite an, die den Galerietitel, die Beschreibung (notes) und einen Button zum Starten der Slideshow enthält.
 * @param {Object} galleryInfo - Enthält title und notes der Galerie
 * @param {Array} imageData - Array mit Bildobjekten (url, title, description)
 */
function showStartPage(galleryInfo, imageData, root) {
  // IV-B1: Nach einem Seitenwechsel gibt es den Untercontainer nicht mehr.
  if (ivVerworfen(root)) return;
  const container = root.querySelector("#iv-app-container");
  if (!container) return;

  const VORSCHAU_ANZAHL = 6;
  const vorschau = imageData.slice(0, VORSCHAU_ANZAHL);
  // IV-B5: Stilles Kuerzen wird benannt.
  const vorschauHinweis =
    imageData.length > vorschau.length
      ? `<p class="text-muted small">Vorschau: ${vorschau.length} von ${imageData.length} Bildern.</p>`
      : "";

  container.innerHTML = `
    <div class="text-center">
      <h1>${escapeHtml(galleryInfo.title)}</h1>
      <p>${escapeHtml(galleryInfo.notes)}</p>
      <button id="iv-start-slideshow" class="btn btn-primary">Slideshow starten</button>
    </div>
    ${vorschauHinweis}
    <div class="gallery-preview mt-4">
      ${vorschau
        .map(
          (image) =>
            `<img src="${escapeHtml(safeUrl(image.url))}" alt="${escapeHtml(image.title)}" loading="lazy" decoding="async">`,
        )
        .join("")}
    </div>
  `;

  // IV-B3: Bildladefehler sichtbar machen statt nur das Browser-Icon zu zeigen.
  container.querySelectorAll(".gallery-preview img").forEach(function (img) {
    img.addEventListener("error", function () {
      img.classList.add("iv-img-fehler");
      const hinweis = document.createElement("span");
      hinweis.className = "iv-img-fehler-hinweis small text-muted";
      hinweis.textContent = "Bild nicht verfügbar";
      img.replaceWith(hinweis);
    });
  });

  const startBtn = root.querySelector("#iv-start-slideshow");
  if (startBtn) {
    startBtn.addEventListener("click", function () {
      startSlideshow(imageData, galleryInfo, root);
    });
  }
}

/**
 * Startet die Slideshow, in der nacheinander alle Bilder samt Titel und Beschreibung angezeigt werden.
 * Es wird zusätzlich ein "Zurück zur Startseite"-Button eingebaut.
 * @param {Array} imageData - Array mit Bildobjekten (url, title, description)
 * @param {Object} galleryInfo - Enthält title und notes der Galerie (zur Rückkehr zur Startseite)
 */
function startSlideshow(imageData, galleryInfo, root) {
  // IV-B1: Nach einem Seitenwechsel nicht mehr in den fremden Container schreiben.
  if (ivVerworfen(root)) return;
  const container = root.querySelector("#iv-app-container");
  if (!container) return;
  const zustand = ivZustand(root);

  // IV-B4: Der Bildbereich ist eine benannte Region, der Infobereich kuendigt
  // Wechsel an (aria-live) — der Titel ist damit auch fuer Screenreader da.
  container.innerHTML = `
    <div id="slideshow" class="slideshow-container text-center" role="region" aria-label="Bildergalerie">
      <div class="image-container mb-3">
        <img id="iv-slide-image" src="" alt="" class="img-fluid" style="max-height: 70vh;">
      </div>
      <div class="info-container mb-3" aria-live="polite">
        <h3 id="iv-slide-title" class="slide-title"></h3>
        <p id="iv-slide-description" class="slide-description"></p>
        <p id="iv-slide-position" class="text-muted small mb-0"></p>
      </div>
      <div class="button-container d-flex justify-content-around">
        <button id="iv-prev-slide" class="btn btn-secondary">Vorherige</button>
        <button id="iv-back-to-home" class="btn btn-secondary">Zurück zur Startseite</button>
        <button id="iv-next-slide" class="btn btn-secondary">Nächste</button>
      </div>
    </div>
  `;

  let currentIndex = 0;
  const bildEl = root.querySelector("#iv-slide-image");
  const titelEl = root.querySelector("#iv-slide-title");
  const beschreibungEl = root.querySelector("#iv-slide-description");
  const positionEl = root.querySelector("#iv-slide-position");
  const fehlerEl = document.createElement("p");
  fehlerEl.className = "text-danger small d-none";
  fehlerEl.textContent = "Das Bild konnte nicht geladen werden.";
  beschreibungEl.parentNode.appendChild(fehlerEl);

  // IV-B3: Ladefehler des Bildes sichtbar machen.
  if (bildEl) {
    bildEl.addEventListener("error", function () {
      if (bildEl.getAttribute("src")) fehlerEl.classList.remove("d-none");
    });
  }

  // IV-B4: Titel als Alt-Text, damit das Bild selbst beschriftet ist.
  function updateSlide() {
    const currentImage = imageData[currentIndex];
    const quelle = safeUrl(currentImage.url);
    if (bildEl) {
      // IV-B3: ein leeres src wuerde die aktuelle Seite erneut anfordern.
      if (quelle) {
        bildEl.src = quelle;
        bildEl.alt = currentImage.title || "Bild";
        fehlerEl.classList.add("d-none");
      } else {
        bildEl.removeAttribute("src");
        bildEl.alt = "";
        fehlerEl.classList.remove("d-none");
      }
    }
    if (titelEl) titelEl.textContent = currentImage.title;
    if (beschreibungEl) beschreibungEl.textContent = currentImage.description;
    if (positionEl) {
      positionEl.textContent =
        "Bild " + (currentIndex + 1) + " von " + imageData.length;
    }
  }

  function weiter() {
    currentIndex = (currentIndex + 1) % imageData.length;
    updateSlide();
  }

  function zurueck() {
    currentIndex = (currentIndex - 1 + imageData.length) % imageData.length;
    updateSlide();
  }

  // Eventlistener für Navigationsbuttons
  root.querySelector("#iv-prev-slide").addEventListener("click", zurueck);
  root.querySelector("#iv-next-slide").addEventListener("click", weiter);

  // Eventlistener für den Zurück-Button
  root
    .querySelector("#iv-back-to-home")
    .addEventListener("click", function () {
      entferneTastatur();
      showStartPage(galleryInfo, imageData, root);
    });

  // IV-B4: Tastatursteuerung waehrend der Slideshow. Die Referenz haengt am
  // Instanzzustand, damit der Teardown sie wieder entfernt.
  function entferneTastatur() {
    if (zustand && zustand.keydownHandler) {
      document.removeEventListener("keydown", zustand.keydownHandler);
      zustand.keydownHandler = null;
    }
  }
  function tastatur(e) {
    if (ivVerworfen(root)) {
      entferneTastatur();
      return;
    }
    if (!root.querySelector("#iv-slide-image")) {
      entferneTastatur();
      return;
    }
    if (e.key === "ArrowRight") {
      weiter();
    } else if (e.key === "ArrowLeft") {
      zurueck();
    }
  }
  if (zustand) {
    entferneTastatur();
    zustand.keydownHandler = tastatur;
    document.addEventListener("keydown", tastatur);
  }

  // Initiale Anzeige
  updateSlide();
}

function methodikBox(configdata, uid) {
  var hinweis = String(configdata.datenquelleHinweis || "").trim();
  var stand = String(configdata.datenStand || "").trim();
  if (!hinweis && !stand) return "";
  var standZeile = stand
    ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
    : "";
  return (
    '<section class="iv-methodik mt-4">' +
    '<button class="iv-methodik-toggle collapsed" type="button" ' +
    'data-bs-toggle="collapse" data-bs-target="#iv-methodik-body-' + uid + '" ' +
    'aria-expanded="false" aria-controls="iv-methodik-body-' + uid + '">' +
    '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
    '<span class="iv-methodik-chevron" aria-hidden="true">&#9662;</span>' +
    "</button>" +
    '<div id="iv-methodik-body-' + uid + '" class="collapse">' +
    '<div class="iv-methodik-content">' +
    standZeile +
    hinweis +
    "</div></div></section>"
  );
}

function renderWeitereInfos(configdata) {
  var links = (configdata.weiterfuehrendeLinks || "").trim();
  if (!links) return "";
  return (
    '<section class="iv-weitere-infos mt-4">' +
    '<h2 class="h5 mb-3">Weitere Informationen</h2>' +
    '<div class="iv-weitere-infos-content">' +
    links +
    "</div></section>"
  );
}

function extractDatenStandIv(apiResponse) {
  var raw =
    apiResponse?.result?.metadata_modified ||
    apiResponse?.result?.last_modified ||
    null;
  if (!raw) return null;
  var d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("de-DE");
}

function updateIvFrische(stand, root) {
  var el = root.querySelector("#iv-datenfrische");
  if (el) {
    el.innerHTML = stand
      ? '<div class="text-muted small text-end mb-2">Aktualisiert: ' +
        escapeHtml(stand) +
        "</div>"
      : "";
  }
}

/*
 * Diese Funktion kann Bibliotheken und benötigte Skripte laden.
 * Sie hängt den zurückgegebenen HTML Code in die Head Section an.
 *
 * @returns {string} - HTML mit script, link, etc. Tags
 */
function addToHead() {
  return ``;
}
