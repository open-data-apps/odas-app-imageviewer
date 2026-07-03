# ODAS App Imageviewer

Imageviewer-App für den Open Data App-Store (ODAP)

Die App zeigt Bilder in Form einer Galerie an.

Die App ist eine "ODAP App V1".

## Funktionen

- Anzeige einer Bildersammlung als Galerie
- Slideshow mit Navigation (vor/zurück) und Bildinformationen
- Vorschaugitter auf der Startseite
- Datenfrische-Indikator (CKAN metadata_modified)

## Für wen ist diese App?

Diese Bildergalerie präsentiert kuratierte Bildsammlungen. Sie richtet sich an Bürger:innen, Tourist:innen und Forscher:innen mit Interesse an visueller Dokumentation.

## Entwicklung

Das Frontend setzt auf Vanilla JS und Bootstrap 5.3.

### Aufbau der App

#### Desktop Version

![Alt-Text](/assets/Desktop_Screenshot.png)

#### Mobile Version

![Alt-Text](/assets/Mobile_Screenshot.png)

### Lokale Entwicklung mit VS Code Live Server

Die App kann mit VS Code Live Server aus der Projektwurzel gestartet werden. Öffne dann `http://127.0.0.1:<live-server-port>/app/`; Live Server nutzt standardmäßig Port `5500`.

### Start der App

    $ make build up
    $ curl http://localhost:8082

## Autor

(C) 2025, Ondics GmbH
