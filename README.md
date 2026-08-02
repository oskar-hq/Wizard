# Wizard Online

Selbstgehostete Online-Version des Stichspiels **Wizard** für 3 bis 6 Spieler –
deutschsprachig, ohne Build-Step, als einzelner Docker-Container betreibbar und
über einen Cloudflare Tunnel mit Freunden spielbar.

> Eigenständige Umsetzung der Spielregeln mit selbst gezeichneten Karten
> (CSS/SVG). Es werden keine Illustrationen oder Grafiken des Originalverlags
> verwendet.

## Kartengestaltung

Das Deck ist vollständig im Browser gezeichnet – kein einziges Bild, nur CSS
und SVG-Pfade. Über *Kartendesign* (Startseite oder Kopfzeile im Spiel) stehen
fünf Stile zur Wahl; die Einstellung gilt nur für den eigenen Browser, jeder am
Tisch kann ein anderes Design fahren:

| Design | Optik |
| ------ | ----- |
| **Linien** (Standard) | Helle Karten, geometrische Linienzeichnung in vier Farben |
| **Vollfarbe** | Kräftige Farbflächen, große Zahl, Symbol als Wasserzeichen |
| **Nacht** | Dunkle Karten mit leuchtenden Linien |
| **Schwarz-Rot** | Nur Schwarz und Rot wie ein klassisches Blatt (Rot/Gelb rot, Blau/Grün schwarz) |
| **Klassisch** | Gemalte Anmutung: Landschaft je Volk, Figuren als Silhouette, Goldrahmen, Runen, große Eckzahlen |

### Zum Design „Klassisch“

Es greift die *Anmutung* klassischer Fantasy-Spielkarten auf – Landschaft,
Silhouette, Zierrahmen, Runenzeichen und prominente Eckzahlen – ist aber eine
vollständig eigene Umsetzung. Jede Karte besteht aus einem CSS-Himmelsverlauf
und selbst gesetzten SVG-Formen:

- **Blau/Menschen** – Steinkreis unter Mondlicht (Gruß an die Rahmengeschichte)
- **Rot/Zwerge** – glühende Vulkankämme
- **Grün/Elfen** – Nadelwald in Dämmerung
- **Gelb/Riesen** – Bergmassiv vor tiefstehender Sonne
- **Figurenkarten** – Silhouetten mit Lichthof: *der Späher*, *die Hüterin*,
  *der Fürst*, *der Zauberer*, *der Narr*
- **Rückseite** – achtstrahliger Stern im Goldmedaillon

Illustrationen des Originalspiels werden weder verwendet noch nachgezeichnet.

Der Aufbau der Karten ist in den übrigen Designs gleich:

- **1** – ein großes Volks-Symbol im gestrichelten Zierring
- **2–10** – die klassische Symbolanordnung, untere Hälfte auf dem Kopf
- **11, 12, 13** – abstrakte Figuren aus geraden Linien, Kreisen und Dreiecken:
  Späher mit Federbusch und Speer, Hüterin mit Zackenreif, Fürst mit Krone,
  Spitzbart und Schwert
- **Zauberer** – Spitzhut mit Funken, langer Bart; **Narr** – Schellenkappe und
  Zackenkragen
- **Rückseite** – geometrisches Streumuster für den verdeckten Nachziehstapel

Die Volks-Symbole: Gestalt (Menschen/Blau), Schmiedehammer (Zwerge/Rot),
Blatt (Elfen/Grün), Bergmassiv (Riesen/Gelb).

## Spieltische

Unter *Aussehen* lässt sich neben dem Kartendesign auch der Hintergrund wählen.
Beides ist frei kombinierbar und gilt – wie das Kartendesign – nur für den
eigenen Browser.

| Tisch | Optik |
| ----- | ----- |
| **Nachtblau** (Standard) | Ruhiger dunkelblauer Verlauf, lenkt am wenigsten ab |
| **Casino-Filz** | Tiefgrünes Filztuch unter einem Lichtkegel, Rand abgedunkelt |
| **Alter Holztisch** | Dunkle Bretter mit Maserung und Fugen, warm von oben beleuchtet |
| **Strand** | Abendlicher Sand mit Meer und tiefstehender Sonne am Horizont |
| **Zaubererturm** | Violette Nacht mit Sternenfeld |
| **Kaminzimmer** | Dunkles Leder mit Feuerschein von unten links |

