# Prova Sizzla 3000 med ett demoföretag

**DEMO Sizzla Handel AB** är en separat övningsdatabas med påhittade uppgifter för Sizzla 3000 0.28.1 (schema 10).

- [Ladda ned hela demopaketet (ZIP)](https://github.com/jompegrottjocke-ctrl/Sizzla-3000/raw/refs/heads/main/examples/demo/Sizzla-3000-Demo-0.28.1.zip)
- [Ladda ned enbart databasen (.sqlite)](https://github.com/jompegrottjocke-ctrl/Sizzla-3000/raw/refs/heads/main/examples/demo/Sizzla-3000-Demo-0.28.1.sqlite)
- [Läs guiden och importinstruktionerna](demo/LAS-MIG-DEMO.md)
- [Se kontrollresultaten](demo/DEMO-kontrollresultat.json)

Skapa och aktivera först en ny företagsdatabas med namnet **DEMO**. Importera därefter SQLite-filen under **Säkerhet & säkerhetskopiering** och starta om programmet. Filen behöver inget lösenord. Import ersätter den aktiva databasens innehåll, så använd en separat demodatabas.

Exemplet innehåller 12 anställda (en arkiverad), 31 artiklar, 10 kunder, 8 leverantörer, 24 utfärdade kundfakturor, 3 kundkrediter, 13 leverantörsfakturor, 108 bokförda verifikationer samt lager, tid, order, anläggningar, påminnelser och återkommande fakturering. Demoåret 2025 är avslutat och 2026 är pågående. Åtta PDF-snapshots finns i programmets utskriftshistorik och i paketet.

Exporten har kontrollerats och provimporterats i en ny företagsdatabas. Reskontra har stämts av mot huvudboken, samtliga bokförda verifikationer balanserar och alla 23 huvudflikar samt 44 underfliksvyer har öppnats efter import utan JavaScript-fel.

Allt är demonstrationsdata. Organisations-/identitetsuppgifter, kontoutdrag, skatter och avgifter är övningsuppgifter och ska inte användas för verklig verksamhet, inlämning eller betalning. Bokslutsarbetsunderlaget är inte en årsredovisning eller deklaration. Läs guiden för begränsningarna och för exempel att följa.

## Hur exemplet byggdes

Grundregister fylldes i genom programmets formulär med Playwright. Affärshändelser skapades genom programmets validerade kommandon med vanliga statusövergångar, revisionskontroller och uttryckliga granskningsmarkeringar. Ingen direkt INSERT/UPDATE/DELETE av affärsposter användes. PDF-historiken skapades genom skrivbordsappens vanliga Spara PDF-funktion. Slutlig databasexport, verifiering och import gjordes genom gränssnittet.

Recepten finns i `scripts/build-demo.cjs` och `scripts/demo-print.cjs`. De är avsedda för version 0.28.1 och en tom, separat datakatalog. Byggförloppet kan återupptas med en lokal kontrollpunktsfil. Bygg exempeldata, skapa PDF-snapshots och exportera i denna ordning:

```bash
SIZZLA_DEMO_STAGE=review node scripts/build-demo.cjs
SIZZLA_HEADLESS=1 ELECTRON_DISABLE_SANDBOX=1 node scripts/demo-print.cjs
node scripts/build-demo.cjs
```

Standardkatalogen är `/tmp/sizzla-demo-0281`. Båda skripten kan använda `SIZZLA_DEMO_DATA` för en annan separat katalog. Den första raden bygger även register, historik och pågående affärer. Webbläsarsteget använder Chromium (`/usr/bin/chromium`, eller `SIZZLA_CHROMIUM`). På en Windowsdator med vanligt grafiskt Electron utelämnas headless-/sandboxmiljövariablerna. Förvalt temporärt datautrymme är anpassat för byggmiljön; välj själv en tom katalog vid egen körning.

ZIP-paketet innehåller databasen, guiden, simulerade originalunderlag, PDF-exempel, CSV-/SIE-filer och kontrollresultat. Det innehåller inga byggskript eller körbara program. Kontrollsummor finns i `demo/SHA256SUMS.txt` och separat för ZIP-filen.

## Inbyggt demoföretag från 0.29.1

Öppna **Inställningar → Databaser → Skapa demoföretag**. Samma genomgångna, mindre demodatabas följer med appen och fungerar utan internet. Den skapas som ett nytt företag och aktiveras först när du väljer **Aktivera** i listan. Befintliga företag bevaras. Du kan skapa ytterligare en ren demokopia med samma knapp; varje kopia räknas mot gränsen på 10 företag.

Börja på Översikt och utforska Försäljning, Personal, Lager samt Tid & projekt. Utskriftshistoriken innehåller åtta sparade PDF-exempel. Övningsåret 2025 är stängt och januari 2026 är låst. Bokslutsunderlagen behåller sin historiska snapshot från 0.28.1; en senare programversion kan markera att källan ändrats och behöver granskas igen. Inga skatteuppgifter ska lämnas in och inga betalningar ska göras från demon.

## Stor databas för volymtester

Den stora databasen **TEST Stora Sizzla AB** innehåller 3 000 artiklar, 1 000 kunder, 200 leverantörer, 60 anställda, 150 projekt, 6 000 tidsrader, 3 000 kundfakturor och 600 leverantörsfakturor över tre öppna räkenskapsår. Den är avsedd för volymtester och är separat från den mindre inbyggda demon.

- [Hämta stora testpaketet (ZIP)](https://github.com/jompegrottjocke-ctrl/Sizzla-3000/raw/refs/heads/main/examples/scale-demo/Sizzla-3000-Stor-Testdatabas-0.29.1.zip)
- [Importguide och begränsningar](scale-demo/LAS-MIG.md)
- [Kontrollresultat](scale-demo/kontrollresultat.json)

Skapa och aktivera ett separat, nytt företag innan import. Vanlig import ersätter innehållet i den aktiva databasen. Den stora databasen ingår inte i appinstallationen; den hämtas separat. Den kan vara långsam att bläddra i innan kommande prestandaoptimeringar.

Återskapa med `npm run demo:large -- --out /valfri/tom/katalog` (Node.js 24+ och `npm ci`). Utan `--out` skapas en ny temporär utdatakatalog och sökvägen skrivs ut. Inga befintliga företagskataloger används. Receptet gör alla affärsskrivningar genom programmets validerade HTTP-kommandon. Innehåll, datum och antal är fasta; UUID, tidsstämplar och filernas kontrollsummor varierar mellan körningar. Ett litet prov med samma export/import-kontroller körs med `node scripts/build-scale-demo.cjs --smoke --out /valfri/annan/tom/katalog` och ingår i enhetstesterna.
