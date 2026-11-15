Sizzla 3000 0.31.0 – Shopify under Lager → Webbshop.

- Plattformsväljare för WooCommerce och Shopify.
- Shopify hämtar aktiva lagerplatser och matchar lagerförda produktvarianter med exakt SKU. Varianten måste neka restorder och ha heltalssaldo på vald lagerplats.
- Manuell granskning och överföring av sänkt eller oförändrat saldo. Endast vald lagerplats ändras.
- Skrivningen använder jämförelsevärde och idempotensnyckel. Ändrade saldon, lagerplatser, företag och granskade underlag avvisas. Osäkra resultat kontrolleras manuellt utan automatisk omsändning.
- Åtkomsttoken är maskerat och sparas inte i databasen. Historiken skiljer på Shopify och WooCommerce.

Manuell beta: registrera webborders i Sizzla och pausa kassan under överföringen. Orderimport, automatisk synk, tokenförnyelse och saldohöjningar ingår inte. Testad med simulerade svar, inte mot riktig butik. API-dokumentationen kunde inte nås från miljön; prova i testbutik före skarp användning. Se docs/SHOPIFY.md.

Schema 10 och säkerhetskopieformat är oförändrade. Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
