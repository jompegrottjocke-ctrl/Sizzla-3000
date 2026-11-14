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
