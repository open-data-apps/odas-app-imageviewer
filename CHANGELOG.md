# Changelog

## 1.23.3 - 2026-09-10
- **FIX (IV-B1):** Kein Lifecycle-Schutz: nach einem Seitenwechsel liefen späte Antworten in einen `TypeError`, weil der eigene Untercontainer nicht mehr existiert (`#iv-app-container` ohne Null-Prüfung). Jetzt Instanz-Registry, `onPageLeave`, `AbortController` und `disposed`-Prüfungen vor jedem Schreiber.
- **FIX (IV-B2):** Bilder wurden nur über die Datei-Endung erkannt — CKAN-Ressourcen mit Query-String (`bild.jpg?download=1`) oder ohne Endung (`format: "JPEG"`) fielen lautlos heraus. Jetzt zählt zusätzlich `format`/`mimetype`; der akzeptierte Typumfang bleibt unverändert.
- **FIX (IV-B3):** `<img>` ohne Fehler- und Ladezustand: kaputte Bilder wurden als Browser-Platzhalter gezeigt, und ein leeres `src` konnte die aktuelle Seite erneut anfordern. Jetzt `onerror`-Behandlung (Vorschau + Slideshow), `loading="lazy"`, `decoding="async"` und keine leeren `src`-Werte.
- **FIX (IV-B4):** Barrierefreiheit: `alt` trägt jetzt den Bildtitel (statt „Bild"), die Slideshow ist per Pfeiltasten bedienbar, der Infobereich nutzt `aria-live="polite"` und nennt die Position („Bild 3 von 24").
- **FIX (IV-B5):** Die Vorschau kürzte stillschweigend auf sechs Bilder — jetzt mit Hinweis „Vorschau: 6 von 24 Bildern."
- **TECH (IV-B6):** `isLeerErgebnis` entfernt; `fetchOdasResource`/`fetchOdasJson` reichen `signal` durch und werfen `AbortError` unverpackt.

## 1.23.2 - 2026-09-08
- **FIX:** Variante-A-Verdrahtung (F-92): Typprüfung (ckan-ps) vor dem ersten Fetch; Quellen- und Ladefehler über `renderOdasFehler` (1.23.1 -> 1.23.2).

## 1.23.1 - 2026-09-07
- **FIX:** Frictionless-Härtung: `assets/schema.json` enthielt Code-Bezeichner statt Datenfelder — ersetzt durch Ressourcen-Metadaten (url/name/description/format, per Code-Lesung belegt); `daten.beispiel`/`beispiel-url` befüllt. package_show-Default bleibt (4B-Ausnahme, Rot-Beleg im REPORT).

## 1.23.0 - 2026-08-25
- **CHG:** Datensatz-Link in der Beschreibung nutzt den neuen Shortcode `{{{appinstanz.urlDaten}}}` und zeigt damit auf den tatsächlich gebuchten Datensatz statt auf eine feste Beispiel-URL.


## 1.22.0 - 2026-08-25
- **CHG:** Proxy-Aufruf sendet die vollständige Ziel-URL statt nur Pfad+Query, damit die neue Origin-Allowlist-Prüfung der ODAS-Plattform greift (bisher implizite Auflösung gegen den ersten konfigurierten `apiurl`).
- **FIX:** Tote `appconfig.*`-Shortcodes entfernt: Paket-Defaults für `apiurls`/`urlDaten` führen echte Beispiel-URLs, Links nutzen `{{{appinstanz.apiurls.1}}}`; lokale config.json bereinigt.
- **FIX:** Tote Anbieter-Shortcodes in Kontakt/Impressum ersetzt (`{{odp.anbieter.url-extern}}` → `{{odp.anbieter.url}}`, `tel:{{odp.anbieter.telcode}}` → `tel:{{odp.anbieter.tel}}`).


## 1.21.0 - 2026-08-22
- **CHG:** `api-version` im Paket vor `instanz-config` verschoben (Template-Reihenfolge, keine Inhaltsänderung).

## 1.20.0 - 2026-08-22
- **CHG:** `version` in `app-package.json` zu `app-version` umbenannt.
- **ENH:** Top-Level-Feld `app-package-version` ergänzt (Wert `"2"`: mehrere benannte API-URLs über `instanz-config.apiurls`).

## 1.19.0 - 2026-08-21
- **CHG:** Skalares `apiurl` durch das Array-Feld `apiurls` ersetzt (`typ: "array"`, Eintrag `bilder`). Neuer Standard portfolioweit; `apiurl` entfällt. `app.js` liest die Datenquelle jetzt über `getOdasApiUrl(configdata, "bilder")`.

