# Lagerreservationer och WooCommerce i 0.30.0

## Reservationer

Lagerlistan och dess CSV-/utskriftsunderlag visar fysiskt saldo, reserverat, tillgängligt och brist mot reservationer. Antal lagras fortsatt i hundradelar av artikelns enhet.

Bekräftade kundorder reserverar kvarvarande, lagerkopplade orderrader. Offert och orderutkast reserverar inget. Reservationen minskar vid registrerad leverans och frigörs när ordern avslutas/avbeställs. Rättad leverans återför lagret; reservationen återkommer bara om ordern fortfarande är bekräftad. Dubblettrader för samma artikel räknas ihop före kontroll. Samtidiga bekräftelser skyddas av samma SQLite-transaktion som sparar ordern.

Bekräftelse nekas om tillgängligt antal inte räcker. Manuella uttag får inte förbruka befintliga orderreservationer. Utleverans kan förbruka den egna reservationen men skyddar andra orders kvarvarande reservationer. Historiskt negativt fysiskt lager är fortsatt förbjudet.

Inventering och rättelser måste kunna beskriva verkligheten även när varor saknas. De kan därför skapa brist mot reservationer. Tillgängligt antal visas då som noll och bristen visas separat; den döljs inte genom att ändra räknat antal. En order med brist kan dellevereras inom det fysiska saldot så länge andra orders reservationer skyddas.

Reservationer härleds från sparade order och ej rättade leveranser. Befintliga bekräftade order får därför också reservationer när deras lagerkoppling är känd; eventuella äldre överåtaganden visas som brist. Ingen påhittad historikhändelse skapas. Underliggande order-/leveranshändelser finns kvar med befintlig spårbarhet. Återställning och omstart återger samma reservationer. Ingen ny tabell eller ändring av schema 10 krävs.

## WooCommerce – första manuella kopplingen (beta)

Öppna **Lager → Webbshop → Anslut och granska saldo**. Ange butikens publika HTTPS-adress, WooCommerce Consumer key/secret och en lagerartikel. Nycklar skapas i WooCommerce under Inställningar → Avancerat → REST API med läs-/skrivbehörighet.

Förhandsgranskningen hämtar produkten genom exakt SKU-matchning och visar tillgängligt antal i Sizzla, butikens saldo och föreslaget saldo. Endast enkla WooCommerce-produkter med aktiv lagerhantering, heltalssaldo och inga tillåtna restorder stöds. Variationer och fraktionella tillgängliga antal stöds inte i detta steg. Inga artiklar skapas automatiskt och matchning genom namn används inte.

Överföring kräver en färsk, oförändrad förhandsgranskning samt bekräftelse av artikel/antal och pausad kassa. Ett granskat underlag kan användas en gång och gäller i fem minuter. Programmet kontrollerar lokalt saldo/reservationer och WooCommerce-produktens uppgifter igen före skrivning. Ändrade underlag måste granskas på nytt. Anslutningen sker först på användarens begäran; inget bakgrundsjobb startas.

**Detta är inte automatisk dubbelriktad lagersynkronisering.** Webborders importeras inte och butikens lager höjs inte av kopplingen. Målsaldot är det lägre av Sizzlas tillgängliga antal och det granskade WooCommerce-saldot. Påfyllning, produktvariationer, orderimport, statusmappning och skydd mot dubbla importerade order återstår.

**Pausa kassan under överföringen och registrera befintliga webborders i Sizzla först.** WooCommerce standard-API skriver ett absolut saldo och erbjuder här inget gemensamt atomiskt lås med Sizzla. En order som tillkommer efter kontrollen kan annars få sitt lageravdrag överskrivet, även om målsaldot var lägre än det granskade saldot. Även lokala ändringar under skrivningen kräver ny granskning. Återuppta inte kassan förrän resultat och eventuella granskningsmeddelanden har kontrollerats. Kopplingen ska därför inte användas som obevakad synkronisering.

Avbrutet skrivförsök markeras som osäkert resultat. Ingen automatisk omsändning sker: kontrollera verkligt saldo i WooCommerce före ett nytt försök. Påbörjad överföring loggas före nätverksanropet och resultatet loggas därefter. En påbörjad händelse utan slutresultat kräver manuell kontroll av butiken. Försöksresultat sparas i lagerhändelser med datum, butik, artikelnummer, produkt-id och målsaldo, utan nycklar. Webbshopssidan visar högst 20 av de WooCommerce-händelser som finns bland de senaste 500 lagerhändelserna. Äldre händelser ligger kvar i databasen och säkerhetskopiorna.

Nycklarna hålls bara i minnet för dialogen/förfrågningen och sparas inte i databas eller inställningar. De rensas ur dialogens uppgifter efter överföringsförsök och när dialogen stängs. De skickas som HTTP Basic-autentisering över HTTPS med normal certifikatkontroll, inte som URL-parametrar. URL:er med inbäddade lösenord, frågesträngar, lokala adresser eller annan port än 443 avvisas. DNS-adresser kontrolleras och låses för varje förfrågan; omdirigeringar följs inte. Svarsstorlek och anropstid begränsas. Lokala API:ts kontroller av ursprung och aktiv företagsnyckel gäller också för kopplingen.

## Verifiering

Reservationstester omfattar dubblettrader, samtidiga bekräftelser, återstart, nekade uttag med oförändrad databas, delleverans, avslut, motregistrering och verklig inventeringsbrist. Befintligt leveranstest kontrollerar nu först nekad reservation vid brist och därefter en godkänd order som får faktisk inventeringsbrist.

WooCommerce-tester använder simulerad transport för förhandsgranskning, saldosänkning, oförändrat saldo, ändrade reservationer/produkter/företag, manipulerade underlag, dubbel användning och avbrutna skrivningar. De kontrollerar också nekade privata adresser/URL:er, produkttyper, restorder, fraktionella antal och att nycklar inte hamnar i resultat eller loggdata. HTTP-tester verifierar lokal åtkomst och att lämnade nycklar inte sparas. Gränssnittstestet använder simulerade API-svar och verifierar granskning, kassapaus, temabyte, maskerade/rensade nycklar och engelska.

Ingen riktig WooCommerce-butik eller riktiga kunduppgifter har använts i testerna. En egen testbutik bör användas före användning mot skarp butik. API-referens: https://woocommerce.github.io/woocommerce-rest-api-docs/#products

Sedan 0.32.0 finns en separat manuell WooCommerce-orderimport. Se [WOOCOMMERCE-ORDERIMPORT.md](WOOCOMMERCE-ORDERIMPORT.md) för aktuellt arbetsflöde. Saldosynk är fortsatt manuell.
