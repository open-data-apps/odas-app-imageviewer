# Changelog

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
