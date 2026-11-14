# Datainläsning för Fakturering och Betalningar 0.29.5

Utfärdade fakturor och krediter kan listas utan sina rader, företagssnapshots och hela betalningshistoriken. Saldon kommer från samma befintliga serverberäkning som det fullständiga tillståndet; de räknas inte fram i klienten från ett begränsat urval. Betalningshistoriken har även fått sidindelning och snabbare koppling mellan betalning och faktura.

## Läsmodeller

| Vy | Innehåll |
| --- | --- |
| `commerce` | Samtliga faktura-/kreditsammanfattningar med saldo i originalvaluta/SEK, kundnamn, nummer, revision och bokföringskoppling. Leverantörssammanfattningar och kompletta utkast ingår. Konton, räkenskapsår och ansvarig ingår som åtgärdsmetadata, men inga huvudboksrader eller bokföringshändelser. |
| `commerce-history` | Samma listunderlag samt komplett kund-/leverantörsbetalningshistorik, kvittningar och befintlig försäljningshistorik. |
| `commerce-detail` | Samma listunderlag, plus kompletta kundfakturor inom vald fakturafamilj, tillhörande betalningar/kvittningar och registeruppgifter för redigering/åtgärder. Kopplade order/mallar följer med. |

Anrop använder `GET /api/state?view=...`. Detalj väljs med `document`, `draft`, `payment` eller `allocation`; endast en väljare används per anrop. Ett utkast som redan utfärdats leder till det utfärdade underlaget. Saknat underlag avvisas. När en detalj öppnas från betalningshistoriken används `history=1` så att den aktiva sidans historik fortsätter vara komplett. Detta urval är inte ett nytt behörighetssystem.

Listornas dokument saknar uttryckligen rader och andra ej inlästa detaljer; de får inga falska tomma radlistor. Detaljsvaret markerar vilka dokument/utkast som har kompletta underlag. Klienten hämtar rätt detalj före betalning, kreditering, kvittning, återföring, ombokföring eller redigering. Aktuella revisions-/nummerseriekontroller görs fortsatt av skrivkommandona på servern.

**Utkast är ett medvetet undantag:** de behålls kompletta, även i listmodellen, så att befintlig sökning i rader/anteckningar inte försämras. Separat sökning och detaljläsning för mycket stora utkastregister kan införas senare.

## Historik, export och mer omfattande flöden

Betalningshistoriken hämtas när dess flik öppnas. Listan visar 50 rader per sida; filtrering görs före sidindelning. CSV använder hela det filtrerade urvalet. Uppslag av fakturor för historikrader görs i en karta per beräkning, i stället för upprepade linjära sökningar. Inga belopp eller affärsobjekt cachelagras mellan anrop.

Order/offert, återkommande mallar, påminnelser och bankavstämning kan fortfarande hämta full data. Övergång till ett sådant underlag väntar på nödvändiga data innan dess dialog visas. Utskriftsfönster använder fortsatt fullständiga snapshots och befintliga sessions-/IPC-kontroller. Ett nytt fakturautkast från Översikt kan också använda den fullständiga kontexten. Att byta språk/utseende under en mer omfattande redigering kan kräva full inläsning.

## Mätning

Före: 0.29.4 (`b505663`). Efter: 0.29.5. Samma Linux/Chromium, Node.js 24, 1440 × 1000, normal textstorlek och publicerade testdatabas med 3 000 kundfakturor, 2 400 kundbetalningar, 600 leverantörsfakturor, 7 900 verifikationer och 6 000 tidsrader. Filen har inga utkast, krediter eller valutafakturor; sådana fall verifieras separat på den rikare mindre demon och i ordinarie tester.

| Moment | Före 0.29.4 | Efter 0.29.5 |
| --- | ---: | ---: |
| Data vid första Fakturering-öppning, byte | 36209214 | 1805086 |
| Första Fakturering-öppning, ms | 1810.3 | 249.3 |
| Öppna en fakturadetalj, ms | 54.9 | 243.7 |
| Visa betalningshistorik, ms | 810.9 | 83.3 |
| API, listunderlag, ms | 1318.4 | 138.3 |
| API, fakturafamilj, ms | 1298.5 | 168.8 |
| API, komplett historikunderlag, ms | 1236.2 | 140.2 |

API-tider och historikvisning är median av tre körningar; första öppning av Fakturering och en fakturadetalj mäts en gång vardera. Före-versionen saknar de nya API-vyerna, så receptet använder full inläsning som jämförelse där; dess faktiska första Fakturering-sida hämtar också full data. Båda körningar använder Nodes CPU-profilerare. Resultaten är orienterande utvecklingsmätningar, inte garantier för andra datorer och inte kallstartsmätningar av paketerade Windows-/Mac-binärer.

En detalj har nu en egen inläsningskostnad som tidigare betalades redan vid öppning av hela modulen. Mer avancerade moduler behöver fortfarande full data. Vi påstår inte att all företagsdata nu har detaljinläsning per post.

## Verifiering

- API-tester jämför saldo i originalvaluta och SEK, revisioner, totalsummor, kund-/leverantörsreskontra samt bokföringskopplingar med den fullständiga modellen.
- Varje fakturafamilj i demon jämförs med originalets kompletta rader, valuta-/öresuppgifter, krediter, betalningar och kvittningar. Historik och utkast förblir kompletta inom sitt avsedda urval.
- En delbetalning ändrar reskontra och huvudbok med samma belopp. En upprepning med gammal revision avvisas; ingen andra betalning skapas.
- Gränssnittstest följer nätverkstrafiken: listor, kundfakturadetalj, betalning och historik/export hämtar inte full företagsmodell. Ändring från ett annat fönster ger konflikt och bevarar osparat betalningsbelopp. Historikexport innehåller alla filtrerade betalningar även efter öppning av en detalj, och fakturautskriften innehåller kompletta rader.
- Ordinarie tester täcker även EUR/USD, realiserad kursdifferens, kreditering, kvittning, återföring, periodlås, kopplade order/mallar, utskrifter och flera fönster. Bokföringsverifiering i tester läser uttryckligen full modell, inte ej inlästa huvudboksrader ur en listvy.
- Mätreceptet använder temporära kopior och jämför identiska affärsuppgifter före/efter samt efter företagsbyte. Förväntade systemhändelser om programversion undantas; finansiella händelser ingår. Källdatabasen är orörd.

[Resultat före](performance/commerce-before-0.29.4.json) · [Resultat efter](performance/commerce-after-0.29.5.json) · [Mätrecept](../scripts/benchmark.cjs)

Kör `npm run benchmark -- /tmp/sizzla-resultat.json` med en ny resultatfil. `SIZZLA_BENCHMARK_ROOT` kan peka på en separat lokal källkodskopia med beroenden. Se även [Personal 0.29.4](PERSONAL-DATA.md) och [Översikt/grundregister 0.29.3](SELEKTIV-DATA.md).