Auch die Tische sind reine Farbverläufe – es wird nichts nachgeladen. Jeder
Tisch bringt seine eigene Szene mit:

- **Casino** – Roulettekessel mit Holzrand, Kreuz und 37 Fächern, ein Setzfeld
  aus zwölf Spalten und drei Reihen, verstreute Jetons, Filzgewebe und wolkige
  Tuchtiefe
- **Holz** – Bretter mit Lichtkante und Schattenfuge, Astlöcher mit
  Jahresringen, Maserung aus vier Perioden mit leicht verkippten Winkeln, damit
  kein Streifenmuster entsteht
- **Strand** – Himmel, Meer mit Wellenkämmen, Gischtsaum, tiefstehende Sonne,
  auslaufende Wellen auf nassem Sand, Muscheln und Dünenschatten
- **Zaubererturm** – Mond mit Kratern, Nebelschwaden, Turmsilhouette und ein
  Sternenfeld aus sieben Ebenen mit teilerfremden Kachelmaßen (gleich große
  Kacheln ergäben ein sichtbares Raster)
- **Kaminzimmer** – gesteppte Lederrauten mit Ziernägeln in den Kreuzungspunkten,
  Ledernarbung und Feuerschein von unten links

### Keine Leisten, kein Weichzeichner

Kopfzeile und Kartenablage sind keine Balken mehr: Statt einer Leiste mit
Trennlinie und Weichzeichner läuft nur noch ein weicher Verlauf in den Tisch
aus. Rundenzahl, Raum-Code, Trumpfkarte und Knöpfe liegen damit sichtbar auf der
Szene und bekommen dafür einen eigenen dunklen Grund, damit sie auf Filz, Holz
oder Sand gleichermaßen stehen.

Damit die helle Schrift überall lesbar bleibt, sind alle Tische bewusst dunkel
gehalten; helle Motive wie Strand und Holz bekommen zusätzlich eine
Randabdunklung, und die Texte auf dem Tisch tragen einen leichten Schatten.

---

## Auf einen Blick

- **Autoritativer Server:** Handkarten liegen ausschließlich serverseitig. Jeder
  Client bekommt nur seine eigenen Karten (`your_hand`) und den öffentlichen
  Tischzustand (`game_state`). Jeder Zug wird auf dem Server auf Regelkonformität
  geprüft – illegale Karten werden abgelehnt.
- **Kein Build-Step:** Frontend ist Vanilla HTML/CSS/ES-Modules. Keine Bundler,
  keine Toolchain, kleines Image.
- **Reconnect:** Jeder Spieler bekommt beim Beitritt ein Session-Token
  (localStorage). Nach einem Verbindungsabbruch (WLAN, Handy im Standby,
  Discord-Drop) landet er automatisch wieder auf seinem Platz – mit seiner Hand.
  Den anderen wird angezeigt, wer gerade verbunden bzw. getrennt ist.
- **Ein Port für alles:** HTTP und WebSocket laufen über denselben Host/Port
  (`/ws`) – genau das, was ein Cloudflare Tunnel braucht.
- **Responsive:** funktioniert am Desktop und am Handy.
- **Regelerweiterungen:** drei Varianten lassen sich im Warteraum einzeln
  zuschalten (siehe unten) – ohne Häkchen gilt exakt das Grundspiel.
- **Rundenanzahl frei wählbar:** Schieberegler im Warteraum, von einer Runde bis
  zum vollen Spiel.
- **Bots:** Der Host setzt beliebig viele Mitspieler-Bots dazu; sie sagen an und
  spielen selbst. Damit geht es schon ab einem Menschen los.
- **Abbruch jederzeit:** Der Host kann eine laufende Partie beenden – alle landen
  wieder im Warteraum.
- **Fünf Kartendesigns und sechs Spieltische:** frei kombinierbar und pro
  Spieler umschaltbar – alles aus CSS/SVG, keine Bilddateien.

---

