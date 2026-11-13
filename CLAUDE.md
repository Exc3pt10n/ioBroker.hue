# Hinweise für die Weiterentwicklung

`hue-v2` ist ein Fork des offiziellen `hue`-Adapters auf Basis der Hue API v2. Er heißt bewusst anders,
damit er parallel zum offiziellen Adapter installiert werden kann (Instanzen `hue-v2.<n>`).

## Aufbau

- `src/main.ts` – Adapter: Lebenszyklus, Abgleich der Objekte, Events, Steuerbefehle
- `src/lib/hue/` – Hue-API-v2-Client: REST, Eventstream (SSE), Befehlswarteschlange, Bridge-Suche
- `src/lib/model.ts`, `src/lib/commands.ts`, `src/lib/color.ts` – reine Logik ohne Adapterzugriff
  (Objektbaum und State-Werte aus den Ressourcen, State-Writes → v2-Befehle, Farbumrechnung)
- `test/unit/` – Unit-Tests der reinen Logik, `test/integrationAdapter.ts` – Integrationstests
  gegen eine simulierte Bridge (`test/integration/mockBridge.ts`), Fixtures in `test/fixtures.ts`

## Versionierung

Jede Änderung, die gemergt werden soll, zieht die Adapter-Version **einmal pro Pull Request** hoch.
Solange die Version eine Vorabversion ist (`4.0.0-alpha.N`), wird nur `N` erhöht. Danach gilt
Semantic Versioning:

| Änderung | Version |
|---|---|
| Neue Funktion | Minor: 4.0.0 → 4.1.0 |
| Fehlerbehebung, kleine Verbesserung | Patch: 4.1.0 → 4.1.1 |
| Inkompatible Änderung (Objektstruktur, Einstellungen) | Major, im Changelog als **BREAKING** markiert |

Bei mehreren Änderungen in einem Pull Request gilt die höchste Stufe.

Ausnahme: Reine Änderungen an Entwicklungswerkzeugen ohne Auswirkung auf Nutzer (CI-Workflows,
Tests, Lint-Konfiguration, `CLAUDE.md`) brauchen keine neue Version.

Anzupassen sind jeweils:

- `package.json` und `package-lock.json` (Feld `version`, im Lockfile oben und unter `packages[""]`)
- `io-package.json`: `common.version` und ein neuer Eintrag ganz oben in `common.news`
  (alle Sprachen: en, de, ru, pt, nl, fr, it, es, pl, uk, zh-cn; höchstens 20 Einträge behalten)
- `README.md`: Abschnitt `### <version> (<datum>)` oben im Changelog, Einträge im Stil `- (Exc3pt10n) …`

Wird ein Pull Request erweitert, bevor er gemergt ist, bleibt es bei dieser einen Erhöhung
(ggf. die Stufe anheben). Nach einem Merge beginnt die nächste Änderung mit einer neuen Erhöhung.

### Versions-Tags

Nach dem Merge auf `master` setzt `.github/workflows/tag-release.yml` automatisch den annotierten Tag
`vX.Y.Z` (Version aus `package.json`), sofern es ihn noch nicht gibt. Tags also nie selbst pushen –
insbesondere nicht bei einem Versionssprung auf einem Feature-Branch. Ist dort lokal versehentlich ein
Tag entstanden, ihn mit `git tag -d vX.Y.Z` wieder löschen.

## Installation aus GitHub

Der Adapter wird nicht auf npm veröffentlicht, sondern über
`https://github.com/Exc3pt10n/ioBroker.hue-v2/tarball/master` installiert. npm baut ihn dabei über das
Skript `prepare` selbst. Deshalb darf `common.nogit` in `io-package.json` **nicht** gesetzt werden, und
alles, was der Build braucht, muss in `devDependencies` stehen.

## Automatische Tests (GitHub Actions)

`.github/workflows/test.yml` läuft für Pull Requests und Pushes auf `master` (nicht für jeden Branch-Push,
sonst doppelt): Lint, Typprüfung, Build und Tests auf den unterstützten Node-Versionen (22, 24),
der Integrationstest einmal auf Node 22. Ältere Läufe desselben Branches werden abgebrochen.
`.github/workflows/tag-release.yml` setzt nach jedem Push auf `master` den Versions-Tag (siehe oben).
Beide Workflows entsprechen denen von ioBroker.SmartVis (dort Branch `main`) und sollen synchron bleiben.
Wird die Node-Mindestversion geändert: `engines` in `package.json`/`package-lock.json`,
README (Voraussetzungen) und die Matrix im Workflow gemeinsam anpassen.

## Prüfen vor dem Push

```bash
npm run lint && npm run check && npm test && npm run build
```

Bei Änderungen an `src/main.ts` oder `src/lib/hue/` zusätzlich:

```bash
npm run test:integration
```
