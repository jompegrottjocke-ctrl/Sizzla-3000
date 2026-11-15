Sizzla 3000 0.33.0 – granskad Shopify-orderimport (beta).

- Lager → Webbshop → Shopify → Importera Shopify-order hämtar öppna olevererade order med markörbaserad sidbläddring.
- Vald lagerplats, hela återstående antal, kund, leveransadress, betalningsstatus, SKU, belopp och moms granskas före import. Uppdelade/dellevererade order, okänd SKU och brist blockeras.
- Importen skapar kundkoppling och bekräftad lokal kundorder med reservation atomiskt. Dubblettskyddet gäller även efter avslut, omstart och återställning.
- Inga fakturor, betalningar, verifikationer eller Shopify-leveranser skapas. Följesedel använder leveransadressen och rätt plattform/TEST-markering.
- Token sparas inte. Ändrad order, lagerplats eller lokalt underlag kräver ny granskning. Äldre WooCommerce-importer känns fortfarande igen.

Manuell beta för hela fysiska svenska SEK-order tilldelade en aktiv lagerplats, högst 25 artikelrader och 10 fraktrader. Ingen automatisk orderuppdatering, återbetalningshantering eller dubbelriktad synk ingår. Försäljning och betalning behöver fortfarande bokföras separat. Testad med simulerade Shopify-svar och riktig lokal databas, inte mot riktig butik. Se docs/SHOPIFY-ORDERIMPORT.md.

Schema 10 och säkerhetskopieformat är oförändrade. Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