## (a) Lokal starten

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm start                  # http://localhost:3000
```

Anderen Port verwenden:

```bash
PORT=8080 npm start
```

Mit Auto-Reload beim Entwickeln:

```bash
npm run dev
```

### Tests

Die komplette Spiel-Engine und das WebSocket-Protokoll sind automatisiert
getestet (Node-eigener Testrunner, keine zusätzlichen Abhängigkeiten):

```bash
npm test
```

Abgedeckt sind u. a.: Deckaufbau (60 Karten), Rundenzahl je Spielerzahl,
gültige Ansagen, Bedienpflicht, Zauberer-/Narr-Sonderfälle, Stichauflösung,
Wertung, Trumpfbestimmung inkl. Trumpfwahl durch den Geber, die letzte Runde
ohne Trumpf, vollständige Spieldurchläufe mit 3–6 Spielern, alle drei
Regelerweiterungen, Rundenanzahl, Bot-Entscheidungen und Spielabbruch sowie
Lobby, Zug-Validierung, Handkarten-Privatheit und Reconnect über echte
WebSockets.

---

## (b) Betrieb als Container

### docker compose (empfohlen)

```bash
docker compose up -d --build
docker compose logs -f
```

Der Container bindet standardmäßig auf `127.0.0.1:3000` – von außen erreichbar
wird er erst über den Cloudflare Tunnel (siehe unten). Soll er im LAN direkt
erreichbar sein, in `docker-compose.yml` die Portzeile auf `'3000:3000'` ändern.

Anderen Port verwenden (wirkt innen und außen):

```bash
PORT=8080 docker compose up -d --build
```

### Ohne compose

```bash
docker build -t wizard-online .
docker run -d --name wizard-online --restart unless-stopped \
  -e PORT=3000 -p 127.0.0.1:3000:3000 wizard-online
```

### Umgebungsvariablen

| Variable           | Default   | Bedeutung                                             |
| ------------------ | --------- | ----------------------------------------------------- |
| `PORT`             | `3000`    | Port für HTTP + WebSocket                             |
| `HOST`             | `0.0.0.0` | Bind-Adresse                                          |
| `WIZARD_TRICK_MS`  | `2600`    | Wie lange ein fertiger Stich liegen bleibt (ms)       |
| `WIZARD_ROUND_MS`  | `15000`   | Wie lange die Rundenwertung ohne Klick stehen bleibt  |
| `WIZARD_BOT_MS`    | `900`     | Bedenkzeit eines Bots je Zug (ms)                     |

Gesundheitscheck: `GET /healthz` → `{"ok":true,"rooms":N,"uptime":S}`

Der Spielzustand liegt komplett im Arbeitsspeicher. Ein Neustart des Containers
beendet laufende Partien – das ist so gewollt (keine Datenbank nötig).

---

## (c) Öffentlicher Zugriff über den Cloudflare Tunnel

Der Tunnel muss nur auf den Container-Port zeigen. WebSockets unterstützt
`cloudflared` von Haus aus – es ist **keine** Sonderkonfiguration nötig, weil
HTTP und WebSocket über denselben Hostnamen und Port laufen.

### Variante 1: über das Cloudflare-Dashboard

1. **Zero Trust → Networks → Tunnels** → deinen Tunnel wählen → **Configure**.
2. Reiter **Public Hostname** → **Add a public hostname**.
3. Eintragen:
   - **Subdomain:** z. B. `wizard`
   - **Domain:** deine Domain, z. B. `example.com`
   - **Type:** `HTTP`
   - **URL:** `localhost:3000` (bzw. dein `PORT`)
4. Speichern. Nach wenigen Sekunden ist das Spiel unter
   `https://wizard.example.com` erreichbar.

> Läuft `cloudflared` **nicht** auf demselben Host wie der Container (z. B.
> `cloudflared` in einem eigenen LXC/VM auf Proxmox), dann statt `localhost` die
> IP des Docker-Hosts eintragen, z. B. `http://192.168.1.50:3000` – und in
> `docker-compose.yml` die Portbindung von `127.0.0.1:3000:3000` auf `3000:3000`
> ändern, damit der Port im LAN erreichbar ist.

### Variante 2: über `config.yml` (lokal verwalteter Tunnel)

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /etc/cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: wizard.example.com
    service: http://localhost:3000
  - service: http_status:404
```

Danach:

```bash
cloudflared tunnel route dns <TUNNEL-ID> wizard.example.com
sudo systemctl restart cloudflared
```

### Kurz testen

```bash
curl -s https://wizard.example.com/healthz
```

Wenn das `{"ok":true,…}` liefert, funktioniert auch der WebSocket – er läuft
über denselben Hostnamen (`wss://wizard.example.com/ws`).

---

## (d) Update einspielen, ohne die laufende Installation zu zerstören

Zwei Punkte vorweg, weil beides beim Umstellen relevant ist:

- **Der Spielzustand liegt im Arbeitsspeicher.** Jeder Container-Neustart
  beendet laufende Partien. Also dann umschalten, wenn niemand spielt.
