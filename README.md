# Sizzla 3000

Ett affärssystem för Windows 11, med svenska som standardspråk och valbar engelska. Första versionen kör lokalt och kräver inget konto eller internet för användning.

## Funktioner

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
- Bokföring: redigerbar startkontoplan, räkenskapsår, ingående balanser, verifikationsutkast, låst bokföring med löpnummer, motbokningar, periodlåsning och ändringshistorik.
- Saldobalans, huvudbok, resultat- och balansrapport med datumurval, utskrift och CSV-export av bokförda rader. Original och motbokningar ingår båda i rapporterna.
- Granskad bokföring av godkända lönekörningar och redan registrerad löneutbetalning. Varje underlag kan bokföras en gång per typ; rättelser sker med nya verifikationer.
- Resultatöverföring till valt eget-kapital-konto och avslut av år med valfri överföring av balanser till ett tomt efterföljande år.
- Inköp: leverantörsregister, inköpsorder, delleveranser, leverantörsfakturor och kreditfakturor med aktuell reskontra.
- Granskning mot originalbelopp, momsavdrag, bokföring, delbetalningar, återbetalningar och rättelser. Historiska underlag bevaras.
- **Säkerhet & säkerhetskopiering**: komplett databasexport, krypterade säkerhetskopior, import med förhandskontroll och möjlighet att öppna databasens katalog.
- Textstorlek 100–200 % och fet text sparas mellan starter.
- Betalningar, lager, tid/projekt, bokslut/skatt, analys, anläggningsregister, koncern och byrå har flikar med **beta kommer senare** (engelska: beta comes later).

Fakturautkast utfärdas inte, får inga fakturanummer och skapar inga bokföringsposter. Det här är en utvecklingsversion, inte ett färdigt bokförings-, löne- eller faktureringssystem för skarp drift. Bankintegration, kreditfakturor, automatisk säkerhetskopiering och komplett verifierade regelverk ingår ännu inte. HR-ändringar och lönekörningarnas statusövergångar loggas lokalt; detta är ingen fullständig revisionslogg för bokföring.

## Utskriftshistorik under Dokument

- Öppna **Dokument → Utskriftshistorik** för datum, dokumenttyp, nummer, mottagare och status. Sök, filtrera på lokala datum, typ (inklusive Lönebesked) och status samt bläddra 25 rader åt gången. Övrig dokumenthantering är fortfarande beta.
- Befintliga utskriftsvyer för fakturautkast, enskilda eller samlade lönebesked, verifikationer, bokföringsrapporter, inköpsorder och leverantörsfakturor får **Spara PDF** och **Historik för underlaget**. Historiklänkar finns även vid underlagens utskriftsknappar. Dessa underlag behåller sina befintliga utkast-/granskningsmarkeringar.
- I skrivbordsappen skapas en oföränderlig PDF innan utskrifts- eller spara-dialogen öppnas. Varje försök får en egen historikrad. Från detaljerna kan du **Visa PDF**, **Spara PDF**, **Skriv ut igen** eller **Öppna underlag**. Omutskrift och ny PDF-export använder sparade PDF-bytes, även om originalunderlaget har ändrats. PDF-kopians ursprungliga tidpunkt visas också.
- Status skiljer mellan förberedelse, öppnad dialog, skickad till utskriftssystemet, sparad PDF, avbrutet och misslyckat. Native utskriftsdialogens callback avgör status; fysiskt papper kan inte bekräftas. Efter avbrott/omstart med ett oavslutat försök visas **Okänt resultat**, aldrig en antagen lyckad utskrift. Fel vid PDF-generering registreras med förklaring och utan PDF-knappar.
- Historiken registrerar appens utskriftsknappar och Ctrl + P i utskriftsvyn. Utskrift direkt från en PDF-visares egna kontroller eller externa program registreras inte. Utvecklingsläget i vanlig webbläsare har kvar utskriftsförhandsvisning men kan inte skapa automatiska PDF-kopior eller tillförlitlig historik; detta anges i vyn.
- PDF-kopior och historik lagras i SQLite och ingår i databasexport/import. En PDF får vara högst 20 MB. Databasen växer när kopior sparas; gränsen på 64 MB för import via appen gäller fortfarande för hela säkerhetskopian. Ta regelbundna säkerhetskopior. Historiken kan inte återskapa utskrifter gjorda före uppdateringen och har ingen funktion för radering eller separat åtkomstkontroll för löner.
- Version 0.6 använder **schema 5**. Uppgradering och import av kompletta schema 4-kopior från 0.5-serien bevarar tidigare företags-, personal-, kund-, inköps- och bokföringsdata. Kör inte äldre programversioner mot den uppgraderade databasen.

