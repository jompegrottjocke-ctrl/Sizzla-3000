# Datainläsning för Personal & lön 0.29.4

Personalregistret öppnas utan full bokföring, andra företagsregister, samtliga lönesnapshots eller frånvaroposter. Tre läsvyer används:

| Vy | Innehåll |
| --- | --- |
| `employees` | Kompletta anställda med bilder och revisioner, företags-/sessionsmetadata samt sammanfattande antal löneutkast och godkända, ej betalda körningar. |
| `hr-runs` | Samma grunduppgifter och samtliga kompletta lönekörningar. Används för löner och AGI. |
| `hr-leave` | Samma grunduppgifter och komplett frånvaro, inklusive historiska/makulerade poster för befintlig filtrering och semesterberäkning. |

Anropen använder `GET /api/state?view=...`. Ej inlästa register saknas uttryckligen; de ersätts inte med tomma listor. Klienten kontrollerar vilken del som finns innan vyn visas och återanvänder endast ett svar som innehåller underlagen. Fullständigt `GET /api/state` finns kvar för andra moduler, äldre användning och utskriftsfönster. Läsvyerna är urval av data, inte ett nytt behörighetssystem.

## Mätning

Jämförelsen använder 0.29.3 (`06f90f7`) och 0.29.4 på samma Linux/Chromium-miljö med Node.js 24, 1440 × 1000 och normal textstorlek. Den publicerade stora testdatabasen innehåller **60 anställda**, 3 000 kundfakturor, 7 900 verifikationer och 6 000 tidsrader. Just den volymdatabasen har **inga lönekörningar eller frånvaroposter**. Mätningen visar främst vinsten av att inte hämta andra modulers data när Personal öppnas; den utgör inte ett stresstest av en stor lönehistorik.

| Moment | Före 0.29.3 | Efter 0.29.4 |
| --- | ---: | ---: |
| Data vid öppning av Personal, byte | 36209214 | 40091 |
| Första Personal-öppning, ms | 1641.6 | 144.4 |
| API, anställda, ms | 1245.0 | 2.0 |
| API, lönekörningar (tom historik), ms | 1199.4 | 1.9 |
| API, frånvaro (tom historik), ms | 1203.1 | 1.6 |

Första öppning mäts en gång; API-tider är median av tre körningar. Båda versionerna kördes med Nodes CPU-profilerare aktiverad. Siffrorna är orienterande utvecklingsmätningar, inte garantier för andra datorer. De mäter webbläsarvyn, inte kallstart av en paketerad Mac-/Windows-binär. I råresultaten används full inläsning som jämförelse för HR-vyer som den äldre versionen saknar; den äldre versionens faktiska första Personal-sida hämtar också full data.

När Lönekörningar eller AGI öppnas läses fortfarande hela HR-lönehistoriken, inte bara en sida eller en månad. Export och månadsurval arbetar därför på komplett underlag. Uppdelning av körningslista och enskilda snapshots kan införas senare om mätningar motiverar det.

## Granskning och samtidighet

HR-vyerna hämtar aktuella anställda tillsammans med sina löne-/frånvarounderlag. Befintlig jämförelse av personrevision och företagssnapshot används när ett löneutkast öppnas. Ändrade anställningsuppgifter nollställer berörd skatte-/avgiftsgranskning; oförändrade underlag behåller den. Löneräkneregler och skrivkommandonas validering har inte ändrats.

Postrevisioner, skydd för osparad redigering, navigeringsgeneration och databas-session används även för HR. Automatisk uppdatering från ett annat fönster får inte skriva över ett öppet formulär. Gamla företagstoken avvisas. Uppdelningen ändrar inte databasformat, arkiverade poster, bilder eller historiska lönebesked.

## Verifiering

- API-test på den mindre, rikare demodatabasen jämför anställda inklusive bilder/revisioner, samtliga lönekörningar, frånvaro och sammanfattningar mot den fullständiga modellen.
- En profiländring bevarar bilden, höjer personrevisionen, avvisar en gammal revision och lämnar befintliga lönesnapshots identiska. Gamla databas-sessioner avvisas i samtliga nya vyer.
- Gränssnittstest registrerar nätverkstrafik och kontrollerar att Personal, profiländring, WhatsApp-val, löneutkast, frånvaro och AGI inte begär hela företagets tillstånd.
- Samtidig redigering bevarar användarens osparade roll och visar konflikt. Ändrad lön kräver ny granskning i utkastet. Att öppna och stänga utkastet ändrar inte dess lagrade snapshot. AGI-CSV innehåller alla personer i valt månadsunderlag.
- Ordinarie tester täcker även bildförminskning/byte/borttagning, lönesparande, godkännande, lönebesked, bokföring, betalningsunderlag, språk, stor text och flera fönster.
- Prestandareceptet använder temporära kopior av den publicerade databasen och jämför identiska affärsuppgifter före/efter samt efter företagsbyte. Endast förväntade versionshändelser undantas; finansiella händelser ingår. Källfilen ändras inte.

[Resultat före](performance/hr-before-0.29.3.json) · [Resultat efter](performance/hr-after-0.29.4.json) · [Mätrecept](../scripts/benchmark.cjs)

Kör `npm run benchmark -- /tmp/sizzla-resultat.json` med en ny resultatfil. För jämförelse mot en separat lokal källkodskopia används `SIZZLA_BENCHMARK_ROOT`. Se även [selektiv inläsning i 0.29.3](SELEKTIV-DATA.md).
