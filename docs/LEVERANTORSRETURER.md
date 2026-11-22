# Leverantörsreturer – 0.37.0

Under **Inköp → Inköpsorder → Öppna** väljer du **Registrera leverantörsretur** vid den ursprungliga inleveransen. Endast aktiva inleveranser med lagerförda artikelrader kan användas. Ordern kan vara utfärdad eller avslutad.

## Skicka tillbaka varor

1. Ange datum då varorna faktiskt skickades tillbaka, returunderlag/referens och orsak.
2. Välj antal per inleveransrad. Högst mottaget antal minus tidigare aktiva returer tillåts. Nollrader utelämnas; tjänster och ej lagerförda rader kan inte väljas.
3. Granska och bekräfta. Ett LR-nummer tilldelas, lagret minskar och ansvarig operatör sparas. Detta är en lokal ansvarsuppgift, inte verifierad inloggning.

Lager måste finnas tillgängligt även med hänsyn till andra kundorders reservationer. Historiskt negativt saldo och ändringar före en senare inventering avvisas. Returdatum får inte ligga före inleveransen eller i framtiden.

Returpost, lagerrörelser, nummerserie och revisionsändringar sparas i samma transaktion. Fel rullar tillbaka allt. En returreferens kan inte återanvändas för samma inleverans, även om en tidigare registrering rättats. Samtidiga registreringar från samma granskade revision kan inte båda lyckas.

Returen skapar ingen leverantörskredit, betalning eller bokföring. Prisavdrag utan fysisk retur ska inte minska lagret. Registrera inte också ett manuellt uttag för samma varor. Äldre fristående manuella uttag kan inte automatiskt identifieras som samma retur; stäm av dem först.

Orderns ursprungliga mottagna antal och inleveransen bevaras. Returen öppnar inte ordern för en ny automatisk mottagning eller fakturering. En eventuell ersättningsleverans hanteras som en ny beställning/inleverans med eget underlag.

## Koppla leverantörskredit

Registrera, godkänn och bokför leverantörens kredit genom det vanliga fakturaflödet. På returposten väljer du **Koppla / ändra leverantörskredit**, anger orsak och bekräftar.

Krediten och dess originalfaktura måste vara godkända och bokförda, avse samma leverantör och vara kopplade via originalfakturan till samma inköpsorder. Artikel-ID och enhet måste finnas på både faktura och kredit; artikelnummer eller beskrivning gissas inte fram. Den vanliga överföringen från inköpsorder till faktura och vidare till kredit bevarar nu artikelkopplingen vid sparande i gränssnittet. Om artikelnummer eller enhet ändras manuellt i fakturaraden bevaras inte en gammal artikelkoppling.

Flera returposter kan hänvisa till en kredit. Summan per artikel och enhet får inte överstiga kreditens antal eller återanvända originalfakturans antal genom flera olika krediter. Kopplingen är en underlagsreferens, inte automatisk ekonomisk avstämning av priser och moms. Kontrollera beloppen separat.

Kopplingen ändrar inte lager, fakturabelopp, befintlig kvittning eller bokföring. Felaktig koppling kan ändras eller tas bort med dokumenterad orsak; tidigare koppling och ansvarig bevaras. En senare finansiell motbokning tar inte automatiskt bort en historisk returreferens. Fakturavyn visar aktuell bokföringsstatus.

Äldre godkända fakturor utan inköpsorder- eller artikelkoppling kan inte automatiskt få dessa samband. Returen kan finnas utan kreditkoppling medan underlagen granskas; avsaknad av koppling avgör inte om företaget har rätt till kredit.

## Rätta en felregistrering

**Rätta leverantörsretur** skapar en motsatt lagerrörelse och bevarar originalet. Ange rättelsedatum och orsak. Koppla först bort eventuell kreditreferens. Rättelsen ändrar inte kredit eller betalning och innebär inte att varor faktiskt tagits emot igen. En verklig ny inleverans registreras separat.

Rättelsen får inte föregå returen eller bryta en senare inventering. Den ursprungliga inleveransen kan inte återtas så länge den har aktiva leverantörsreturer.

## Historik och lagring

Ordervyn visar LR-nummer, inleveransreferens, datum, antal, orsak, ansvarig, kreditkoppling och rättelser. Händelser visas även under **Inköp → Historik**. Lagerhistorikens **Leverantörsretur** och **Rättelse av leverantörsretur** länkar tillbaka till ordern. Svenska, engelska och stor text stöds.

Returer ligger i befintliga `records` som `purchase_return`, med separat räknare och händelser som `purchase_return_counter` och `purchase_return_event`. Ursprungliga returuppgifter skyddas mot ändring/radering med databasregler. Lagerrörelser använder `purchase_return` respektive `purchase_return_reverse` som källtyp. Status och kreditreferens uppdateras med bevarad historik. De senaste 200 returhändelserna visas; samtliga sparas i databasen.

Databasschema 10 behålls. Företagsbyte, fullständig export/import och säkerhetskopiering omfattar posterna. Äldre kopior utan leverantörsreturer och utan de två nya returreglerna tillåts och får reglerna vid öppning. En kopia med returposter men utan skyddsregler avvisas. Företagets organisationsnummer skyddas efter en registrerad leverantörsretur.

Ingen automatisk lagervärdering/kostnadsbokföring, transportbokning, returetikett, extern återbetalning, seriell spårning eller separat karantän ingår. Varorna hanteras som fungibla inom befintligt lager; kopplingen till inleverans är ett dokumenterat underlag, inte ett bevis på en viss fysisk enhets identitet.

## Verifiering

Automatiska tester omfattar delreturer, överretur, ogiltiga antal/datum, dubbletter, samtidighet, lagerbrist, reservationer, kreditkapacitet, återanvändning över flera krediter, annan faktura/order, avslutad order, inventeringsgräns, rättelse, import/återställning och företagsisolering. Gränssnittstestet går genom orderfaktura och kredit med bevarad artikelkoppling, retur, koppling/bortkoppling, rättelse, historik och lagerlänk. Det omfattar engelska och synlig Spara-knapp vid 200 % text.

Den sammanhängande företagsflödeskontrollen använder nu både leverantörsretur och kundretur. Förväntade bank-, reskontra-, moms- och lagersaldon stämmer även efter återställning. Testdata ersätter inte granskning av verkliga inleveranser, returunderlag, fakturor eller bankutdrag.
