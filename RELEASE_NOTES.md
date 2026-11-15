Sizzla 3000 0.32.1 – stabiliserat demotest och granskad WooCommerce-orderimport (beta).

- Rättar ett tidsberoende fel i demotestet: testet väntar på appens första databasinläsning före sparande. Fördröjt startsvar har verifierats i åtta upprepade körningar.
- Lager → Webbshop → WooCommerce → Importera webborders hämtar högst tio order per sida för processing eller on-hold.
- Granska kund, leveransadress, rapporterad betalning, SKU, rader, moms och tillgängligt lager före import. Okänd SKU, brist och belopp som inte kan återges exakt blockerar import.
- Import skapar kundkoppling och bekräftad kundorder med reservation i en transaktion. Butiksadress + internt order-ID skyddar mot dubbelimport även efter avslut, omstart och återställning.
- Leverans och följesedel använder webbshopens leveransadress. Faktureringskundens adress bevaras separat.
- Inga fakturor, betalningar eller verifikationer skapas. Importerade webborders kan inte skapa nya fakturautkast från Sizzlas orderflöde och visas inte som faktureringsuppgifter på översikten.
- Nycklar sparas inte. Ändrad webborder eller lokalt underlag kräver ny granskning.

Manuell beta för svenska SEK-order med stödda moms-/avrundningsregler. Ingen automatisk orderuppdatering, återbetalningshantering, Shopify-orderimport eller bakgrundssynk ingår. Försäljning och betalningar behöver fortfarande bokföras separat. Testad med simulerad WooCommerce-transport och riktig lokal databas, inte mot riktig butik. Se docs/WOOCOMMERCE-ORDERIMPORT.md.

Schema 10 och säkerhetskopieformat är oförändrade. Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
