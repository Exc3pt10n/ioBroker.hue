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

### Release

Releases entstehen automatisch über den zentralen Workflow aus
[Exc3pt10n/ioBroker-workflows](https://github.com/Exc3pt10n/ioBroker-workflows) (eingebunden in
`.github/workflows/test.yml` über `@v1`). Nach einem Merge auf `master` laufen alle Checks; nur wenn sie grün
sind und die Version aus `package.json` noch keinen Tag hat, legt der Release-Job an:

- den annotierten Tag `vX.Y.Z`,
- ein GitHub-Release mit den Notes aus dem Changelog-Abschnitt der README und dem fertig gebauten
  `iobroker.hue-v2-X.Y.Z.tgz` als Asset,
- den Branch `release`, der auf den neuen Tag vorgespult wird.

Tags, Releases und den Branch `release` also nie selbst anlegen oder pushen – insbesondere nicht bei einem
Versionssprung auf einem Feature-Branch. Ist lokal versehentlich ein Tag entstanden, ihn mit
`git tag -d vX.Y.Z` wieder löschen. Ein Merge ohne Versionssprung (z. B. nur Werkzeuge) erzeugt kein Release.

Der `release-guard` im Workflow prüft die Regeln oben maschinell: Ändert ein Pull Request ausgelieferte Dateien
(`files`/`main` aus `package.json`, `io-package.json`, `src/`) oder Laufzeit-Abhängigkeiten, muss die Version
erhöht und vollständig eingetragen sein.

## Installation aus GitHub

Der Adapter wird nicht auf npm veröffentlicht. Installiert wird aus GitHub:

- stabil: `https://github.com/Exc3pt10n/ioBroker.hue-v2/tarball/release` (nur freigegebene Releases),
- fertig gebaut: das `.tgz` am jeweiligen GitHub-Release (kein Build beim Nutzer),
- Entwicklungsstand: `https://github.com/Exc3pt10n/ioBroker.hue-v2/tarball/master`.

Bei der Installation aus GitHub baut npm den Adapter über das Skript `prepare` selbst. Deshalb darf
`common.nogit` in `io-package.json` **nicht** gesetzt werden (der `release-guard` prüft das), alles, was der
Build braucht, muss in `devDependencies` stehen, und `@iobroker/testing` bleibt bei 5.x (6.x lehnt `prepare` ab).

## Automatische Tests (GitHub Actions)

`.github/workflows/test.yml` ruft den zentralen Workflow auf. Er läuft für Pull Requests, Pushes auf `master`
und wöchentlich:

- Pull Requests und `master`: Lint, Typprüfung, Build, Unit- und Paket-Tests auf Node 22 und 24,
  Integrationstest, Installationstest (Installation aus Git mit `prepare`-Build wie bei `iobroker url`),
  `npm audit` der Laufzeit-Abhängigkeiten und bei Pull Requests der `release-guard`
- wöchentlich: volle Matrix Linux und Windows, Node 22, 24 und 26

Pflicht-Check im Branch-Schutz von `master` ist `adapter / ci-result`. Der Branch `release` darf nicht
geschützt werden, sonst kann der Release-Job ihn nicht vorspulen.

Änderungen an den Checks oder am Release gehören in das zentrale Repo, nicht in diesen Adapter. Wird die
Node-Mindestversion geändert: `engines` in `package.json`/`package-lock.json`, README (Voraussetzungen) und
ggf. den Parameter `node-versions` in `test.yml` gemeinsam anpassen.

Dependabot mergt nur Entwicklungs-Abhängigkeiten automatisch (`.github/auto-merge.yml`). Updates von
Laufzeit-Abhängigkeiten brauchen einen Patch-Release und werden von Hand gemergt.

## Prüfen vor dem Push

```bash
npm run lint && npm run check && npm test && npm run build
```

Den `release-guard` lokal ausführen (mit einem Klon von ioBroker-workflows daneben):

```bash
node ../ioBroker-workflows/scripts/check-release.mjs pr --base origin/master
```

Bei Änderungen an `src/main.ts` oder `src/lib/hue/` zusätzlich:

```bash
npm run test:integration
```
