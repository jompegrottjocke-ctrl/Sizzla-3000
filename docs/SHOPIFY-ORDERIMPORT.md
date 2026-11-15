# Shopify-orderimport (beta), version 0.33.0

## Användning

Välj **Lager → Webbshop → Shopify → Importera Shopify-order**. Ange butikens ursprungliga HTTPS-adress på `namn.myshopify.com` och ett aktuellt Admin API-token från en installerad app med:

- `read_orders`
- `read_locations`
- `read_products`
- `read_inventory`
- `read_merchant_managed_fulfillment_orders`

Skyddade kunduppgifter måste vara tillgängliga för appen. Shopify kan begränsa orderåtkomsten till de senaste 60 dagarna om appen saknar godkänd åtkomst till äldre order. OAuth-installation, utökade behörigheter och automatisk tokenförnyelse ingår inte i Sizzla.

Hämta aktiva lagerplatser och välj den plats som motsvarar lagret i den aktiva Sizzla-databasen. Hämta sedan öppna, olevererade order. Listan visar högst tio order åt gången och använder Shopifys sidmarkörer för Nästa/Föregående. Den visar butikens orderurval; tilldelad lagerplats och de fullständiga raderna kontrolleras först när en order granskas. Kunduppgifter hämtas också vid granskning.

Granska kund, leveransadress, rapporterad betalningsstatus, SKU, antal, enhet, moms och tillgängligt lager. Okänd SKU, lokal lagerhantering som inte är aktiverad, brist eller uppgifter som inte stöds blockerar import. En stödd order importeras först efter uttrycklig bekräftelse.

## Vilka order stöds?

Första versionen importerar hela, ännu inte levererade fysiska order tilldelade en enda aktiv lagerplats:

- Ordern ska vara öppen och ha `UNFULFILLED`, utan tidigare leveranser eller återbetalningar.
- Betalningsstatus ska vara `PAID`, `PENDING` eller `AUTHORIZED`. Statusen är en rapport från Shopify, inte en lokal betalningsbokning.
- Ett enda aktivt leveransunderlag (`FulfillmentOrder`) ska vara öppet och tilldelat den valda platsen. Avbrutna historiska underlag ignoreras; andra aktiva eller ofullständigt hämtade underlag blockerar import.
- Underlaget ska omfatta samtliga artikelrader och hela deras ursprungliga antal. Redan dellevererade order, ändrade antal, uppdelning mellan underlag/lagerplatser och pausade leveransunderlag stöds inte.
- Produkterna ska vara fysiska, ha lagerförda varianter med SKU och matcha entydigt mot lagerförda artiklar i Sizzla. Produktvarianter stöds. Digitala produkter, presentkort, egna rader utan variant och blandade order med sådana rader stöds inte i detta steg.
- Högst 25 artikelrader och 10 fraktrader hanteras. Ofullständiga sidresultat avvisas och importeras inte delvis.
- Fakturerings- och leveransadresser ska vara svenska. Både butiks- och betalningsvalutan ska vara SEK. Lokal artikel-enhet används; kontrollera att SKU motsvarar samma enhet i båda systemen.

Testorder markeras som **TEST** i listan, granskningen, den lokala orderreferensen och följesedelns webbreferens. Använd en separat testdatabas/demoföretag när kopplingen provas, eftersom även en uttryckligen importerad testorder skapar lokala kunder och reservationer.

## Belopp

Programmet använder de rabatterade radbeloppen från Shopify, explicit moms och frakt. `taxesIncluded` avgör om rapporterad moms behöver räknas bort från radbeloppet för att få netto. Moms 0/6/12/25 procent stöds när alla radbelopp, styckepriser, skatter och ordertotaler kan återges exakt med programmets precision. Nollor efter öresprecision godtas utan avrundning; verkliga extra decimaler gissas inte.

Artikel- och fraktsummor kontrolleras mot aktuell ordertotal och moms. Dolda avgifter, tullar, dricks eller andra justeringar som inte kan stämmas av mot dessa rader blockerar import. Inga belopp justeras för att tvinga igenom en order.

## Lokal order, kund och reservation

Importen återanvänder samma transaktion som WooCommerce-orderimporten: kundkoppling, eventuell ny kund, ordernummer, bekräftad kundorder och historik sparas atomiskt. Lagerförda antal reserveras genom den bekräftade ordern. Fysiskt lager ändras först vid faktisk registrerad leverans i Sizzla. Delvis leverans efter import och avslut av rest använder befintliga lagerregler.

