/*
 * Diese Funktion ist für die Inhalte der App zuständig.
 * Es wird zunächst eine Startseite mit Galerieübersicht (Titel und Beschreibung)
 * angezeigt. Über einen Button gelangt man in die Slideshow, in der
 * nacheinander alle Bilder mit Titel und Beschreibung (aus den Ressourcen) angezeigt werden.
 *
 * ConfigData ist ein JSON enthält die Referenz auf die Daten im CKAN Open Data Portal:
 *     {
 *         "apiurl": "https://open-data-musterstadt.ckan.de/dataset/db92da8e40f9/download/formular_multitemplate.json"
 *     }
 *
 * @param {Object} configData - Alle Konfigurationsdaten der App
 * @param {HTMLElement} enclosingHtmlDivElement - HTML Knoten, in den der App-Inhalt eingefügt wird
 * @returns {string | NULL} - darzustellendes HTML oder NULL, wenn direkt im DOM manipuliert wird
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function app(configData, enclosingHtmlDivElement) {
  // Da der Hauptinhalt bereits existiert, wird dieser Knoten genutzt.
  // Füge einen internen Container für die App-Inhalte ein.
  enclosingHtmlDivElement.innerHTML = `<div id="iv-datenfrische"></div><div id="app-container"></div><div id="iv-schale4"></div>`;

  var ivSchale4 = document.getElementById("iv-schale4");
  if (ivSchale4) {
    ivSchale4.innerHTML = methodikBox(configData) + renderWeitereInfos(configData);
  }

  // Starte das Laden der Galerie-Daten
  fetchGalleryData(configData.apiurl, configData); // apiurl wird komplett klein geschrieben
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
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata));
}

/**
 * Lädt die Galerie-Daten aus der API (über Proxy) und startet die Darstellung.
 * @param {string} apiurl - URL zur API
 */
async function fetchGalleryData(apiurl, configdata = {}) {
  try {
    const data = await fetchOdasJson(apiurl, configdata);
    ivDatenfrische = extractDatenStandIv(data);
    updateIvFrische(ivDatenfrische);
    // Annahme: Die API liefert ein Objekt in data.result mit folgenden Feldern:
    // - notes: Beschreibung der Galerie
    // - title: (optional) Titel der Galerie
    // - resources: Array von Objekten mit Bilddaten (url, name, description)
    const galleryInfo = {
      title: data.result.title || "Galerie",
      notes: data.result.notes || "",
    };

    // Filtere Ressourcen, die Bild-URLs enthalten
    const imageData = (data.result.resources || [])
      .filter((resource) => /\.(jpe?g|png|gif|webp)$/i.test(resource.url))
      .map((resource) => ({
        url: resource.url,
        title: resource.name || "Kein Titel",
        description: resource.description || "",
      }));

    if (imageData.length === 0) {
      document.getElementById("app-container").innerHTML =
        "<p>Keine Bilder gefunden. Bitte versuche es später erneut.</p>";
      return;
    }

    // Zeige die Startseite mit Galerieübersicht
    showStartPage(galleryInfo, imageData);
  } catch (err) {
    console.error("Fehler beim Laden der Galerie-Daten:", err);
    document.getElementById("app-container").innerHTML =
      "<p>Fehler beim Laden der Galerie-Daten. Bitte versuche es später erneut.</p>";
  }
}

/**
 * Zeigt die Startseite an, die den Galerietitel, die Beschreibung (notes) und einen Button zum Starten der Slideshow enthält.
 * @param {Object} galleryInfo - Enthält title und notes der Galerie
 * @param {Array} imageData - Array mit Bildobjekten (url, title, description)
 */
function showStartPage(galleryInfo, imageData) {
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="text-center">
      <h1>${galleryInfo.title}</h1>
      <p>${galleryInfo.notes}</p>
      <button id="start-slideshow" class="btn btn-primary">Slideshow starten</button>
    </div>
    <div class="gallery-preview mt-4">
      ${imageData
        .slice(0, 6)
        .map((image) => `<img src="${image.url}" alt="${image.title}">`)
        .join("")}
    </div>
  `;

  document
    .getElementById("start-slideshow")
    .addEventListener("click", function () {
      startSlideshow(imageData, galleryInfo);
    });
}

/**
 * Startet die Slideshow, in der nacheinander alle Bilder samt Titel und Beschreibung angezeigt werden.
 * Es wird zusätzlich ein "Zurück zur Startseite"-Button eingebaut.
 * @param {Array} imageData - Array mit Bildobjekten (url, title, description)
 * @param {Object} galleryInfo - Enthält title und notes der Galerie (zur Rückkehr zur Startseite)
 */
function startSlideshow(imageData, galleryInfo) {
  const container = document.getElementById("app-container");
  // Neue HTML-Struktur für die Slideshow mit eigener Anordnung der Buttons und Info-Bereich
  container.innerHTML = `
    <div id="slideshow" class="slideshow-container text-center">
      <div class="image-container mb-3">
        <img id="slide-image" src="" alt="Bild" class="img-fluid" style="max-height: 70vh;">
      </div>
      <div class="info-container mb-3">
        <h3 id="slide-title" class="slide-title"></h3>
        <p id="slide-description" class="slide-description"></p>
      </div>
      <div class="button-container d-flex justify-content-around">
        <button id="prev-slide" class="btn btn-secondary">Vorherige</button>
        <button id="back-to-home" class="btn btn-secondary">Zurück zur Startseite</button>
        <button id="next-slide" class="btn btn-secondary">Nächste</button>
      </div>
    </div>
  `;

  let currentIndex = 0;

  // Funktion zum Aktualisieren der Anzeige
  function updateSlide() {
    const currentImage = imageData[currentIndex];
    document.getElementById("slide-image").src = currentImage.url;
    document.getElementById("slide-title").textContent = currentImage.title;
    document.getElementById("slide-description").textContent =
      currentImage.description;
  }

  // Eventlistener für Navigationsbuttons
  document.getElementById("prev-slide").addEventListener("click", function () {
    currentIndex = (currentIndex - 1 + imageData.length) % imageData.length;
    updateSlide();
  });

  document.getElementById("next-slide").addEventListener("click", function () {
    currentIndex = (currentIndex + 1) % imageData.length;
    updateSlide();
  });

  // Eventlistener für den Zurück-Button
  document
    .getElementById("back-to-home")
    .addEventListener("click", function () {
      showStartPage(galleryInfo, imageData);
    });

  // Initiale Anzeige
  updateSlide();
}

var ivDatenfrische = null;

function methodikBox(configdata) {
  var hinweis = String(configdata.datenquelleHinweis || "").trim();
  var stand = String(configdata.datenStand || "").trim();
  if (!hinweis && !stand) return "";
  var standZeile = stand
    ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
    : "";
  return (
    '<section class="iv-methodik mt-4">' +
    '<button class="iv-methodik-toggle collapsed" type="button" ' +
    'data-bs-toggle="collapse" data-bs-target="#iv-methodik-body" ' +
    'aria-expanded="false" aria-controls="iv-methodik-body">' +
    '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
    '<span class="iv-methodik-chevron" aria-hidden="true">&#9662;</span>' +
    "</button>" +
    '<div id="iv-methodik-body" class="collapse">' +
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

function updateIvFrische(stand) {
  var el = document.getElementById("iv-datenfrische");
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
