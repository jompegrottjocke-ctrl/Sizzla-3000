# Kontroll av sammanhängande företagsflöde

Utförd 2026-11-15 mot Sizzla 3000 0.34.0. Syntetiskt företag och en artikel, SEK och 25 % moms, separata tillfälliga databaser. Inga riktiga företagsdata, bankbetalningar eller myndighetsinlämningar används.

## Resultat

Den kontrollerade kedjan stämmer i antal och heltalsören, inklusive efter säkerhetskopiering och återställning. Inget fel i affärslogiken påträffades i just detta scenario. Äldre motstridiga beskrivningar av lagerreservationer i README, systemöversikten och orderdokumentationen har rättats.

Den nya kontrollen finns i `tests/business-flow.test.cjs` och körs automatiskt av `npm test`. Den använder appens HTTP-API och vanliga databasexport/import, inte direkta databasinsättningar för att skapa affärshändelser. Förväntade ekonomiska slutsaldon är angivna oberoende av programmets beräkningshjälpare. Databasens integritet och främmande nycklar kontrolleras efter återställning.

## Händelser i samma testföretag

1. Inköpsorder på 10 artiklar à 100 kr exklusive moms. Två inleveranser på 4 och 6 artiklar uppdaterar lagret till 10.
2. Leverantörsfaktura på 1 250 kr och leverantörskredit för 2 artiklar på 250 kr godkänns och bokförs. Fysisk retur av 2 artiklar registreras separat i Lager med referens till kreditunderlaget. Lagret är nu 8.
3. Leverantörsskulden betalas i två delar, 400 och 600 kr. Faktura och kredit är slutreglerade. Detta registrerar betalningsunderlag, inte en verklig banköverföring.
4. Kundorder på 6 artiklar à 200 kr exklusive moms reserverar 6 och lämnar 2 disponibla. Leveransen drar 6 från lagret och frigör den levererade reservationen. Försök att registrera samma leverans igen avvisas utan lagerändring.
5. Fakturaunderlag skapas från leveransen och utfärdas/bokförs till 1 500 kr. Kundkredit på 250 kr för 1 artikel skapas och kvittas. Kreditdokumentet ändrar inte lagret. Fysisk kundretur av 1 artikel registreras separat med referens. Lagret är nu 3.
6. En felregistrerad inbetalning på 500 kr motbokas med angiven ansvarig och orsak. Korrekta inbetalningar på 500 och 750 kr registreras. Överbetalningsförsök avvisas utan bokföringsändring. Original och rättelse bevaras.
7. Slutlager värderas manuellt till 300 kr enligt scenariots kända anskaffningspris 100 kr/st. Konton 1460 och 4990 läggs upp och en balanserad manuell verifikation bokförs. Ingen automatisk värdering eller lagerbokföring påstås.
8. Perioden låses till och med 9 november. En ny verifikation inom den låsta perioden nekas.
9. Databasen exporteras, en tillfällig kund läggs till och exporten importeras via vanlig bekräftad import. Appen startas om. Företag, register, bokföring med historik, inköp, försäljning, order, lager och reservationer jämförs med läget före exporten. Den tillfälliga kunden är borta och alla avstämningar stämmer igen.

## Oberoende förväntade slutsaldon

Debet är positivt och kredit negativt. Beloppen nedan är kronor; testet använder heltalsören.

| Kontroll | Förväntat och uppmätt |
| --- | ---: |
| Fysiskt lager | 3 st |
| Kundfordringar 1510 | 0,00 |
| Leverantörsskulder 2440 | 0,00 |
| Bankförändring 1930 | +250,00 |
| Utgående moms 2611 | −250,00 |
| Ingående moms 2641 | +200,00 |
| Försäljning 3001 | −1 000,00 |
| Varuinköp 4000 | +800,00 |
| Slutlager 1460 | +300,00 |
| Lagerförändring 4990 | −300,00 |
| Momsskillnad att hantera | 50,00 |
| Resultat före skatt i testet | 500,00 |

Reskontrornas kvarvarande belopp jämförs med 1510 och 2440. Varje bokförd verifikation måste balansera. Bankförändringen motsvarar registrerade kundinbetalningar 1 250 minus leverantörsutbetalningar 1 000; inget verkligt kontoutdrag har använts i detta scenario. Momsskillnaden är en avstämning av kontona, inte en inlämnad momsdeklaration eller bokförd momsavräkning.

## Övrig verifiering vid samma kontroll

- Hela enhetstestsviten: **140 av 140 godkända**.
- Nio gränssnittstester i Chromium: **9 av 9 godkända**. De omfattar inköp med delmottagning, kredit och rättad betalning; lager och inventering; offert/order/leverans/fakturaunderlag; kundfaktura och kredit; bokföringens rapporter och årsstängning; bank-CSV och matchning; bokslutsversion och utskrift; krypterad export och bekräftad import.
- Den sammanhängande kedjan körs via API. Gränssnittstesterna kör separata scenarier; hela kedjan har inte manuellt klickats igenom på en fysisk Windows- eller Mac-dator.

Reproduktion:

```sh
node --test tests/business-flow.test.cjs
npm test
npx playwright test tests/ui/purchases.spec.cjs tests/ui/x-inventory.spec.cjs tests/ui/x-trade.spec.cjs tests/ui/x-sales.spec.cjs tests/ui/accounting.spec.cjs tests/ui/accounting-views.spec.cjs tests/ui/x-bank.spec.cjs tests/ui/x-closing.spec.cjs tests/ui/z-security.spec.cjs
```

Använd en ny separat SIZZLA_TEST_DATA-katalog vid gränssnittskörningen. Vid kontrollen användes Linux, Node 24 och systemets Chromium. Windows- och macOS-körningar i GitHub är separata kontroller.

## Kvarstående manuella steg och nästa prioritet

- Fysisk retur och kredit är skilda händelser. Operatören måste koppla underlagen med referenser och registrera endast faktiskt returnerade varor. En prisnedsättning utan retur ska inte ändra lager.
- Lagerföring gäller antal. Anskaffningsvärden, värderingsmetod, inkurans och periodisk lagerbokföring behöver ett separat verifierat stöd. Testets identiska inköpspris ersätter inte det.
- Leverantörsfakturan granskas mot beställning/inleverans av användaren; scenariot verifierar inte en automatisk trevägsmatchning.
- En registrerad betalning är inte en utförd banköverföring. Verkligt kontoutdrag och externa underlag behöver granskas av användaren.
- Testet är inte en fullständig årsredovisning, skatteberäkning, lönekörning eller en bedömning av laguppfyllelse. Andra tester ersätter inte expertgranskning.

Nästa rekommenderade produktförbättring är ett granskat returflöde som knyter fysisk retur till ursprunglig leverans och eventuellt kreditunderlag, med dubblettskydd och tydlig skillnad mellan prisrättelse och varuretur. Därefter bör redovisningskunnig person granska testunderlaget och arbetsflödena före skarp användning.