## 1.18.0 - 2026-08-20
- Markdown-Metadaten: Paketbeschreibungen auf echtes Markdown umgestellt, exakte Identität Top-Level/Instanz hergestellt, lokale HTML-Fixture semantisch gespiegelt.

## 1.17.0 - 2026-08-17
- `urlDaten.default` nutzte keinen Auto-Fill-Platzhalter, obwohl `apiurl.default` bereits `{{appconfig.datensatz-apiurl}}` verwendet; jetzt mit dem fehlenden Gegenstück `{{appconfig.datensatz-url}}` (Muster: `odas-app-parkflaechen`/`odas-app-poi`), `beispiel` auf die bereits verifizierte Datensatzseite gesetzt (F-68)
- `apiurl.hilfe` verwendete das Wort „Datensatz" für das Feld, das explizit NICHT die Datensatzseite sein soll (plus Tippfehler „Ressoucen"); jetzt mit expliziter Abgrenzung zu `urlDaten` formuliert (F-68)

## 1.16.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)
- `urlDaten` zeigte auf einen nicht mehr existierenden Host (`offenedaten.esslingen.de`/`open-data-esslingen.de`, NXDOMAIN) bzw. auf den Platzhalter `.../testdaten` (HTTP 404) — jetzt auf die reale Datensatz-Landingpage der tatsächlich konfigurierten `apiurl`-Quelle verweisend, live per HTTP-Abruf verifiziert (F-67)

## 1.15.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.14.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.13.0 - 2026-08-07
- FIX: Bootstrap-Ziele instanzeindeutig machen (F-32): `data-bs-target`, `aria-controls` und die div-ID der Methodik-Box (`iv-methodik-body`) werden pro App-Instanz mit einer UID (`iv-methodik-body-i1`, `i2`, …) versehen, damit mehrere Instanzen der App auf einer Seite nicht kollidieren

## 1.12.0 - 2026-08-06
- CHG: DOM-Zugriffe auf den App-Container gescopt (F-25): alle Elemente der App werden über den App-Container (root.querySelector) angesprochen statt über document; unpräfixierte IDs mit `iv-`-Präfix versehen (`app-container` → `iv-app-container`, `start-slideshow` → `iv-start-slideshow`, `slide-image` → `iv-slide-image`, `slide-title` → `iv-slide-title`, `slide-description` → `iv-slide-description`, `prev-slide` → `iv-prev-slide`, `next-slide` → `iv-next-slide`, `back-to-home` → `iv-back-to-home`)

## 1.11.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.10.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.9.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.8.0 - 2026-08-04
- FIX: Bootstrap vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.7.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)
- FIX: lokale `odas-config/config.json`: leeres Pflichtfeld `datenschutz` mit dem App-Paket-Default befuellt

## 1.6.0 - 2026-07-31
- CHG: fehlendes Pflicht-Asset assets/branding.css ergaenzt und brandingCSSFile lokal aktiviert

## 1.5.0 - 2026-07-31
- FIX: URL-Attribute werden auf http/https geprüft (F-08); eine javascript:-URL aus der Datenquelle ist nicht mehr ausführbar
- FIX: escapeHtml() von der DOM- auf die Regex-Variante umgestellt (F-08); die alte Fassung maskierte " und ' nicht
- FIX: Maskierung auf alle Daten- und Attributkontexte ausgedehnt (F-08)
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: Platzhalter-Entwickler mueller-gmbh durch ondics-gmbh ersetzt (F-21)
- CHG: Platzhalter Mueller GmbH aus der Fußzeile entfernt (F-21)
- FIX: defekte Icon- und Screenshot-Referenzen korrigiert (F-19)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)

## 1.4.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`

## 1.3.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.2.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## v1.1.0 — 2026-07-03

- ENH: escapeHtml(), Methodik-Box (TODO 2), Weitere-Infos-Box (TODO 4) und Datenfrische-Indikator (TODO 3, CKAN metadata_modified) hinzugefügt (Schale 4, Prefix `iv-`)
- FIX: Doppelten `urldaten`-Schlüssel aus `instanz-config` entfernt (nur `urlDaten` behalten)
- ENH: Für-wen-Abschnitt in `beschreibung` ergänzt

## 22.11.2024

- ENH: Initial commit

## 28.11.2024

- ENH: Entfernung der Data.csv
- ENH: Images werden über .zip Datei importiert. Lokal oder über Url.

## 05.12.2024

- ENH: CSS mit Bootstrap Grid System überarbeitet
- ENH: Images werden über Api url eingelesen
- ENH: Eigenes Icon und Favcion hinzugefügt

## 20.02.2025

- ENH: Navigation durch die Galerie
