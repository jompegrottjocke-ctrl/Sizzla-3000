# Shopify – manuell saldosynk (beta), version 0.31.0

Välj **Lager → Webbshop → Plattform → Shopify**. WooCommerce finns kvar som eget val.

Ange butikens ursprungliga HTTPS-adress på `namn.myshopify.com` och ett Admin API-åtkomsttoken från en installerad Shopify-app med `read_inventory`, `write_inventory`, `read_locations` och `read_products`. Anpassade butiksdomäner, sökvägar och frågesträngar godtas inte som API-adress. OAuth-installation och automatisk tokenförnyelse ingår inte; använd ett aktuellt token med rätt behörigheter.

Tryck **Hämta lagerplatser** och välj den aktiva lagerplats som motsvarar Sizzlas lager. Välj därefter en lagerartikel och **Hämta och granska**. Förhandsgranskningen visar Sizzlas tillgängliga antal, saldot på vald Shopify-lagerplats och målsaldot. Variantens SKU måste matcha exakt och vara entydigt. Varianten måste ha lagerhantering, neka restorder (`inventoryPolicy: DENY`) och ha ett icke-negativt heltalssaldo på vald lagerplats. Produktvarianter stöds genom unika SKU:er. Saknad lagerkoppling, flera träffar eller ofullständig paginering avvisas.

Kopplingen använder Shopify Admin GraphQL API `2026-10`, `inventoryItems`, `locations` och `inventorySetQuantities`. Upp till 100 aktiva lagerplatser hanteras; fler kräver utökat pagineringsstöd och avvisas i denna version. API-version och kompatibilitet måste följas vid kommande Shopify-versioner.

## Granskning och samtidighet

Samma manuella princip gäller som för WooCommerce:

- Endast sänkning eller oförändrat saldo jämfört med förhandsgranskningen; ingen automatisk påfyllning.
- Befintliga webborders ska vara registrerade i Sizzla och kassan pausad under överföringen.
- Endast uttryckligen vald lagerplats ändras. Sizzlas lager är samlat och fördelas inte automatiskt mellan flera Shopify-lagerplatser eller flera försäljningskanaler.
- Ingen orderimport, bakgrundssynkronisering eller automatisk återförsökning ingår.

Det granskade underlaget signeras, binds till företag, butik, lagerplats och API-version, gäller i fem minuter och får användas en gång. Ändrad lagerplats eller ändrade anslutningsuppgifter rensar förhandsgranskningen. Servern kontrollerar lokala saldon/reservationer och remote SKU/saldo på nytt.

Shopify-skrivningen skickar `compareQuantity` och `ignoreCompareQuantity: false`. Därmed ska Shopify avvisa ändringen om tillgängligt saldo ändrats efter den sista läsningen. Skrivningen använder också en separat idempotensnyckel genom `@idempotent`. Ett GraphQL-fel, avvisat jämförelsevärde eller behörighetsfel visas utan att behandlas som en lyckad överföring. Ett avbrutet eller oklart skrivförsök markeras som osäkert och ska kontrolleras i butiken före ett nytt försök. Nyckeln används inte för automatisk omsändning.

Det finns inget gemensamt atomiskt lås mellan lokal SQLite och Shopify. Lokala förändringar medan skrivningen pågår flaggas därför för ny granskning. Kassapaus och registrering av befintliga webborders behålls även med jämförelseskyddet. Detta är inte obevakad eller dubbelriktad lagersynkronisering.

## Token och historik

Token skickas till Shopifys HTTPS-API i `X-Shopify-Access-Token` och sparas inte i databasen, inställningar, loggar eller granskade underlag. Det hålls i dialogens/minnets uppgifter tills dialogen stängs eller överföringsförsöket avslutas. Fältet är maskerat. Efter försök rensas token ur dialogen.

Samma begränsningar för DNS-adresser, certifikatkontroll, svarsstorlek, timeout och nekade omdirigeringar gäller som för WooCommerce. Appens lokala API kräver rätt ursprung och aktiv företagsnyckel.

Påbörjat försök loggas före nätverksanrop och slutresultatet loggas därefter, med plattform, butik, lagerplats, lagerpost, SKU, operation och målsaldo. Åtkomsttoken inkluderas inte. Shopify och WooCommerce skiljs åt i den gemensamma listan över senaste överföringar. Saknad sluthändelse eller fel vid sparande av resultat kräver manuell kontroll. Databasschema 10 och säkerhetskopieformat är oförändrade.

## Verifiering och begränsning

Enhetstester med simulerad transport verifierar lagerplatser, exakta SKU-träffar, jämförelsevärde och idempotensnyckel, sänkning/oförändrat saldo, nekade restorder, saknade lagernivåer, dubbla SKU:er, ofullständig paginering, GraphQL-fel, lokala/remote ändringar, företag/lagerplats, manipulerat underlag och osäkra skrivförsök. HTTP-test verifierar lokalt ursprung, företagsnyckel och att token inte sparas.

Gränssnittstest med simulerade svar verifierar plattformsval, lagerplatser, ogiltigförklarad granskning efter lagerplatsbyte, bekräftelser, överföring, tokenrensning och engelska. Befintliga WooCommerce-tester körs också.

Ingen riktig Shopify-butik eller verkligt token har använts. Den officiella dokumentationssidan blockerades av exekveringsmiljöns nätverksproxy, så API-versionens schema och det verkliga butikssvaret har inte kunnat verifieras här. Prova i en egen testbutik före skarp användning. API-fel avvisas; programmet ska inte tolka ett misslyckat anrop som en överföring.

Officiella referenser:

- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/inventoryItems
- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/locations
- https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/inventorySetQuantities
