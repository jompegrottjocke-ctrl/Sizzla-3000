# WooCommerce-orderimport (beta), version 0.32.0

## Arbetsflöde

Öppna **Lager → Webbshop**, välj WooCommerce och tryck **Importera webborders**. Ange butikens ordinarie HTTPS-adress och Consumer key/secret. Läsbehörighet till WooCommerce-order räcker; importen skriver inget till webbshoppen.

Välj `processing` eller `on-hold` och hämta en sida med högst tio order. Sidorna hämtas på begäran; visningen är inte en fullständig eller låst bild av alla butikens order. Redan importerade order markeras. Andra statusar, exempelvis färdiglevererade, annullerade eller återbetalade order, importeras inte.

Tryck **Granska** för en order. Granskningen visar faktureringskund, leveransadress, WooCommerces rapporterade betalningsstatus, betalningsmetod, SKU, antal/enhet, radbelopp, moms och lagerkoppling/tillgängligt antal. Okända eller tvetydiga SKU:er och brist visas som blockerande fel. En sådan order kan granskas men inte importeras. Inga artiklar skapas eller matchas genom namn.

Bekräfta att ordern varken redan registrerats manuellt eller levererats, samt att uppgifter och reservation granskats. **Importera granskad order** skapar en bekräftad kundorder och reserverar återstående antal för lagerförda artikelrader. Tjänster, frakt och avgifter påverkar inte lagret. Fysiskt lager minskar först när en faktisk leverans registreras i Sizzla. Vanlig delleverans, avslut och rättelse använder befintliga kontroller.

Leveransadressen lagras separat från faktureringskunden och följer med leveransens snapshot och följesedel. Granskningsvyn visar båda adresserna. Webbshopens ordernummer följer med referens, anteckning och leveransutskrift.

## Kundkoppling och dubbletter

Importen identifieras med **normaliserad butiksadress + WooCommerces interna order-ID**, inte det visade ordernumret. Använd samma ordinarie butiksadress varje gång; olika domänalias betraktas som olika butiker. Samtidiga importförsök kontrolleras igen inne i samma SQLite-transaktion. Ett senare försök returnerar befintlig kundorder och skapar inte en ny reservation, även efter avslut, omstart eller återställning av databas.

Kundkopplingen för ett registrerat WooCommerce-konto sparas med butik och externt kund-ID. Första importen skapar en separat lokal kundpost; befintliga manuellt skapade kunder matchas inte automatiskt via namn eller e-post. Detta visas före import. Senare order med samma koppling återanvänder kunden när uppgifterna stämmer. Avvikande kund-/adressuppgifter blockerar import och måste kontrolleras manuellt. Lokala kunduppgifter skrivs inte över tyst.

Gästköp (`customer_id: 0`) får en kundkoppling per webborder. De slås inte ihop genom e-post. Äldre manuellt registrerade order saknar import-ID och kan inte upptäckas säkert; användaren måste kontrollera att de inte importeras igen genom denna nya funktion.

Kund, kundkoppling, ordernummer, kundorder, historikhändelse och reservation sparas atomiskt. Ett fel lämnar inga halva kundposter, förbrukade ordernummer eller reservationer kvar. Kopplingar ligger i befintlig `records`-tabell och ingår i säkerhetskopior. Schema 10 ändras inte.

## Belopp och avgränsning

Första versionen stöder svenska fakturerings- och leveransadresser, SEK, positiva ordertotaler och högst 100 rader inklusive frakt/avgifter. Artikelantal måste vara positiva heltal inom befintliga ordergränser. Programmet använder lokala artikelns enhet; kontrollera att SKU motsvarar samma enhet i båda systemen. Artikelns befintliga lagerinställning avgör om den reserveras.