- **Die statischen Dateien werden ohne Cache-Dauer ausgeliefert** (nur mit
  ETag). Nach einem Update genügt für die Mitspieler ein normales Neuladen –
  es hängt kein altes JavaScript stundenlang im Browser-Cache.

### Variante A: parallel testen, dann umschalten (empfohlen)

Die alte Installation bleibt dabei komplett unberührt und läuft weiter.

```bash
# 1. Neuen Stand in ein SEPARATES Verzeichnis holen
cd ~
git clone -b claude/wizard-online-multiplayer-7squ9z <REPO-URL> wizard-neu
cd wizard-neu

# 2. Auf einem zweiten Port und unter eigenem Namen starten
PORT=3001 CONTAINER_NAME=wizard-test IMAGE_TAG=test \
  docker compose -p wizard-test up -d --build

curl -s localhost:3001/healthz     # → {"ok":true,...}
```

Im Cloudflare Tunnel einen **zweiten** Public Hostname anlegen, z. B.
`wizard-test.example.com` → `http://localhost:3001`. Damit lässt sich die neue
Version in Ruhe ausprobieren, während unter der alten Adresse weitergespielt
werden kann.

Wenn alles passt, umschalten:

```bash
# Alte Instanz stoppen (nur wenn niemand spielt)
cd ~/wizard-online && docker compose down

# Testinstanz stoppen und die neue Version auf den Originalport bringen
cd ~/wizard-neu
docker compose -p wizard-test down
PORT=3000 docker compose up -d --build
docker compose logs -f
```

Danach den Test-Hostname im Tunnel wieder entfernen. **Zurück** geht es
jederzeit mit:

```bash
cd ~/wizard-neu && docker compose down
cd ~/wizard-online && docker compose up -d          # alter Stand, alter Code
```

### Variante B: im vorhandenen Verzeichnis aktualisieren (schnell)

```bash
cd ~/wizard-online

# Rückfahrkarte: aktuellen Stand als Image und Commit festhalten
docker image tag wizard-online:latest wizard-online:backup
git rev-parse HEAD > /tmp/wizard-alter-commit.txt

git fetch origin
git checkout claude/wizard-online-multiplayer-7squ9z
git pull --ff-only

docker compose up -d --build
docker compose logs -f
curl -s localhost:3000/healthz
```

Falls etwas nicht stimmt:

```bash
cd ~/wizard-online
git checkout "$(cat /tmp/wizard-alter-commit.txt)"
docker compose up -d --build
```

oder direkt das gesicherte Image, ohne Neubau:

```bash
docker compose down
docker run -d --name wizard-online --restart unless-stopped \
  -e PORT=3000 -p 127.0.0.1:3000:3000 wizard-online:backup
```

### Kurze Abnahmeliste nach dem Update

```bash
curl -s localhost:3000/healthz          # Server lebt
docker compose logs --tail=30           # keine Fehler beim Start
npm test                                # optional, direkt im Repo
```

Im Browser: Startseite lädt, *Aussehen* zeigt fünf Kartendesigns und sechs
Spieltische, Raum erstellen, zwei Bots dazusetzen, starten – dann läuft alles
Wesentliche.

---

## Spielablauf

1. **Startseite:** Namen eingeben → *Raum erstellen* (liefert einen 4-stelligen
   Code) oder *Raum beitreten* per Code.
2. **Warteraum:** Alle Anwesenden werden gelistet. Der Host stellt Bots,
   Rundenanzahl und Regelerweiterungen ein und startet ab 3 Spielern (max. 6).
3. **Runde:** Karten werden gegeben, die Trumpfkarte aufgedeckt (bei einem
   Zauberer wählt der Geber die Farbe), dann sagt jeder reihum seine Stiche an,
   danach werden die Stiche gespielt.
4. Nach jeder Runde erscheint eine Wertungsübersicht; mit *Weiter* geht es
   sofort weiter, sonst automatisch nach `WIZARD_ROUND_MS`. Auf Bots wird dabei
   nicht gewartet.
5. Der Host kann die Partie über *Abbrechen* in der Kopfzeile jederzeit beenden –
   auch während ein Dialog offen ist, denn die Kopfzeile bleibt immer bedienbar.

## Rundenanzahl

Standardmäßig wird das volle Spiel gespielt: `floor(60 / Spielerzahl)` Runden.
Mit dem Schieberegler im Warteraum lässt sich die Partie beliebig kürzen, von
einer einzelnen Runde bis zum Maximum. Ändert sich die Spielerzahl noch, wird
der Wert automatisch auf das dann Mögliche begrenzt.

