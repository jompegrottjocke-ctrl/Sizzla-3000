# Valuta i försäljningen

Version 0.23.0. **SEK är fortsatt bokföringsvaluta.** Offerter, kundorder, fakturautkast, utfärdade kundfakturor och krediter stöder SEK, EUR och USD. Befintliga SEK-underlag behåller sin betydelse. Inköp och löner använder fortfarande SEK.

## Kurs och priser

Välj **Dokumentvaluta** på offert-/order-/fakturautkastet. För EUR och USD krävs:

- Kurs uttryckt som **SEK för en valutaenhet**, större än noll och högst 10 000, med högst sex decimaler.
- Giltigt kursdatum, senast på dokumentdatumet.
- Kurskälla eller referens, högst 300 tecken.

Kurser anges och granskas manuellt. Ingen dagskurs hämtas automatiskt och programmet avgör inte vilken kurskälla eller transaktionsdag som ska användas i det enskilda fallet. Valutavalet bestämmer inte kundens land eller momsbehandling. Första stödet följer programmets befintliga svenska momsflöde; EU-handel, export och omvänd skattskyldighet tillkommer inte genom valutavalet.

Radpriser är i dokumentvalutan. Artikelregistret behåller SEK-priser: när en artikel väljs i ett EUR-/USD-underlag räknas registerpriset om med den angivna kursen och avrundas till två decimaler. Granska det föreslagna priset. Befintliga radpriser räknas **inte** om när man ändrar dokumentvalutan; granskning bekräftas vid byte. Det gäller även kopiering av äldre underlag.

## Offert, order och delfaktura

Accepterad offert och kundorder bevarar kommersiell valuta och priser. Överföring av leveranser till fakturautkast behåller dem. Fakturans bokföringskurs kan granskas/ändras i utkastet utan att ändra ordern eller dess låsta priser. Orderns ursprungliga kurs uppdateras inte.

Fördelningen av delfakturor görs som tidigare i dokumentvalutans minsta enhet, så att radernas belopp och moms summerar till ordern. Varje faktura får sin egen granskade omräkning till SEK vid utfärdandet. Därför behöver delfakturornas sammanlagda SEK-värde inte motsvara offertens/orderdatumets kursvärde.

## Bokföring och utskrift

`src/currency.cjs` beräknar med heltal och BigInt. Kursen lagras i miljondelar av SEK. Belopp och moms räknas om per radkomponent till heltalsören med halvöresavrundning uppåt. Summerade SEK-rader ger kundfordran och en balanserad verifikation. Omräknat dokumentbelopp får inte överstiga 100 000 000 SEK. Ett utfärdat underlag måste ha positivt bokföringsvärde.

Utfärdad faktura låser valuta, kurs, kursdatum, källa och SEK-underlag. Fakturans vanliga belopp visas i dokumentvalutan, medan utskriften dessutom anger sparad kurs/källa och moms i SEK. Utskriftens kursvärden kommer från det bevarade underlaget, inte från senare kursändringar eller betalningar. PDF följer den vanliga utskriftshistoriken.

## Betalningar, krediter och kvittning

För EUR/USD anges två belopp vid betalning: reglerat fakturabelopp i dokumentvalutan och **verkligt bankbelopp i SEK före avgifter**. Det senare används på bankkontot. Bankavgifter bokförs separat; de ska inte döljas som kursförlust. Första stödet förutsätter SEK-bankkonto. Valutakonton och banktransaktioner i EUR/USD stöds inte.

Den reglerade andelen av ursprunglig SEK-kundfordran räknas fram kumulativt. Vid sista regleringen används hela återstående bokföringsvärdet, vilket undviker öresrester. Skillnaden mot bankbeloppet bokförs på valt kursvinstkonto i 39xx, normalt 3960, eller kursförlustkonto i 79xx, normalt 7960. Båda kontona tillkommer i standardkontoplanen och befintliga egna kontouppgifter skrivs inte över.

Betalningsunderlaget bevarar både beloppet i dokumentvaluta och SEK, datum, referens, reglerat bokföringsvärde och verifikation. Förhållandet mellan valuta- och SEK-belopp är betalningens effektiva kurs; beloppen sparas exakt utan att en avrundad visningskurs används för bokföring. Rättelse via motbokning återtar samma sparade värden och kursdifferens och återför motsvarande öppna saldo.

Krediter använder ursprungsfakturans valuta och kurs. Både originalets valutabelopp och SEK-radbelopp fördelas kumulativt efter krediterat antal; tidigare krediter räknas med. Det gör att en fullständig kreditserie exakt motsvarar originalet i båda valutorna. Kvittning reglerar respektive dokuments sparade SEK-värde. Eventuella skillnader från andelsavrundning balanseras på samma 39xx/79xx-konton med noteringen valutakurs/avrundning. Ett kredit-/kvittningsbelopp som avrundas till noll i SEK stoppas; välj ett större sammanhängande underlag.

## Rapporter, avstämning och säkerhetskopior

Dokumentlistor och utskrifter visar varje dokuments egen valuta. Kundreskontrans summeringar, startsidans sammanlagda utkastvärde och analys räknar i sparade SEK-värden. Återstående kundsaldo i analysen använder kvarvarande bokföringsvärde, inte en ny dagskurs. CSV-export anger dokumentvaluta samt SEK-värde/bankbelopp separat. Belopp i olika valutor summeras inte direkt.

Bankavstämning använder fortsatt SEK-utdrag och matchar redan bokförda SEK-bankrader, även från en valutabetalning. Förslagen mot ännu obetalda fakturor begränsas till SEK, eftersom EUR-/USD-betalningens verkliga bankbelopp inte är känt före registrering. Registrera valutabetalningen via fakturan först och uppdatera avstämningen.

Årsskiftesomvärdering, orealiserade kursdifferenser, automatisk valutakurstjänst, utländsk moms och leverantörsfakturor i annan valuta ingår inte i detta steg. Årsbokslutets avstämning och eventuell manuell omvärdering kräver företagets egen granskning; denna funktion uppdaterar inte automatiskt huvudbok/reskontra för en sådan extern omvärdering.

Valuta, SEK-underlag och betalningsvärden ligger i befintliga dokument-/betalningsdata och följer export/import samt automatisk säkerhetskopiering. Databasschema 10 är oförändrat. Ingen uppkoppling till bank eller valutaleverantör införs.