Nettobeloppen från WooCommerce används efter eventuella rabatter. Rabatt dras inte en gång till. Blandad moms 0/6/12/25 procent, frakt och positiva avgifter stöds när deras radbelopp kan representeras exakt med programmets prisprecision och avrundning. Skattesats måste framgå uttryckligen för beskattade rader, utan sammansatt skatt. Radbelopp, moms, frakt och total kontrolleras i heltalsöre. Avvikande skatteavrundning, icke representerbart styckepris, negativa avgifter, återbetalningar och andra valutor blockeras; inget belopp gissas eller justeras för att få importen att gå igenom. Importen är hel per order, inte delvis vid lagerbrist.

## Betalning och bokföring

**Importen är ett leverans- och lagerunderlag, inte en ny försäljning eller betalningsbokning.** Rapporterad betalning sparas som information från WooCommerce vid importtillfället; den är inte en lokal bankavstämning. Inga kundfakturor, betalningar eller verifikationer skapas.

Importerade webborders spärras från att skapa fakturautkast genom Sizzlas orderflöde, även vid direkta API-anrop. De visas inte som faktureringsuppgifter på översikten. Det minskar risken att ett redan fakturerat/betalt köp faktureras igen. Webbshopens försäljning, moms, betalningsavgifter och utbetalningar måste fortfarande bokföras separat med korrekta underlag.

WooCommerces status, betalning eller lagersaldo ändras inte av importen. Efter import uppdateras inte lokala order automatiskt om webbshoppen senare ändrar adress, återbetalar eller annullerar. Kontrollera sådana ändringar och avsluta/rätta lokala order manuellt. Pluginbaserade delleveranser i WooCommerce kan inte identifieras av denna version; importera endast helt olevererade order.

Saldosynkroniseringen för WooCommerce och Shopify behåller sina befintliga begränsningar: manuell granskning, pausad kassa och inga saldohöjningar. Den här funktionen gör inte bakgrundssynk säker eller aktiverad. Shopify-orderimport återstår som separat nästa steg.

## Granskning, uppgifter och säkerhet

Granskningsunderlag är signerade, binds till aktivt företag och butik och gäller i fem minuter. WooCommerce-ordern hämtas på nytt före import. Ändrad order, status, betalningsinformation, leveransadress eller belopp kräver ny granskning. Lokala artikel-/kunduppgifter, företag, lagersaldon och reservationer kontrolleras också på nytt inne i transaktionen.

Nycklar lagras endast i dialog/förfrågningens minne och rensas efter importförsök eller när dialogen stängs. De finns inte i databas, signerade underlag eller säkerhetskopior. WooCommerce-anrop använder samma HTTPS-, DNS-, timeout-, storleks- och omdirigeringskontroller som den befintliga kopplingen. Lokalt API kräver rätt ursprung och aktiv företagsnyckel.

En begränsad order-snapshot lagras med kund/leveransadress, externt order- och kund-ID, status/datum, rapporterad betalning/metod, rader och belopp. Ovidkommande metadata, IP-adress, webbläsaruppgifter och betalningstokens kopieras inte. Importhistoriken anger deklarerad operatör och tid i orderns befintliga behandlingshistorik. WooCommerce-nycklar inkluderas inte.

## Verifiering

Tester använder simulerade WooCommerce-svar och en riktig lokal SQLite-databas. De verifierar läsning utan ändring, manuell granskning, faktisk import/reservation, samtidiga dubblettförsök, kundåteranvändning, blandad moms/frakt/avgifter, okänd SKU, lagerbrist, ändrad kund/order/lager, manipulerat underlag, transaktionsrollback, omstart och återställd backup. Befintlig fakturering och bokföring förblir oförändrade vid import; faktureringsspärr och översiktsfilter kontrolleras. HTTP-test verifierar ursprung/företagsnyckel och att API-nycklar inte sparas.

Gränssnittstest går genom hämtning, granskning och faktisk lokal import med simulerad transport, kontrollerar rensade/maskerade nycklar och öppnar den sparade kundordern. Följesedeln kontrolleras mot leveransadressen. Upprepad granskning visar redan importerad order. WooCommerce- och Shopify-saldoflöden testas också.

Ingen riktig butik eller verkliga kunduppgifter har använts. Prova med egna testorder före skarp användning.