## Bots

Der Host setzt Bots über `+` und `−` an den Tisch, bis zu sechs Plätze
insgesamt. Bots

- schätzen ihre Hand ab und sagen entsprechend an (mit leichter Streuung, damit
  mehrere Bots nicht gleichförmig wirken),
- wählen bei aufgedecktem Zauberer die Farbe, in der sie am stärksten sind,
- stechen, wenn sie den Stich brauchen, und werfen sonst möglichst ungefährlich
  ab – in der Variante „Nur keine Stiche!“ immer defensiv,
- halten sich an die Bedienpflicht (der Server prüft es ohnehin) und
- sehen nur, was ein Mensch am Tisch auch sieht: die eigene Hand, den laufenden
  Stich, Trumpf und Ansagen.

Bots brauchen eine kurze Bedenkzeit (`WIZARD_BOT_MS`, Standard 900 ms), damit
man ihre Züge verfolgen kann. Ist kein Mensch verbunden, ruhen sie – beim
Reconnect geht es weiter.

## Regeln (verbindlich umgesetzt)

**Deck (60 Karten):** vier Farben – Blau (Menschen), Rot (Zwerge), Grün (Elfen),
Gelb (Riesen) – mit je den Werten 1–13, dazu 4 Zauberer und 4 Narren.

**Rundenzahl** = `floor(60 / Spielerzahl)` → 3 Spieler: 20, 4: 15, 5: 12, 6: 10.

**Trumpf:** Die oberste Karte des Reststapels wird aufgedeckt. Farbkarte → diese
Farbe ist Trumpf. Narr → kein Trumpf. Zauberer → der **Geber** bestimmt die
Trumpffarbe, nachdem er seine Handkarten gesehen hat. In der letzten Runde sind
alle Karten verteilt → kein Trumpf.

**Ansage:** reihum ab dem linken Nachbarn des Gebers, 0 … Rundennummer.

**Bedienpflicht:** Die zuerst ausgespielte Farbe muss bedient werden, wenn man
sie hat. **Zauberer und Narren dürfen immer gespielt werden.** Die Bedien-Farbe
legt die erste ausgespielte *Farbkarte* fest; eröffnet ein Zauberer, muss
niemand bedienen; eröffnet ein Narr, bestimmt die nächste Farbkarte die Farbe.

**Stichgewinner:** 1. der erste gespielte Zauberer, 2. sonst der höchste Trumpf,
3. sonst die höchste Karte der angespielten Farbe. Narren verlieren immer –
außer der Stich besteht nur aus Narren, dann gewinnt der erste.

**Punkte:** Ansage getroffen → `20 + 10 × Stiche`. Daneben →
`−10 × |Ansage − Stiche|`. Punkte werden über alle Runden aufsummiert (auch
negativ). Nach der letzten Runde gewinnt die höchste Gesamtpunktzahl.

---

## Regelerweiterungen

Der Host schaltet sie im Warteraum per Häkchen zu; alle im Raum sehen die
Auswahl sofort. Während einer laufenden Partie sind sie gesperrt. Ohne Häkchen
gilt exakt das Grundspiel.

### „Nur keine Stiche!“

Das Vermeidungsspiel: Es wird **nicht angesagt** – alle stehen automatisch auf
null und versuchen, möglichst gar keinen Stich zu bekommen. Jeder Stich bringt
**einen Strafpunkt**. Gespielt wird sonst genau wie sonst (Bedienpflicht,
Trumpf, Zauberer und Narren gelten unverändert; bei aufgedecktem Zauberer wählt
der Geber weiterhin die Trumpffarbe). Nach der letzten Runde gewinnt, wer die
**wenigsten** Punkte hat – die Oberfläche dreht Wertung, Tabellen und Endstand
entsprechend um.

### „Plus/minus Eins“

Die Summe aller Ansagen darf **nicht** der Stichzahl der Runde entsprechen. Da
der Geber zuletzt ansagt, trifft die Einschränkung ihn: Die eine passende Zahl
ist im Ansage-Dialog gesperrt und wird serverseitig abgelehnt. Es geht also nie
glatt auf – mindestens einer muss danebenliegen.

### „Verdeckte Ansage“

