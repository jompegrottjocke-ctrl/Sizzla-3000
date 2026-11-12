# Sizzla 3000

Ett affärssystem för Windows 11, med svenska som standardspråk och valbar engelska. Första versionen kör lokalt och kräver inget konto eller internet för användning.

## Första versionen

- Översikt med antal kunder, artiklar och fakturautkast.
- Företagsuppgifter, kundregister och artikel-/tjänsteregister. Skapa och redigera poster, sök i registren.
- Fakturautkast med kund, datum, förfallodatum, anteckning och flera rader. Artiklar kan hämtas från registret.
- Moms 0, 6, 12 eller 25 procent per rad, beräknad i heltalsören med avrundning per rad. Endast SEK och priser exklusive moms i denna version.
- Utskrift av sparade utkast, tydligt märkta **UTKAST – EJ FAKTURA**. PDF kan väljas i operativsystemets utskriftsdialog.
- Lokal SQLite-databas; uppgifterna finns kvar efter omstart. Sparade utkast innehåller en kopia av företagets och kundens uppgifter vid senaste sparandet.
- Personalregister med kontakt-, anställnings-, bank- och löneuppgifter. Sökning, filtrering, arkivering och återställning. Unika anställningsnummer och kontroll av svenska person-/samordningsnummer.
- Frånvaro och manuellt tilldelade betalda semesterdagar per kalenderår. Uttag kontrolleras mot saldot; överlappande frånvaro avvisas. Frånvaroregistret beräknar inte automatiskt löneavdrag eller lagstadgad semester-/sjuklön.
- Manuellt granskade lönekörningar: hel avtalad månadslön gånger sysselsättningsgrad eller timlön gånger timmar, bruttotillägg, bruttoavdrag, förmåner, skattefri kostnadsersättning och nettoavdrag.
- Löneutkast → godkänd/låst → markerad utbetald. Godkännande kräver personnummer, företagsuppgifter och uttryckligen kontrollerade skatte-/avgiftsbelopp med beräkningsunderlag. Dubbel lön för samma person och löneperiod avvisas. Ändrade personal-/företagsuppgifter kräver att utkastet uppdateras före godkännande. Skatt och arbetsgivaravgift beräknas inte automatiskt.
- Lönebesked för en person eller hela körningen. Betalningsunderlag som generell CSV (inte ett bankanpassat filformat). Ingen banköverföring utförs. Godkända körningar kan makuleras med orsak; utbetalda körningar kan inte makuleras eller rättas i denna version.
- AGI-kontrollunderlag per **utbetalningsmånad**, på skärm och CSV. Detta är inte en AGI-inlämningsfil. Automatisk skattetabell, regelstyrd sjuk-/semesterlön, rättelser av utbetald lön och ett verifierat AGI-format återstår. Personalfliken är därmed användbar, men fullständig svensk lönehantering är ännu inte färdig.
- Ljust, mörkt och systemstyrt utseende. Språk och utseende sparas i SQLite och följer med över omstart. Utskrifter använder ljust papper även i mörkt läge.
- Bokföring, betalningar, inköp, lager, tid/projekt, dokument, bokslut/skatt, analys, anläggningsregister, koncern och byrå har flikar med **beta kommer senare** (engelska: beta comes later).

Fakturautkast utfärdas inte, får inga fakturanummer och skapar inga bokföringsposter. Det här är en utvecklingsversion, inte ett färdigt bokförings-, löne- eller faktureringssystem för skarp drift. Bankintegration, kreditfakturor, automatisk säkerhetskopiering och komplett verifierade regelverk ingår ännu inte. HR-ändringar och lönekörningarnas statusövergångar loggas lokalt; detta är ingen fullständig revisionslogg för bokföring.

## Utveckling

Använd Node.js 24 LTS och npm. Arbeta i den befintliga utcheckningen; molnuppgifter är redan isolerade och behöver ingen extra Git-worktree.

```sh
npm ci
npm start
```

`npm start` kör gränssnitt och API lokalt på port 3000. Ändra port med miljövariabeln `PORT`. För skrivbordsappen:

```sh
npm run desktop
```

