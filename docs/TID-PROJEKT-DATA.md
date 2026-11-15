# Tid & projekt – selektiv inläsning i 0.29.8

Projektlistan använder `time-projects`: kompletta projektuppgifter och summerade timmar utan alla tidregistreringar, fakturasnapshots eller händelser. Budgetutfall per projekt och de fyra sammanfattningsrutorna räknas från samma poster som tidigare. Sammanfattningsrutorna gäller fortsatt hela företaget även när tidslistan filtreras.

`time-entries` hämtar samtliga tidsrader för valt projekt och datumintervall, med samma ordning och revisioner som komplett vy. Tomt projekt eller datum betyder ingen begränsning. Status och textsökning filtreras därefter i klienten över hela det hämtade urvalet. Hela det valda urvalet finns kvar för export och utskrift; sidindelningen begränsar bara skärmvisningen.

Tidslistan får även fakturaunderlagens huvuden så att överförd och utfärdad tid kan skiljas åt. `time-batches` hämtar listan över fakturaunderlag utan underlagens kompletta tids- och fakturakopior. Kopplingen till aktuell kundfaktura och fakturautkastets uppdatering hämtas med SQL-kopplingar i stället för separata uppslag per underlag. Den kompletta standardvyn behåller sitt innehåll.

Redigerare, detaljvyer, skapande/återtag av fakturaunderlag och händelsefliken hämtar fortfarande fullständig företagsvy innan de öppnas. Särskilt faktureringsurvalet får hela underlaget, så att ett tidigare visningsfilter inte döljer andra fakturerbara poster. Befintliga regler för granskning, projekt- och personrevisioner, dygnsgräns, låsta timmar och oföränderliga snapshots behålls. Utskriftsfönster använder fortsatt fullständig företagsvy. Efter redigering kan denna redan inlästa vy användas direkt i listorna.

API-svar markerar oladdade delar genom att utelämna dem. Projekt- och datumurval följer med svaret och kontrolleras innan listan visas. Sena svar efter navigering eller företagsbyte ignoreras. Databasschema 10 och säkerhetskopieformatet ändras inte.

## Verifiering

API-test med demonstrationsdatabasen jämför projekt, sammanfattningar, budgetutfall, underlagshuvuden och filtrerade tidsrader mot komplett vy. Det täcker enskild dag, alla projekt, okänt projekt, omvänt datumintervall, ogiltigt datum och felaktig databasnyckel. Saknat projekt eller omvänt intervall ger samma tomma urval som tidigare filtrering; ogiltigt datum avvisas. Läsningar lämnar lagrade tidsuppgifter oförändrade.

Gränssnittstester öppnar projektlistan utan tidsrader, väljer projekt och datum, jämför CSV och utskrift med hela det valda urvalet och kontrollerar att faktureringsdialogen får samtliga berättigade poster. Ett revisionskonflikttest bevarar osparat projektnamn när en annan redigering hunnit sparas. Befintliga tester verifierar godkännande, fakturautkast, återtag, rapporter, flera listsidor och svenska/engelska.

## Datamängd på stor testdatabas

| Vy | JSON-byte |
| --- | ---: |
| Hela företaget | 36 209 214 |
| Projektlista med sammanfattningar | 89 578 |
| Samtliga 6 000 tidsrader | 3 758 651 |
| Lista över fakturaunderlag | 89 590 |
| Ett projekt, en arbetsdag | 90 319 |

Projektlistans svar är cirka 99,8 procent mindre än hela företagsvyn. Mätningen gäller den publicerade syntetiska databasen med 150 projekt och 6 000 tidsrader. Det filtrerade urvalet innehåller en rad. Den stora databasen saknar fakturaunderlag; deras kopplingar och faktureringsflöden kontrolleras därför separat med demonstrationsdatabasen och funktionstester.

Detta mäter datamängd, inte uppstartstid på Windows eller macOS. Kör `node scripts/benchmark-time.cjs /tmp/nytt-resultat.json` för att reproducera på en temporär kopia. Befintliga rapportfiler skrivs inte över. Se [time-payload-0.29.8.json](performance/time-payload-0.29.8.json) för råresultat och testdatabasens kontrollsumma. Mätningen kontrollerar också att tid och bokföring är oförändrade efter läsningarna.
