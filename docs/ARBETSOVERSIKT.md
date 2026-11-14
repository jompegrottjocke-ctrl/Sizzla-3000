# Arbetsöversikt

Version 0.26.0. Startsidan **Översikt** visar uppgifter för den aktiva företagsdatabasen. Vyn är läsande: den skickar inga påminnelser, ändrar inga saldon och utför ingen leverans, betalning eller bokföring. Knapparna öppnar befintliga underlag och arbetsflöden där åtgärder behöver granskas separat.

## Vad visas?

| Del | Urval och innebörd |
| --- | --- |
| Förfallna kundfakturor | Fakturor med aktiv bokföring, positivt saldo och förfallodag före dagens datum i Stockholm. En faktura som förfaller idag är inte förfallen. Spärrade fakturor och oreglerade krediter markeras, inte som klara för påminnelse. Kreditfakturor och slutreglerade fakturor räknas inte som förfallna kundkrav. |
| Leverantörsfakturor | Godkända vanliga fakturor med positivt saldo, förfallna eller med förfallodag till och med idag + sju kalenderdagar. Ännu ej bokförda godkända fakturor markeras. Leverantörskrediter och utkast räknas inte in. |
| Utfärdade kundunderlag utan aktiv bokföring | Utfärdade fakturor och krediter vars bokföring saknas/motbokats. De visas här i stället för att räknas som vanliga bokförda förfallna kundfakturor. Öppna för att granska eventuell återbokföring. |
| Väntande leveranser | Bekräftade kundorder med beställt antal kvar att leverera. Avslutade/avbrutna order ingår inte. Passerat önskat leveransdatum markeras. Order utan önskat datum finns också med. |
| Leveranser att fakturera/följa upp | Bekräftade eller avslutade order med en faktiskt registrerad, ej återtagen leverans utan aktivt fakturaunderlag. Avbrutna FU-underlag frigör leveranser. Om ordern redan har ett annat öppet fakturautkast markeras detta; öppna ordern och följ dess befintliga kontroller. |
| Lager | Lagerförda artiklar med saldo under beställningspunkt eller saldo noll. Noll visas även om beställningspunkten är noll. Enheter summeras inte. Knappen öppnar lagersaldot med artikelnummer/namn som sökurval. |
| Bank | Importerade utdrag med status pågående. Radantal och antal kopplingar visas var för sig. De subtraheras inte till ett påstått antal omatchade bankrader, eftersom bland annat informationsrader kan ha nollbelopp. Avstämda/avbrutna utdrag visas inte här. |
| Återkommande fakturering | Aktiva mallar med nästa periodstart senast idag, utan passerad sista periodstart eller väntande fakturautkast. Öppnar mallen för manuell granskning. |
| Säkerhetskopiering | Automatisk kopiering för det aktiva företaget: avstängd, väntande första kopia, daglig kopia som behöver tas, senaste registrerade lyckade kopia, fel/varning eller paus vid förberedd import. Manuell exporthistorik och faktisk kontroll av filer på måldisken ingår inte i statusen. |

En order kan visas både under leverans och fakturering eftersom det gäller olika arbetsmoment. Antalen är arbetslistornas antal, inte en summering av unika affärer eller alla företag. Vyn är inte en fullständig bevakning av deklarations-/löne-/bokslutsfrister eller en garanti om komplett bokföring.

## Belopp och prioritet

Varje dokument visar sitt belopp i SEK, EUR eller USD. Kundfakturornas summering använder kvarstående sparat bokföringsvärde i SEK. Leverantörernas summering gäller de visade positiva SEK-fakturorna, utan automatisk nettning mot andra krediter. Påminnelsers separata ränta/avgifter ingår inte i dessa fakturasaldon.

Prioritetsfiltret tar med förfallna kundfakturor, leverantörsbetalningar som förfallit eller förfaller idag, kundunderlag utan aktiv bokföring, passerat önskat leveransdatum aktuella återkommande perioder och tomt lager. Övriga pågående uppgifter syns med filtret avstängt. Säkerhetskopieringspanelen är separat och visas även när arbetslistorna filtrerats.

Sökningen matchar dokumentnummer, namn, datum och valuta. Varje lista visar först fem träffar och kan utökas i steg om tio med **Visa fler**. Antal och summering gäller samtliga träffar i urvalet, inte bara de först synliga raderna. Registerstatistik, senaste fakturautkast och kom-igång-flödet finns kvar längre ned. Vid första uppstart utan företagsnamn visas företagsinställningen först.

## Aktualitet och navigering

Tidpunkten **Uppgifter inlästa** visar när den aktuella datan hämtades. **Uppdatera översikten** hämtar aktiv databas igen. Vid fel behålls tidigare uppgifter och en feltext visas. Efter fem minuter markeras uppgifterna som äldre vid omrendering och vid lyckad periodisk hämtning av backupstatus. Listorna uppdateras inte kontinuerligt i bakgrunden.

Backupstatus hämtas genom den befintliga bakgrundskontrollen var 30:e sekund samt när fönstret blir synligt. Panelen kan uppdateras utan att sökning/listurval eller andra uppgifter ersätts. Den bekräftar varken att kopian fortfarande finns på måldisken eller att senare registreringar ingår i den.

Ett klick på ett underlag läser aktuella uppgifter på nytt och kontrollerar att underlaget finns kvar. Databassessionen måste vara densamma; en gammal begäran efter företagsbyte öppnar inte en annan databas under samma ID. Fakturor öppnas i rätt utfärdad-/kreditvy, order i Kundorder, lager i ett nytt artikelurval och bankutdrag i rätt avstämning. Tidigare sök-/filtervärden i målmodulen rensas där de annars skulle dölja målet. Bokföring och transaktioner ändras inte av navigeringen.

För bank gäller endast pågående importerade utdrag. Den här översikten gör ingen fristående ny kontroll av alla avstämda utdrag; öppna respektive utdrag i Bank & avstämning för kontroll mot ändrat underlag.

## Teknik och lagring

`public/overview-math.js` bygger och sorterar arbetslistorna utan att ändra indata. `public/overview.js` renderar dem och öppnar befintliga vyer. De använder `/api/state` och den redan befintliga läsande backupstatusen. Ingen ny skriv-API, tabell eller schemamigrering tillkommer; schema 10 är oförändrat.

Sökning, prioritetsfilter och visningsgränser är tillfälliga vyval. Affärsdata kommer från den aktiva databasen och nya val skapar inga bokföringsposter. Svenska/engelska, befintliga teman, fet text och textstorlek stöds.
