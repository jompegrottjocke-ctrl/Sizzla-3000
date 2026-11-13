# Offerter, kundorder och leveranser

Version 0.22.0. Flikarna **Offerter** och **Kundorder** finns under **Fakturering**. Stödet gäller SEK. Välj ansvarig i panelen före registrering; namnet sparas med händelserna. Det är en lokal ansvarsuppgift, inte en autentiserad inloggning.

## Från offert till order

1. Skapa offert, välj kund, datum, giltighetstid, rader, priser, moms och villkor. Artikelval bevarar artikel-ID, artikelnummer och enhet. Manuella rader kan användas för tjänster eller annat som inte lagerförs.
2. Spara och granska. **Utfärda offert** tilldelar OF-nummer och låser uppgifterna. Spara PDF och skicka själv; utfärdande betyder inte att dokumentet skickats.
3. När kunden accepterat: ange verkligt acceptdatum och referens till kundens beställning. Datumet måste ligga inom offertens giltighetstid. Accept skapar en bekräftad kundorder med KO-nummer en gång. Kontaktuppgifter uppdateras från kundregistret, medan ursprungsofferten bevaras.
4. En avböjd eller avbruten offert bevaras med orsak. Ändra en utfärdad/utgången offert genom **Kopiera till ny offert**, granska och utfärda den nya versionen. Den får ett nytt nummer och är ett separat dokument.

Det går även att skapa ett kundorderutkast direkt och bekräfta det utan offert. Ett bekräftat orders rader och priser ändras inte. Avsluta återstående order med orsak och skapa en ny order om villkoren behöver ändras. OF-, KO-, UL- och FU-nummer har separata automatiska serier; avbrutna nummer återanvänds inte. Inget av detta skapar bokföring.

Företagsnamn och organisationsnummer behövs. Organisationsnumret skyddas efter utfärdad offert eller bekräftad kundorder; använd separata företagsdatabaser för olika företag.

## Leverera och följ lager

Registrera faktiskt levererat eller utfört antal med datum och referens. Noll utesluter raden. Delleveranser stöds; antalet får inte överstiga vad som återstår på ordern. Tjänster måste också registreras som utförda före fakturaunderlag. Leveransen får UL-nummer och kan skrivas ut som följesedel utan priser.

Lagerföring bestäms när ordern bekräftas. För en lagerförd artikel skapas negativa lagerrörelser i samma databastransaktion som leveransen. Negativt saldo, ändrad lagerinställning/enhet och konflikter med senare inventering stoppas av lagerkontrollerna. Ingen reservation görs vid offert/order. Ingen automatisk kostnads- eller lagerbokföring sker. En fristående kundfaktura ändrar fortfarande inte lager; registrera inte dessutom ett manuellt uttag för en redan lagerförd orderleverans.

En felregistrerad, ännu inte fakturerad leverans kan återtas med datum och orsak. Kopplade lagerrörelser rättas med motsatta rörelser och originalen bevaras. Ett öppet fakturaunderlag måste först återtas. Utfärdad faktura rättas med kreditfaktura, och eventuell fysisk kundretur hanteras separat i lager. Kredit eller motbokning frigör inte automatiskt orderantal för ny fakturering.

**Avsluta order / avbryt återstående** hindrar nya leveranser. Finns redan leveranser får de fortfarande faktureras. Befintliga leveranser och fakturor raderas inte.

## Fakturera leveranser

Välj en eller flera hela ofakturerade leveranser och skapa fakturautkast. De valda leveranserna knyts till FU-underlaget och kan inte väljas igen i ett annat aktivt underlag. Ett öppet utkast per order tillåts: utfärda eller återta det innan nästa underlag skapas. Om ett mycket litet underlag avrundas till noll behöver fler leveranser väljas tillsammans.

Orderns belopp och moms fördelas kumulativt i heltalsören. För varje orderrad räknas avrundad andel fram till det nya fakturerade antalet minus tidigare fakturerad andel. Därmed summerar delfakturorna till ursprungsradens belopp och moms; en delfakturas enskilda rad kan avvika ett öre från separat omräkning. Fakturaunderlaget och utskriften anger avrundningssambandet.

Rader och kund är låsta till underlaget. Datum, förfallodatum och anteckning kan ändras; fakturadatum får inte ligga före ingående leveranser. Kontaktuppgifter kan uppdateras genom att öppna och spara utkastet. Belopp, moms och kopplingar kontrolleras på servern vid både sparande och utfärdande. Utfärda och bokför sedan genom det befintliga fakturaflödet med dess företags-, adress-, moms- och bokföringskontroller. Det är först då bokföring skapas. Inga bankbetalningar skickas.

Före utfärdande kan FU-underlaget återtas med orsak och kontroll mot den senaste utkastversionen. Utkastet tas bort atomiskt och leveranserna frigörs för nytt underlag. Historik och den ursprungliga underlagskopian finns kvar. Utfärdade fakturor kan inte återtas på detta sätt.

## Spårbarhet, utskrift och lagring

Offert, order, leverans, fakturaunderlag och faktura har länkar mellan sig. Lagerhistoriken länkar till kundordern. PDF för offert, orderbekräftelse och följesedel använder appens vanliga utskriftshistorik: sparade PDF-kopior förblir oförändrade och kan öppnas igen. Webbläsarläge har utskriftsförhandsvisning; automatisk PDF-arkivering kräver skrivbordsappen.

`src/trade.cjs` lagrar `trade_quote`, `trade_order`, `trade_delivery`, `trade_batch`, `trade_counter` och `trade_event` i befintliga `records`. Databasschema 10 är oförändrat. Underlagen och händelserna följer företagets databasexport och automatiska säkerhetskopia. Vyn visar de senaste 200 händelserna totalt, medan samtliga sparas i databasen. Händelser beskriver ansvarig, tidpunkt, åtgärd och orsak vid återtagning/avslut.

Skrivåtgärder använder databassession och revisionskontroll. Leverans, lagerändring, fakturaunderlag och återtagning sparas atomiskt; fel rullar tillbaka hela åtgärden. Kontrollerad överföring skyddar mot dubbel fakturering av samma leverans inom orderflödet, men kan inte upptäcka en separat manuellt skapad faktura för samma affär.

Förskott, flera valutor, automatisk e-post, elektronisk signering, lagerreservationer och automatisk returhantering ingår inte i denna version. Funktionen ersätter inte företagets rutiner för avtalsgranskning, dokumentleverans, bokföring eller underlagsförvaring.