## Arbetsflöde för Bokföring

1. Fyll i företaget och skapa ett räkenskapsår under Bokföring. Kalenderår och brutna år stöds, med högst 18 månaders längd och utan överlappning.
2. Kontrollera startkontoplanen. Den är ett redigerbart urval av vanliga konton, inte en komplett eller versionscertifierad BAS-kontoplan. Svenska och engelska kontonamn kan anges. Konton med saldo i öppna år kan inte inaktiveras.
3. Ange balanser från föregående bokföring under Räkenskapsår → Ange ingående balans. Endast kontoklass 1–2 tillåts. Debet och kredit måste balansera. IB låses när första verifikationen bokförs.
4. Skapa ett balanserat verifikationsutkast med datum, text och bilagereferens. Granska och välj **Bokför och lås**. Företagsnamn och organisationsnummer krävs. Organisationsnumret låses efter första bokförda verifikationen; använd en separat databas för ett annat företag. Löpnummer i serie A tilldelas atomiskt vid bokföring, separat för varje räkenskapsår. Misslyckade försök förbrukar inga nummer.
5. Bokförda rader ändras eller raderas inte. **Skapa motbokning** ger en ny verifikation som spegelvänder originalet och länkar rättelsen. Bokför därefter vid behov en ny korrekt verifikation. Motbokningen kan göras i ett senare öppet år och får inte dateras före originalet. Motbokningar kan inte motbokas igen automatiskt.
6. Rapporter räknar bara bokförda poster, inklusive original och motbokning, samt IB. Huvudboken visar löpande saldo. Saldobalans visar debetpositiva/kreditnegativa saldon; resultatrapporten visar intäkter positivt och kostnader negativt. Konto 8999 särredovisas som resultatöverföring. Balansrapporten visar även ej överfört resultat och en kontroll som ska vara noll.
7. Lås avstämda perioder. Låsningen kan bara flyttas framåt och saknar återöppning i denna version. Utkast i perioden måste först hanteras. Årets sista dag låses via **Avsluta år**.
8. Vid årets slut: bokför nödvändiga justeringar och överför återstående resultat med valt konto i eget kapital (20xx, exempelvis 2019 eller 2099 beroende på företagsform) mot 8999. Avsluta sedan året. Balanskonton kan föras vidare till ett tomt år som börjar direkt dagen efter. Avslutade år är skrivskyddade. Ändringar efter en tidigare resultatöverföring kan kräva att denna motbokas och beräknas om före avslut.

Lönebokningen använder de manuellt verifierade beloppen i godkänd lönekörning. Kontant bruttolön, kostnadsersättning och arbetsgivaravgift bokas mot skatt, avgiftsskuld, löneskuld och eventuella reglerade personalfordringar. Förmåners faktiska kostnader bokförs separat; förmånsvärdet skapar ingen extra kontant kostnad. Bankbokning kräver att lönen är markerad utbetald och först bokförd mot skuldkonton. Den använder lönebokningens sparade löneskuldskonto. Ingen överföring görs till banken. Motboka bankbokningen före lönebokningen vid rättelse. En lönekörning med aktiv bokföring kan inte makuleras i Personal.