Alle sagen **gleichzeitig und geheim** an, in beliebiger Reihenfolge. Bis alle
abgegeben haben, sieht man nur, *wer* schon angesagt hat – die Zahlen bleiben
serverseitig unter Verschluss und werden erst gemeinsam aufgedeckt. Die eigene
Ansage sieht man natürlich jederzeit.

**Kombinationen:** „Nur keine Stiche!“ kennt keine Ansage und schaltet die
beiden anderen Varianten deshalb ab. „Plus/minus Eins“ lässt sich bei
gleichzeitiger Ansage nicht erzwingen und ist zusammen mit „Verdeckte Ansage“
gesperrt. Der Server normalisiert die Auswahl selbst – widersprüchliche
Kombinationen können also gar nicht entstehen.

---

## Projektstruktur

```
game/          Spiel-Engine – rein, ohne Netzwerk
  cards.js       Deck (60 Karten)
  rng.js         Seed-basierter Mischalgorithmus
  rules.js       Bedienpflicht, Stichauflösung, Wertung
  engine.js      Zustandsautomat einer Partie
server/
  app.js         Express + ws zusammengebaut (ohne listen)
  bot.js         Entscheidungen der Mitspieler-Bots
  index.js       Serverstart, Signal-Handling
  rooms.js       Räume, Spieler, Session-Token
  protocol.js    WebSocket-Nachrichten → Engine-Aufrufe
public/
  index.html     Alle Ansichten (Start, Lobby, Tisch, Dialoge)
  css/style.css  Optik inkl. selbst gezeichneter Karten
  js/            app.js, net.js, table.js, lobby.js, cards.js, decks.js,
                 tables.js, variants.js, store.js, dom.js
                 (cards.js enthält alle fünf Kartendesigns,
                  tables.js die sechs Spieltisch-Hintergründe)
  fonts/         Space Grotesk (SIL Open Font License 1.1), lokal eingebunden
test/          Engine- und Server-Tests (node --test)
```

## WebSocket-Protokoll

Alle Nachrichten sind JSON-Objekte mit einem `type`-Feld.

**Client → Server**

| Nachricht        | Felder                     |
| ---------------- | -------------------------- |
| `create_room`    | `name`                     |
| `join_room`      | `code`, `name`             |
| `reconnect`      | `code`, `playerId`, `token`|
| `leave_room`     | –                          |
| `set_variants`   | `variants` (nur Host)      |
| `set_rounds`     | `rounds` oder `null` (nur Host) |
| `add_bot`        | – (nur Host)               |
| `remove_bot`     | optional `playerId` (nur Host) |
| `abort_game`     | – (nur Host)               |
| `start_game`     | – (nur Host)               |
| `choose_trump`   | `suit`                     |
| `make_bid`       | `value`                    |
| `play_card`      | `cardId`                   |
| `continue_round` | –                          |
| `ping`           | –                          |

**Server → Client**

| Nachricht      | Inhalt                                                       |
| -------------- | ------------------------------------------------------------ |
| `joined`       | `code`, `playerId`, `token`, `name`, ggf. `reconnected`      |
| `room_state`   | Lobby: Spielerliste, Host, verbunden/getrennt, Varianten     |
| `game_state`   | öffentlicher Tischzustand (nie fremde Handkarten)            |
| `your_hand`    | eigene Karten, legale `cardId`s, eigene Ansage, gesperrte Zahl |
| `trick_won`    | Gewinner und Karten des Stichs                               |
| `round_scored` | Ansage, Stiche, Rundenpunkte und Gesamtstand pro Spieler     |
| `round_started`| neue Rundennummer                                            |
| `game_over`    | Endstand                                                     |
| `trump_chosen` | wer welche Trumpffarbe gewählt hat                           |
| `game_aborted` | der Host hat abgebrochen (`by` = Name)                       |
| `bot_added` / `bot_removed` | ein Bot kam dazu bzw. ging                      |
| `error`        | `code` + deutsche Fehlermeldung                              |

---

## Später vorgemerkt (bewusst noch nicht gebaut)

- Persistente Statistik über `better-sqlite3` (Spielhistorie, Bestenliste).
- Zug-Timer als optionale Einstellung.

## Lizenz

Code: MIT. Die mitgelieferte Schriftart **Space Grotesk** steht unter der
SIL Open Font License 1.1. „Wizard“ ist ein Spiel von Ken Fisher, erschienen bei
Amigo – dieses Projekt ist eine private, nicht-kommerzielle Eigenumsetzung der
Regeln ohne Verlagsmaterial.