I molnmiljön måste paketverktygen ha skrivbara cachekataloger och Node använda den tillhandahållna nätverksproxyn. De sparade miljöinstruktionerna innehåller inställningarna. Om Electron-binären saknas, kör `node node_modules/electron/install.js` med samma proxy- och cacheinställningar; behåll TLS- och checksummeverifiering.

## Tester och Windowsbygge

```sh
npm test
npx playwright install chromium
npm run test:ui
node tests/desktop-smoke.cjs
npm run dist:win
```

Desktoptestet kräver en grafisk miljö. Webbläsartester kan använda installerad Chromium via `SIZZLA_CHROMIUM`. Ange en tom separat datakatalog med `SIZZLA_TEST_DATA` när UI-testet upprepas; standardkatalogen är `/tmp/sizzla-ui-tests` för lokal Linuxutveckling. Testa aldrig mot en katalog med användardata.

Windowsinstallationsprogram byggs till `dist/`. GitHub Actions-filen `.github/workflows/windows.yml` testar och bygger på Windows när den körs i GitHub; artefakten laddas upp till körningen. Den här arbetsgången publicerar ingen release. Installationsprogrammet är ännu inte kodsignerat. Ett byggt paket är inte bevis för att installationen och samtliga funktioner har verifierats på Windows 11.

För ett Windows-paket utan installationsprogram: `npx electron-builder --win zip --x64`. Packa upp **hela ZIP-filen** och starta `Sizzla 3000.exe` i den uppackade katalogen. Vid korsbygge på Linux utan Wine kan `--config.win.signAndEditExecutable=false` användas för ZIP-paketet; det lämnar Electrons standardikon och metadata. NSIS-installationsbygget kräver däremot Wine på Linux eller en Windowsbyggmaskin.

## Data och säkerhet

- Skrivbordsappen använder Electrons användardatakatalog, normalt `%APPDATA%/Sizzla 3000/data` på Windows. Webbutveckling använder `.local/` i projektet.
- `SIZZLA_DATA_DIR` kan ange en annan lokal datakatalog. Använd inte en gemensam nätverksmapp för databasen.
- Säkerhetskopiera hela datakatalogen när programmet är stängt. Bevara även eventuella `-wal`/`-shm`-filer. Återställ genom att ersätta katalogen när programmet är stängt, och behåll först en separat kopia av befintliga data.
- Databasen är inte krypterad i applikationen. Använd Windowskontots åtkomstskydd och exempelvis BitLocker för skydd på disk.
- Version 0.2 utökar databasen utan att ersätta befintliga kunder, artiklar, inställningar eller fakturautkast. Ta en säkerhetskopia före uppdatering. Äldre programversioner ska inte användas mot den uppgraderade databasen.
- API:t lyssnar endast på loopback och tillåter endast rätt Host-header. Skrivningar kräver samma origin och en sessionsspecifik token. Rendererprocessen saknar Node-åtkomst och kör med sandbox och context isolation.
- Det finns ännu ingen fjärrinloggning eller fleranvändarhantering. Exponera inte den lokala tjänsten på nätverket.

## Förberett för nästa steg

Gränssnittet använder ett HTTP-API. Validering och momsberäkning ligger i `src/domain.cjs`, lagring och lokalt API i `src/server.cjs`, Windowsfönstret i `src/desktop.cjs`. Gränssnittet ligger i `public/` och använder gemensamma svenska/engelska språktexter.

Personal, löneberäkning, frånvaro och statusövergångar ligger i `src/hr.cjs`; personalgränssnittet i `public/hr.js`. Pengar och decimalantal lagras som heltal i ören respektive hundradelar. Beräkningen av skatteavdrag, avgifter och klassificeringen av förmåner/kostnadsersättningar måste tills vidare göras och verifieras utanför programmet. Inga åldersgränser, skattesatser eller myndighetsformat antas som standard. Kontroll mot aktuella myndighetskällor är blockerad i den nuvarande molninstansen tills den föreslagna nätverksåtkomsten sparas och tillämpas.

Det ger en grund för en framtida `sizzla-3000-server`. Serverdrift kräver separat implementation av HTTPS/TLS, autentisering, behörigheter, revisionslogg, datamigreringar, samtidighetskontroll, säkerhetskopiering och eventuellt en serverdatabas. Molndrift och synkronisering ingår inte i denna version.