Bilagereferenser pekar på underlag som du själv bevarar. Digitala bilagor, SIE-import/export, automatisk momsdeklaration, bankavstämning och årsredovisning ingår ännu inte. CSV-exporten innehåller verifikationsrader för urvalet, inte IB eller en fullständig säkerhetskopia. Säkerhetskopiera hela databasen enligt instruktionerna nedan. Fakturorna är fortfarande utkast och bokförs inte automatiskt.

## Arbetsflöde för Inköp

1. Skapa leverantör med kontaktuppgifter, betalningsvillkor och eventuellt bankgiro/plusgiro. Leverantörer kan arkiveras genom att markera dem som inaktiva. Historiska order och fakturor behåller en kopia av uppgifterna. Ändrade leverantörsuppgifter kräver att utkast sparas om före granskning.
2. Skapa inköpsorder med inköpspris, antal, rabatt och moms. Artikelregistret kan fylla i namn, artikelnummer och enhet; försäljningspriset används inte som inköpspris. Granska och utfärda ordern, som sedan kan skrivas ut. Ingen e-post skickas.
3. Registrera inleveranser med följesedelsreferens. Delleveranser stöds och överleverans avvisas. Rätta felregistreringar med orsak. Order kan avslutas med kvarstående kvantitet; detta är inte samma sak som att allt har levererats. Inleveranser ändrar inte lagersaldo eller bokföring.
4. Registrera leverantörsfaktura, eventuellt från ordern. Ange leverantörens nummer, datum, förfallodag, betalningsreferens och hänvisning till originalet. Inköpsorder och fakturarader jämförs manuellt; inga lagersaldon eller mottagningsattester skapas automatiskt.
5. Kontrollera radpriser, rabatt, moms och avdragsgill andel. Andelen avdragsgill moms är ett förslag, inte en automatisk bedömning av avdragsrätt. Moms beräknas per rad; en manuell avvikelse på högst ett öre per rad tillåts för avstämning mot fakturan. Öresutjämning stöds inom ±1 SEK. Ange originalets totalbelopp, som måste stämma exakt före godkännande. Dubbelregistrering av godkänt fakturanummer för samma leverantör avvisas.
6. Godkända fakturor är låsta. Välj **Bokför faktura**, öppet räkenskapsår, datum och granskade konton. Ej avdragsgill moms läggs på kostnads-/tillgångskontot. Avdragsgill moms och leverantörsskuld bokförs separat. Godkännande och bokföring är skilda steg; reskontran visar även ännu ej bokförda dokument.
7. Registrera faktiskt genomförda betalningar med belopp och bankreferens. Delbetalningar stöds; större belopp än kvarvarande skuld avvisas. Registreringen och bokföringen sparas tillsammans eller inte alls. Ingen banköverföring görs av programmet. Bokföringsdatum kan skilja sig från faktiskt betalningsdatum när en registrering rättas i en öppen period.
8. Registrera kreditfaktura från originalfakturan med positiva belopp. Den kvittas först mot obetald del av originalet. Överskjutande kredit blir en fordran på leverantören och kan regleras med registrerad återbetalning. Krediter kan inte tillsammans överstiga originalbeloppet. Krediten bokförs på originalets leverantörsskuldkonto.
9. Felaktiga betalningsregistreringar kan motbokas från Inköp eller Bokföring. Båda vägarna uppdaterar reskontran i samma transaktion. Ingen faktisk bankbetalning återtas. Motboka betalningar före kredit-/fakturabokningen och krediter före originalfakturan. Ett godkänt dokument som felregistrerats kan makuleras först efter att tillhörande bokföring och aktiva beroenden hanterats; historiken raderas inte.

Reskontran är aktuell, inte en historisk rapport per valfri dag. Den visar skulder, förfallna belopp och belopp att få tillbaka samt kan exporteras till CSV. Belopp avseende kreditfakturor får negativa tecken i exporten. Originalfakturor och följesedlar bevaras separat; utskriften från registret ersätter inte originalet.

