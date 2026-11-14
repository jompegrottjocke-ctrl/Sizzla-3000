# Prestandagenomgång 0.29.2

Testdata: 3 000 artiklar, 1 000 kunder, 3 000 utfärdade kundfakturor, 7 900 bokförda verifikationer och 6 000 tidsrader. Jämförelsen använder ursprunglig 0.29.1-kod (`26bff6a`) och 0.29.2 i samma Linux-miljö med Node.js 24, Chromium, 1440 × 1000 och normal textstorlek. Varje körning använder en separat temporär kopia av samma publicerade SQLite-export. Inga användardatabaser berörs.

## Resultat

Millisekunder, median av tre körningar. Serveröppning, första webbläsaröppning och företagsaktivering har en körning vardera. Råresultaten innehåller samtliga mätvärden.

| Moment | Före 0.29.1 | Efter 0.29.2 |
| --- | ---: | ---: |
| Öppna server/databas | 37.8 | 31.3 |
| Läsa och avkoda API-tillståndet | 3204.6 | 1445.0 |
| Första öppning i webbläsaren | 3196.0 | 1815.9 |
| Kundlista | 249.5 | 83.4 |
| Kundsökning | 210.6 | 66.5 |
| Artikellista | 662.4 | 83.8 |
| Artikelsökning | 665.9 | 66.3 |
| Fakturering, förvald flik | 83.7 | 66.9 |
| Verifikationslista | 632.2 | 99.9 |
| Verifikationssökning | 387.4 | 83.5 |
| Projektlista | 112.0 | 116.5 |
| Lagersaldon | 1133.2 | 99.7 |
| Analys | 102.8 | 116.4 |
| Utfärdade kundfakturor | 1436.6 | 100.4 |
| Tidsrader | 1865.9 | 111.0 |
| Kundreskontra | 1499.9 | 83.3 |
| Saldobalans | 192.3 | 69.7 |
| Aktivera stort företag | 1678.4 | 877.4 |

Små skillnader kring 50–150 ms påverkas mycket av schemaläggning och rendering och ska inte tolkas som säkra förbättringar eller försämringar. Detta är en orienterande utvecklingsmätning, inte en garanti för andra datorer. Webbläsaröppning omfattar första sidan och dataläsningen; den mäter inte start av en paketerad Electron-binär från kall disk. Windows och macOS har funktionstester i CI, men dessa prestandatal är inte mätta på de systemen.

## Vad som ändrats

- Artikelinställningar och summerade lagersaldon hämtas i samlade frågor i stället för flera frågor per artikel.
- Försäljningsvyn hämtar aktiva bokföringskällor i en samlad fråga och summerar betalningar/kvittningar i en genomgång. Dagens datum beräknas en gång för vyn.
- En inläsning återanvänder samma försäljnings- och bokföringsobjekt för påminnelsevyn. Inga affärsobjekt återanvänds mellan anrop. Skrivkommandonas validering och revisionskontroller är kvar.
- Kunder, artiklar, verifikationer, kundfakturor/kundreskontra, lagersaldon och tidsrader visar 50 rader per sida. Sökning/filter tillämpas på hela registret före sidindelning. Sidpositionen återställs vid ändrat urval/företagsbyte och anpassas när antalet poster ändras.
- Talformatering återanvänder formatinställningar för två språk och SEK/EUR/USD. Belopp eller företagsuppgifter cachelagras inte.

## Datakontroll

Samma SHA256 för källdatabasen och samma kontrollsumma över företag, kunder, artiklar, personal, lönekörningar, frånvaro, bokföring, inköp, försäljning, lager och tid före/efter ändringen. Bokföringens finansiella händelser ingår. Enbart systemets versionshändelser undantas från jämförelsen, eftersom en verklig programuppdatering ska lägga till en ny rad i behandlingshistoriken. Versionshändelserna raderas inte ur databasen. Bokslutets källfingeravtryck innehåller programversionen och jämförs inte som oförändrad affärsdata.

Mätreceptet kontrollerar även identiska affärsuppgifter efter byte till ett tomt företag och tillbaka, samt inga JavaScript-fel i de mätta vyerna. Originalexporten är orörd.

Regressionsprovet för stora listor kontrollerar att en kund på sista sidan kan hittas, redigeras och sparas, att sökning återgår till första sidan, att engelska texter fungerar och att företagsbyte återställer listläget. Lager-CSV, lagerutskrift, tids-CSV och reskontra-CSV innehåller hela urvalet även när listan visar en senare sida. Saldobalans använder samtliga bokförda verifikationer. Ordinarie tester täcker även valuta, kvittningar, motbokningar, periodlåsning och import.

GitHub-knappen och hjälptexten under Licens & version har tagits bort på båda språken. Uppdateringsknappen är fortfarande en förhandsvisning utan nätverkskontroll.

## Återskapa

```bash
npm ci
npx playwright install chromium
npm run benchmark -- /tmp/sizzla-resultat.json
```

Använd `SIZZLA_CHROMIUM=/usr/bin/chromium` om Linuxsystemets Chromium ska användas. Utdatakatalogen måste finnas och resultatfilen får inte finnas. Receptet packar upp den publicerade testdatabasen till en tillfällig katalog, mäter API, sidor/sökning/rapport och företagsbyte, skriver JSON och rensar arbetskopiorna. `SIZZLA_BENCHMARK_ROOT` kan peka på en separat lokal källkodskopia med installerade beroenden för en före-/efterjämförelse. Den publicerade syntetiska databasen används alltid; användarens vanliga datakatalog används inte. Både före- och eftermätningen ovan kördes med Nodes CPU-profilerare aktiverad.

- [Råresultat före](performance/before-0.29.1.json)
- [Råresultat efter](performance/after-0.29.2.json)
- [Mätrecept](../scripts/benchmark.cjs)

## Kvarstående begränsning

API:t skickar fortfarande hela företagets tillstånd vid uppdatering, cirka 36 MB okomprimerad JSON för den stora testdatabasen. Sidindelningen minskar DOM-arbetet men inte detta svar. Selektiv inläsning per modul är ett rimligt nästa steg om ytterligare förbättring behövs, med särskild kontroll av företagsbyte, samtidiga fönster och rapporters fullständighet. Inga nya databasindex eller schemaändringar infördes här.
