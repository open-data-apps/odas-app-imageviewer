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
function app(configData, enclosingHtmlDivElement) {
  // Da der Hauptinhalt bereits existiert, wird dieser Knoten genutzt.
  // Füge einen internen Container für die App-Inhalte ein.
  enclosingHtmlDivElement.innerHTML = `<div id="app-container"></div>`;

  // Starte das Laden der Galerie-Daten
  fetchGalleryData(configData.apiurl); // apiurl wird komplett klein geschrieben
}

/**
 * Extrahiert den Pfad aus einer vollständigen URL.
 * @param {string} url
 * @returns {string}
 */
function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch (e) {
    return url;
  }
}

/**
 * Lädt die Galerie-Daten aus der API (über Proxy) und startet die Darstellung.
 * @param {string} apiurl - URL zur API
 */
async function fetchGalleryData(apiurl) {
  // Aktuellen Pfad extrahieren, z. B. /view/odpname/appname/instanzid
  const fullPath = window.location.pathname.replace(/\/+$/, "");
  // Proxy-Endpunkt zusammensetzen
  const proxyEndpoint = `${fullPath}/odp-data?path=${extractPathFromUrl(
    apiurl
  )}`;

  try {
    const response = await fetch(proxyEndpoint, { method: "POST" });
    if (!response.ok) throw new Error("Fehler beim Abrufen der Proxy-Daten");
    const proxyData = await response.json();
    let data;
    try {
      data = JSON.parse(proxyData.content);
    } catch (e) {
      document.getElementById("app-container").innerHTML =
        "<p>Fehler beim Parsen der Galerie-Daten.</p>";
      return;
    }
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

/*
 * Diese Funktion kann Bibliotheken und benötigte Skripte laden.
 * Sie hängt den zurückgegebenen HTML Code in die Head Section an.
 *
 * @returns {string} - HTML mit script, link, etc. Tags
 */
function addToHead() {
  return ``;
}
