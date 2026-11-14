# Inköp och Lager – selektiv inläsning i 0.29.6

Inköpslistorna hämtar leverantörer och dokumenthuvuden med aktuella belopp, saldon, status och revision. Fakturarader, företagskopior, inleveranser och betalningshistorik ingår inte i listsvaret. Sökning använder samma huvudfält som tidigare och reskontrans CSV-export använder hela det filtrerade urvalet.

Lagersaldo och inventeringslistan hämtar artikeluppgifter, saldo, inställningsrevision, senaste rörelserevision och inventeringshuvuden med antal rader. Rörelser och händelser markeras som oladdade genom att utelämnas; de ersätts inte av tomma listor.

Vid öppning av inköpsunderlag, redigerare eller inventering hämtas fortfarande den fullständiga företagsvyn. Även inköpens historikflik, lagerrörelser och utskriftsfönster använder fullständiga underlag. Det är en avsiktlig avgränsning: historiska saldon räknas från hela rörelsehistoriken och befintliga kopplingar till bokföring och källdokument finns kvar. Efter öppning/sparande kan fönstret behålla fullständiga data. Det här steget minskar alltså främst den första inläsningen, inte varje efterföljande detaljöppning.

API-vyerna `supply` och `stock` omfattas av samma databas- och sessionskontroller som övriga vyer. Sena svar efter navigering eller företagsbyte ignoreras. Databasschema 10 är oförändrat.

## Verifiering

API-test med den rika demonstrationsdatabasen jämför samtliga lagerartiklars saldon/revisioner, inventeringshuvuden och inköpshuvuden mot fullständig vy. Tester av inköpsflöden omfattar delvisa inleveranser, krediter och rättade betalningar. UI-test öppnar selektiva vyer, redigerar leverantör, bevarar osparad text vid temabyte och öppnar komplett lagerhistorik. Befintliga tester verifierar historiska negativa saldon, samtidiga ändringar, inventeringar, export och utskrift.

På den stora syntetiska databasen minskar JSON-svaret från 36 209 214 byte för fullständig vy till 531 545 byte för Inköp och 685 080 byte för Lager (cirka 98 procent mindre). Databasen har 3 000 artiklar, 200 leverantörer, 600 leverantörsfakturor och 300 lagerrörelser, men inga inköpsorder eller inventeringar. Dessa funktioner kontrolleras därför med separata funktionstester. Byteantalet är ingen mätning av uppstartstid på Windows eller macOS. Råresultat: [supply-payload-0.29.6.json](performance/supply-payload-0.29.6.json).