Denna version stödjer vanliga svenska inköp i **SEK enligt fakturametoden**. Kontantmetod, utländsk/omvänd moms, förskott, överbetalningar, automatisk tolkning av PDF/OCR, bankfiler och automatisk lagerbokning ingår inte. Gamla fakturor som redan bokförts eller ingår i IB ska inte bokföras en gång till; import och avstämning av äldre leverantörsreskontra kräver separat hantering.

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

Windowsinstallationsprogram byggs till `dist/`. GitHub Actions-filen `.github/workflows/windows.yml` testar och bygger på Windows när den körs i GitHub; artefakten laddas upp till körningen. En push till en versionstagg `v*` publicerar en förhandsrelease med installationsprogrammet efter godkända tester. Byggkommandot publicerar inte själv; publiceringen sker i ett separat GitHub-steg. Installationsprogrammet är ännu inte kodsignerat. Ett byggt paket är inte bevis för att installationen och samtliga funktioner har verifierats på Windows 11.

För ett Windows-paket utan installationsprogram: `npx electron-builder --win zip --x64`. Packa upp **hela ZIP-filen** och starta `Sizzla 3000.exe` i den uppackade katalogen. Vid korsbygge på Linux utan Wine kan `--config.win.signAndEditExecutable=false` användas för ZIP-paketet; det lämnar Electrons standardikon och metadata. NSIS-installationsbygget kräver däremot Wine på Linux eller en Windowsbyggmaskin.

## Data och säkerhet

- Skrivbordsappen använder Electrons användardatakatalog, normalt `%APPDATA%/Sizzla 3000/data` på Windows. Webbutveckling använder `.local/` i projektet.
- `SIZZLA_DATA_DIR` kan ange en annan lokal datakatalog. Använd inte en gemensam nätverksmapp för databasen.
- Under **Säkerhet & säkerhetskopiering → Exportera hela databasen** skapas en konsekvent SQLite-kopia även medan appen är öppen. Alla tabeller, historik och inställningar ingår. Refererade originaldokument som finns utanför databasen måste kopieras separat. Automatisk schemalagd säkerhetskopiering ingår inte.
- Kryptering är förvalt för export. Ange och upprepa ett separat lösenord med 10–256 tecken. Formatet `.sizzla` använder AES-256-GCM med slumpmässig salt/nonce och scrypt (N=32768, r=8, p=1). Ett borttappat lösenord kan inte återställas. Avmarkerad kryptering ger en vanlig `.sqlite`-fil.
- **Importera databas** accepterar kompletta säkerhetskopior från denna databasstruktur, upp till 64 MB. Ange lösenord för krypterad kopia och markera uttryckligen att nuvarande data ska ersättas. Appen kontrollerar integritet, referenser, schema och JSON innan importen förbereds. Delimport och sammanslagning stöds inte. Inställningar från kopian återställs också. Äldre låsinställningar förblir inaktiva.
- Importen börjar gälla vid nästa programstart. Fortsätt inte registrera data före omstart. **Avbryt förberedd import** behåller den nuvarande databasen. Okrypterade räddningskopior sparas som `before-import-*.sqlite` när importen förbereds och `before-restart-import-*.sqlite` precis innan bytet. Skydda även dessa filer med Windowsåtkomstskydd/BitLocker. Ett fel under kontrollen lämnar den befintliga databasen kvar.
- **Öppna databasens katalog** öppnar den konfigurerade datakatalogen i Windows Utforskaren. Funktionen är tillgänglig i skrivbordsappen. För manuell kopiering: stäng programmet och kopiera hela datakatalogen, inklusive eventuella `-wal`/`-shm`-filer. Behåll alltid en kopia av tidigare data innan manuell återställning.
- **Text & läsbarhet** i samma flik ger 100, 125, 150, 175 och 200 % storlek för hela gränssnittet samt valbar fet text. Standard är 100 % och normal text. Menyer och formulär anpassas vid förstoring; breda tabeller kan rullas i sidled. Pappersutskrifter behåller normal skala.
- Programlås och upplåsningshistorik är bortkopplade i 0.5.4. Låsknapp, Ctrl + L, inaktivitetsmätning och Windowskoppling för låsning ingår inte. Äldre låsinställningar och historik ligger kvar orörda för kompatibilitet med säkerhetskopior, men kan inte aktivera ett lås, heller inte efter import. Använd Win + L för att låsa Windows.
- Databasen är inte krypterad i applikationen. Använd Windowskontots åtkomstskydd och exempelvis BitLocker för skydd på disk.
- Versionerna 0.2–0.6 utökar databasen utan att ersätta befintliga kunder, artiklar, inställningar, fakturautkast, personal eller bokföring. Inköp använder schema 4. Ta en säkerhetskopia före uppdatering. Äldre programversioner ska inte användas mot den uppgraderade databasen.
- API:t lyssnar endast på loopback och tillåter endast rätt Host-header. Skrivningar kräver samma origin och en sessionsspecifik token. Rendererprocessen saknar Node-åtkomst och kör med sandbox och context isolation.
- Det finns ännu ingen fjärrinloggning eller fleranvändarhantering. Exponera inte den lokala tjänsten på nätverket.

