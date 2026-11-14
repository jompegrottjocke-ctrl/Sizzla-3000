# Återkommande fakturering

Version 0.26.0. Under **Fakturering → Återkommande fakturering** finns fakturamallar för exempelvis abonnemang, hyra och serviceavtal. Funktionen kör lokalt i aktiv företagsdatabas och kräver ingen molntjänst.

## Från mall till faktura

1. Ange ansvarig operatör i Bokföring eller operatörspanelen, och fyll i företagets namn och organisationsnummer.
2. Skapa en mall med kund, namn, första periodstart, intervall, betalningsdagar, avtalsvaluta, rader och eventuell avtalsreferens. Avslut är valfritt och avser **sista tillåtna periodstart**.
3. Öppna mallen när perioden är aktuell. Ange fakturadatum från periodstart till idag. Förfallodatum beräknas från fakturadatum och betalningsvillkor (0–365 dagar).
4. Granska period, kund, rader, belopp och eventuell valutakurs. Bekräfta för att skapa ett vanligt fakturautkast.
5. Granska och ändra vid behov utkastets rader. Utfärda och bokför via det vanliga fakturaflödet, med räkenskapsår, kontering och uttrycklig bekräftelse. Utkastet är ingen faktura innan det utfärdats.

Inga fakturor skapas i bakgrunden. Inget skickas, betalas eller bokförs automatiskt. Ett utkast åt gången får vänta per mall. När det utfärdats kan nästa aktuella period hanteras. Äldre perioder hoppas inte över automatiskt. Översikt visar aktiva mallar vars nästa period är aktuell och saknar väntande utkast; knappen öppnar rätt mall.

## Perioder och belopp

Veckovis, varannan vecka, månadsvis, kvartalsvis, halvårsvis och årsvis stöds. Månadsskiften utgår från det ursprungliga startdatumet: 31 januari → 28/29 februari → 31 mars. En period löper från sin start till dagen före nästa start. Exempel: 31 januari–27 februari när nästa start är 28 februari. Skottår hanteras från den ursprungliga ankardagen.

**Hela mallbeloppet används för varje period, även den sista.** Sista periodstart är inte ett slutdatum för tjänstens omfattning. Ingen automatisk proportionering, indexuppräkning eller avtalsrättslig tolkning görs. Anpassa raderna i utkastet efter avtalet när en kortare period ska debiteras.

Priser är exklusive moms, med 0, 6, 12 eller 25 procent per rad. Belopp beräknas i heltalsören med den vanliga avrundningen. SEK, EUR och USD stöds. En mall i utländsk valuta lagrar avtalade priser i den valutan, utan en permanent växelkurs. Vid varje nytt utkast krävs kurs, kursdatum och källa för granskning. Artikelregistret har SEK-priser; vid artikelval i EUR/USD sätts priset till noll och avtalspriset måste anges manuellt. Även vanliga försäljningsregler och valutakontroller gäller vid utfärdande.

## Ändringar och rättelser

Efter första periodunderlaget låses kund, valuta, första start och intervall. Det gäller även om underlaget återtagits eller perioden uttryckligen hoppats över. Skapa en ny mall för en annan plan. Pris, text, betalningsvillkor och sista periodstart kan ändras för framtida utkast; befintliga utkast och utfärdade fakturor ändras inte. Sista periodstart får inte föregå start eller redan hanterade perioder.

- **Pausa/återuppta:** sparar orsak. Planerade datum flyttas inte; återupptagning tar vid på samma nästa period. Ett befintligt utkast finns kvar.
- **Hoppa över nästa period:** kräver orsak och granskning. Perioden sparas som överhoppad utan faktura. Ingen automatisk återställning finns.
- **Återta periodens utkast:** kräver orsak och att det senaste utkastet inte utfärdats eller ändrats efter inläsningen. Utkastet, inklusive manuella ändringar, tas bort. Periodunderlag och händelse bevaras, och samma period kan skapas igen med aktuella malluppgifter.
- **Avsluta mall:** kräver orsak och förhindrar nya perioder. Befintligt utkast måste fortfarande hanteras. En avslutad mall kan inte återupptas.
- **Utfärdad faktura:** rättas genom det vanliga kreditflödet. Kredit eller motbokning frigör aldrig perioden för ny fakturering. Ny debitering behöver hanteras uttryckligen enligt det vanliga fakturaflödet.

Kund och valuta är låsta även i genererat utkast. Rader och pris kan ändras; kontrollera omfattning, moms och avtalsperiod före utfärdande. Underlagets datum får inte ligga före periodstart eller efter idag. Ändrade uppgifter efter en förhandsgranskning kräver en ny granskning. Dubblettkontroll och skapande görs i samma databastransaktion.

## Historik och avgränsning

Varje period behåller mallens och utkastets ursprungliga uppgifter, ansvarig operatör och skapandetid. Ändringar och orsak till återtagning, överhoppning eller statusbyte sparas. Mallen länkar till utkast eller utfärdad faktura; fakturavyn länkar tillbaka. Avtalsperioden följer med fakturans och kreditens utskrift. Vanlig PDF-/utskriftshistorik används, med samma källtyper som andra fakturor. Ett återtaget utkast behåller sin tidigare utskriftshistorik om sådan finns.

Mallhistoriken visar de senaste 200 mallhändelserna från det aktiva företaget, filtrerade per mall. Äldre händelser är bevarade i databasen. Periodunderlagen begränsas inte av detta urval. Vanliga fakturaändringar och bokföringshändelser följer sina befintliga historikflöden.

Funktionen gör inga automatiska lageruttag, projektöverföringar, löneberäkningar, autogirodragningar, betalningsförsök, e-fakturautskick eller externa anslutningar. En artikel på en rad är en referens, inte en order-/lagerleverans. Underlagen sparas i SQLite-tabellen `records` som `recurring_plan`, `recurring_run` och `recurring_event`. Fullständig säkerhetskopiering/import tar med dem; databasschema 10 är oförändrat. Byte av företag håller mallar och historik åtskilda och gamla databassessioner får inte skriva efter bytet.