Shopify-variantens och radens ID bevaras i underlaget. Lokal orderrad har en koppling till extern rad. Leveransadressen lagras separat från faktureringskunden och används på följesedeln. Shopify och eventuell TEST-markering följer med referensen.

Dubblettskyddet använder plattform, normaliserad butiksadress och Shopifys fullständiga order-GID. Det använder inte det visade ordernumret och inte lagerplatsen. En omfördelning till en annan plats får därför inte skapa en andra lokal order. Skyddet gäller även efter avslut, omstart och återställning av databas. Samtidiga importförsök kontrolleras igen inne i SQLite-transaktionen.

Kundkopplingar för registrerade kunder binds till Shopify, butik och kund-GID. De blandas inte ihop med WooCommerce. Gästköp kopplas per order. Befintliga manuellt skapade kunder matchas inte via namn/e-post; en ny post skapas vid första importen och detta visas före bekräftelse. Tidigare kopplade kunder återanvänds när uppgifterna stämmer; ändrad kundprofil blockerar import tills uppgifterna kontrollerats.

Äldre WooCommerce-importer som saknar plattformsfält fortsätter att identifieras som WooCommerce. Deras kundkopplingar och dubblettskydd ändras inte. Schema 10 och säkerhetskopieformatet är oförändrade.

## Inga finansiella eller fjärrstyrda åtgärder

Importen skapar **ingen faktura, betalning, verifikation eller Shopify-leverans**. API-anropen är GraphQL-läsningar. Inget ändras i Shopify, inget dokument skickas och inget betalkort debiteras.

Importerade webborders får inte skapa en ny faktura genom Sizzlas orderflöde och visas inte som faktureringsuppgifter på översikten. Försäljning, moms, avgifter och utbetalningar behöver fortfarande bokföras separat med korrekta underlag.

Detta är en manuell import, inte dubbelriktad ordersynk. Registrering av leverans i Sizzla uppdaterar inte Shopify. Senare leveranser, annulleringar, kundändringar och återbetalningar i Shopify uppdaterar inte lokala order automatiskt. Kontrollera och hantera dessa ändringar manuellt. Användaren bekräftar att ordern inte redan har registrerats manuellt eller levererats; äldre manuella order utan import-ID kan inte upptäckas säkert.

## Kontroll och tokenhantering

API-version är `2026-10`. Orderrubrik, rader och leveransunderlag hämtas separat med begränsade sidstorlekar. Orderrubriken kontrolleras igen efter läsning av leveransunderlaget för att upptäcka ändringar under hämtningen. Inför import läses underlaget på nytt och jämförs med den signerade granskningen. Lokala kund-, företags-, artikel- och lageruppgifter kontrolleras på nytt inne i transaktionen. Ändringar kräver ny granskning.

Granskningen gäller i fem minuter och binds till aktivt företag, butik, lagerplats och API-version. Det finns inget gemensamt atomiskt lås mellan Shopify och lokal SQLite; samordna andra order-/leveransändringar medan importen pågår. Ingen obevakad bakgrundssynk aktiveras.

Token skickas i HTTPS-headern `X-Shopify-Access-Token`, hålls endast i minnet och sparas inte i databas, inställningar, historik eller granskade underlag. Det maskeras i dialogen och rensas efter importförsök eller när dialogen stängs. Befintliga kontroller av HTTPS-adress, certifikat, DNS, omdirigeringar, timeout, svarsstorlek, lokalt ursprung och aktiv företagsnyckel gäller även här.

## Verifiering

Tester använder simulerade GraphQL-svar och en riktig lokal SQLite-databas. De kontrollerar sidmarkörer, platstilldelning, blandad och inkluderad moms, hela antal, okända/ej lagerförda SKU:er, brist, lokala/externa ändringar, fel lagerplats, manipulerade planer, samtidig dubbelimport, kundåteranvändning, transaktionsrollback, omstart och återställd backup. Finansiella dokument förblir oförändrade. Tidigare WooCommerce-data utan plattformsfält verifieras separat.

Gränssnittstest går genom lagerplatsval, Nästa/Föregående, granskning, faktisk lokal import, maskerat/rensat token, öppning av lokal order, reservation och följesedel med korrekt Shopify-markering och leveransadress. Befintliga WooCommerce- och Shopify-saldoflöden testas också.

Ingen riktig Shopify-butik eller verkliga kunduppgifter har använts. Schemakompatibilitet, behörigheter och verkliga butikssvar behöver verifieras mot en testbutik före skarp användning. API-fel avvisas och får inte behandlas som lyckad import.

Referenser:

- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/orders
- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/order
- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/fulfillmentOrder