## Förberett för nästa steg

Gränssnittet använder ett HTTP-API. Validering och momsberäkning ligger i `src/domain.cjs`, lagring och lokalt API i `src/server.cjs`, Windowsfönstret i `src/desktop.cjs`. Gränssnittet ligger i `public/` och använder gemensamma svenska/engelska språktexter.

Personal, löneberäkning, frånvaro och statusövergångar ligger i `src/hr.cjs`; personalgränssnittet i `public/hr.js`. Pengar och decimalantal lagras som heltal i ören respektive hundradelar. Beräkningen av skatteavdrag, avgifter och klassificeringen av förmåner/kostnadsersättningar måste tills vidare göras och verifieras utanför programmet. Inga åldersgränser, skattesatser eller myndighetsformat antas som standard. Kontroll mot aktuella myndighetskällor är blockerad i den nuvarande molninstansen tills den föreslagna nätverksåtkomsten sparas och tillämpas.

Bokföringsmodulen ligger i `src/accounting.cjs` och `public/accounting.js`. Rapporternas saldoberäkning delas av server och gränssnitt i `public/ledger-math.js`. Låsning av bokförda belopp skyddas även med SQLite-triggers; detta gör inte databasfilen skyddad mot manipulation av någon med full filåtkomst. Databasmigreringen till schema 3 bevarar tidigare personal-, kund- och fakturadata.

Inköp ligger i `src/purchases.cjs` och `public/purchases.js`. Bokföringsmodulens interna transaktionsgränssnitt används för att spara inköpsregistrering och motsvarande verifikation atomiskt. Motbokningskopplingen håller betalningsstatus och bokföring samordnade även när rättelsen startas i Bokföring. Uppgraderingen från schema 3 till 4 testas med befintliga bokförings-, personal- och kunduppgifter.

Det ger en grund för en framtida `sizzla-3000-server`. Serverdrift kräver separat implementation av HTTPS/TLS, autentisering, behörigheter, revisionslogg, datamigreringar, samtidighetskontroll, säkerhetskopiering och eventuellt en serverdatabas. Molndrift och synkronisering ingår inte i denna version.

Säkerhetskopiering, och import ligger i `src/security.cjs`; gränssnitt och läsbarhet i `public/security.js` och `public/accessibility.css`. Lösenord för krypterade säkerhetskopior kräver fortfarande minst 10 tecken.

Utskriftshistorik och PDF-lagring finns i `src/printing.cjs`, den begränsade IPC-bryggan i `src/print-preload.cjs` och de inbyggda dialogerna i `src/desktop-printing.cjs`. Ursprung och huvudram kontrolleras före native anrop; renderern får varken generell Node-åtkomst eller valfria filvägar.
