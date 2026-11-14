# Selektiv datainläsning 0.29.3

Fortsättningen för Personal & lön i 0.29.4 beskrivs i [Personal – datainläsning](PERSONAL-DATA.md).

Första steget omfattar Översikt samt Kunder och Artiklar. Övriga moduler använder fortfarande den fullständiga inläsningen när de behövs. Alla API-svar är nya inläsningar från det aktiva företaget. Inga affärsobjekt cachelagras mellan anrop eller blandas ihop från olika svar.

## Resultat på den stora testdatabasen

Samma publicerade testdatabas och Linux/Chromium-miljö som i föregående genomgång: 3 000 artiklar, 1 000 kunder, 3 000 kundfakturor, 7 900 verifikationer och 6 000 tidsrader. Före avser 0.29.2 (`4291d80`), efter avser 0.29.3. Råresultaten innehåller kontrollsummor, antal, datamängder, API-anrop och alla mätvärden.

| Moment | Före 0.29.2 | Efter 0.29.3 |
| --- | ---: | ---: |
| Svar vid start, MB (decimal) | 36.21 | 1.27 |
| Registersvar, MB (decimal) | 36.21 | 0.97 |
| Första öppning i webbläsare, ms | 1836.8 | 508.9 |
| Hämta/avkoda översiktsdata, ms | 1259.7 | 159.9 |
| Hämta/avkoda registerdata, ms | 1402.1 | 23.5 |
| Fullständig inläsning, ms | 1751.5 | 1749.1 |
| Aktivera stort företag, ms | 816.9 | 799.7 |
| Första faktureringsfliken efter start, ms | 83.3 | 2099.6 |

API-tider är median av tre körningar. Första webbläsaröppning och företagsaktivering har en körning vardera. Siffrorna är orienterande utvecklingsmätningar, inte löften om samma tid på andra datorer. De mäter inte kallstart av en paketerad Windows- eller Mac-binär.

Den första modulen som behöver full data får fortfarande kostnaden för en fullständig inläsning. Kostnaden tas då, i stället för att alltid belasta starten. När full data väl finns kan flera moduler använda samma aktuella svar, tills en uppdatering ersätter det. Vi påstår inte att hela programmet nu har inläsning per modul.

## Vad som hämtas

- `GET /api/state?view=registers`: företags-/sessionsmetadata, inställningar, grundregister med oförändrade postversioner samt små uppgifter om vilka artiklar som har låst artikelnummer/enhet. Bokföring, personal, lagerhistorik och andra ännu inte inlästa moduler saknas uttryckligen i svaret; de ersätts inte med tomma register.
- `GET /api/state?view=overview`: samma grunduppgifter, fullständiga fakturautkast och serverberäknat arbetsunderlag för översikten. Beräkningen använder samma gemensamma översiktslogik som tidigare. Automatisk backupstatus uppdateras fortsatt separat.
- `GET /api/state` och `?view=full`: den befintliga kompletta modellen, för övriga vyer, rapporter och utskrifter. Äldre användning av API:t fungerar fortfarande. Scope är ett urval av data, inte ett behörighetssystem.

Översiktens serverberäkning läser de affärsuppgifter som krävs för att prioritera arbetet. Den skickar inte fulla huvudboksrader, löneuppgifter, PDF-historik eller bokslutssnapshots till klienten. Det fullständiga svaret finns kvar och är fortfarande stort när en avancerad modul behöver det. Nästa möjliga steg är att dela upp ytterligare moduler.

## Sessions- och samtidighetsskydd

Varje svar anger företagets databas-session. Klienten ersätter hela sitt tillstånd och accepterar endast rätt session och senaste inläsning/navigering. Om användaren byter flik under en inläsning får ett gammalt svar inte överta vyn. Ett mottaget företagsbyte låser kvar läget där aktiv databas måste läsas in på nytt, så att ett äldre svar inte kan återställa det gamla företaget. Servern avvisar gamla sessionstoken även för de nya läsvyerna.

Flera fönster uppdaterar rätt vy med rätt datamängd. Osparade formulär skrivs inte över av automatisk uppdatering, och postversioner förhindrar att samtidiga ändringar sparas över varandra. Import, native IPC, databasbyte och utskriftsunderlag behåller sina befintliga kontroller.

## Verifiering

- Nya API-vyer jämförs med den fullständiga modellen: identiska grundregister/postversioner, identiska översiktsgrupper, fakturautkast och artikelspärrar. Okänd vy och gamla företagstoken avvisas.
- Gränssnittstest följer faktisk nätverkstrafik och kontrollerar att start, kund-/artikelredigering och uppdatering från ett annat fönster inte begär full data. Artikelpris kan ändras medan lagerbundna nummer/enheter är låsta.
- Samtidig kundredigering, osparade fält, fördröjd navigering, misslyckad hämtning med nytt försök, nytt fakturautkast och ett företagsbyte medan ett gammalt svar hålls tillbaka provas genom gränssnittet.
- Ordinarie tester och Electron-testet täcker dessutom affärsflöden, rapporter, kompletta exporter, PDF, separata fönster och företagsisolering. Tester som tidigare läste ännu oöppnade moduler direkt ur klientens interna tillstånd hämtar nu uttryckligen full data i sin testförberedelse.
- Mätningen jämför kontrollsumman över affärsuppgifter före/efter och efter byte till ett tomt företag och tillbaka. Endast förväntade systemhändelser om programversion undantas; finansiella händelser ingår. Källdatabasen är orörd och testet använder bara temporära kopior.

## Återskapa

Kör `npm run benchmark -- /tmp/sizzla-resultat.json` enligt [mätreceptet](../scripts/benchmark.cjs). Resultatfilen får inte finnas. För före-/efterjämförelse används `SIZZLA_BENCHMARK_ROOT` med en separat lokal källkodskopia och installerade beroenden. Mätningarna ovan gjordes med Nodes CPU-profilerare aktiverad på båda versionerna.

- [Alla resultat före](performance/lazy-before-0.29.2.json)
- [Alla resultat efter](performance/lazy-after-0.29.3.json)
- [Föregående optimering, 0.29.2](PRESTANDA.md)
