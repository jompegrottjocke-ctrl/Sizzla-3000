# Granskning av uppladdade BFN-vägledningar

Kontrollerat 2026-11-13. Fyra olika PDF-filer har tillhandahållits av användaren. Analysen gäller de identifierade versionernas tillämpning, övergångar och utvalda regler för kravunderlaget. Den är inte en genomgång av samtliga värderingsregler eller ett godkännande av en färdig bokslutsmodul.

Originalfilerna ligger i chattens bilagor. Filnamn, storlek, sidantal och SHA-256 finns i [källmanifestet](BFN_UPPLADDADE_KALLOR.json). PDF-filerna har inte lagts in i GitHub-repot. Direkthämtning från BFN är fortfarande blockerad; en ny publicerings-/ändringskontroll behövs inför lanseringen.

## 1. Vilka dokument har vi?

| ID | Uppladdad fil | Titel och dokumentversion | Omfattning |
| --- | --- | --- | --- |
| U1 | vl17-3-ab-kons2024.pdf | **Årsbokslut**, BFNAR 2017:3. Uppdaterad 2024-12-13, rättad 2025-02-19. 304 sidor. | Tidigare årsbokslutsversion med bl.a. BFNAR 2024:5. |
| U2 | vl17-3-ab-kons2-2026.pdf | **Årsbokslut**, BFNAR 2017:3. Uppdaterad 2026-10-29. 349 sidor. | Innehåller ändringen BFNAR 2026:1, med egna tillämpnings- och övergångsvillkor. |
| U3 | vl16-10-k2ar-kons2024.pdf | **Årsredovisning i mindre företag (K2)**, BFNAR 2016:10. Uppdaterad 2024-12-13, rättad 2025-02-19. 373 sidor. | Tidigare K2-version med bl.a. BFNAR 2024:4. Har laddats upp två gånger; filerna har identisk SHA-256. |
| U4 | vl16-10-k2-kons2026.pdf | **Årsredovisning för mindre företag (K2)**, BFNAR 2016:10. Uppdaterad 2026-10-29. 414 sidor. | Innehåller ändringen BFNAR 2025:2, med skärpta tillämpningsvillkor och övergångar. |

U1/U2 avser vanligt **årsbokslut** enligt tillämpliga bestämmelser i BFL. U3/U4 avser **årsredovisning** enligt K2. De ska ha separata regelprofiler och dokumentmallar. Förenklat årsbokslut för enskild näringsidkare enligt K1 är ytterligare ett spår.

## 2. Årsbokslut: tillämpning över årsskiftet 2026/2027

### Kontroll i U2, PDF-sida 284, ”Ikraftträdande”, BFNAR 2026:1

Ändringen gäller från 2026-05-18 och ska tillämpas på räkenskapsår som påbörjas närmast efter 2026-12-31. Den får tillämpas tidigare om räkenskapsåret avslutas 2026-12-31 eller senare.

Om ändringen innebär en ny värderingsmetod ska den enligt övergångspunkt 2 tillämpas endast på nya transaktioner och poster som omvärderas varje balansdag. Det är inte ett generellt tillstånd att räkna om alla historiska tillgångsvärden.

| Exempel på period | Slutsats för just BFNAR 2026:1 |
| --- | --- |
| 2026-01-01–2026-12-31 | Tidigare tillämpning är möjlig enligt slutdatumvillkoret. Den ska vara ett dokumenterat val; annars behövs rätt tidigare regelversion. |
| 2026-07-01–2027-06-30 | Start före 2027 innebär att ändringen inte blir obligatorisk enbart på grund av filnamnet eller lanseringstidpunkten. Tidigare tillämpning är möjlig enligt angivet slutdatumvillkor. |
| 2027-01-01–2027-12-31 | Ändringen ska tillämpas enligt övergångsbestämmelsen. |
| Period som slutar 2026-12-30 | Uppfyller inte angivet slutdatumvillkor för tidigare tillämpning av denna ändring. |

U1 behövs som källa för det tidigare regelspåret. Dess sida 244 anger att BFNAR 2024:5 gäller från 2024-12-13 och ska tillämpas för räkenskapsår som inleds efter 2024-06-30. En ännu äldre period kräver i sin tur kontroll av rätt historisk version. Äldre lydelser ska inte rekonstrueras genom att anta att omarkerad text i en ny PDF motsvarar hela den gamla regeln.

### Omfattning och dokumenttyp

- U2 punkt 1.1, s. 15–16: tillämpningsområdet knyts till företag som avslutar bokföringen med årsbokslut. Kommentaren skiljer detta från enskild näringsidkare som väljer förenklat årsbokslut enligt BFNAR 2006:1.
- U2 punkt 1.5, s. 17: rådet ska tillämpas i sin helhet. Möjligheten att använda vissa K3-regler enligt punkt 1.7 har ett särskilt tillämpningspaket, se s. 20. Programmet får inte fritt blanda enstaka fördelaktiga regler mellan olika profiler.
- U2 punkt 3.2, s. 33: årsbokslutet presenteras med resultaträkning och balansräkning; upplysningar hanteras enligt tillämpliga regler. Kommentaren anger att förvaltningsberättelse inte får ingå i årsbokslutet.
- U2 punkt 3.6, s. 36: dokumentet identifieras som årsbokslut med balansdag, räkenskapsår, namn och person-/organisationsnummer.
- U2 s. 36: årsbokslutets språk följer BFL:s huvudregel svenska, danska, norska eller engelska. Detta ska skiljas från ÅRL:s svenska språkkrav för årsredovisning.
- U2 punkt 3.7, s. 37: belopp anges i hela kronor eller tusental kronor och vald enhet framgår. Appens interna heltalsören behöver därför en särskild presentation/avrundning för slutdokumentet.

## 3. K2: ny version gäller redan för vissa år som börjar före 2027

### Kontroll i U4, PDF-sida 334, BFNAR 2025:2

Ändringen gäller från 2025-06-16 och ska första gången tillämpas för räkenskapsår som inleds efter 2025-12-31.

Ett företag som inleder sin verksamhet efter 2025-06-30 och har förlängt räkenskapsår ska dock tillämpa ändringen redan för räkenskapsår som inleds efter 2025-06-30 om räkenskapsåret avslutas 2026-12-31 eller senare. Denna specialregel är ett krav enligt angivna villkor, inte samma valfria tidigare tillämpning som i årsbokslutsändringen BFNAR 2026:1.

Övergångspunkt 2 behandlar nya värderingsmetoder: endast nya transaktioner och poster som omvärderas varje balansdag. Föregående års resultat-/balansposter ska inte räknas om på grund av detta regelbyte; bristande jämförbarhet ska hanteras enligt bestämmelsen.

| Exempel på period/företag | Slutsats för just BFNAR 2025:2 |
| --- | --- |
| Befintligt bolag, 2026-01-01–2026-12-31 | Ändringen ska tillämpas enligt startdatumvillkoret. |
| Befintligt bolag, 2025-07-01–2026-06-30 | Uppfyller inte det vanliga startdatumvillkoret; rätt tidigare K2-version behöver användas och behörigheten bedömas. |
| Nystartad verksamhet efter 2025-06-30, förlängt år 2025-07-01–2026-12-31 | Specialregeln medför tillämpning om de faktiska förutsättningarna är uppfyllda. |

U3:s s. 297 visar BFNAR 2024:4 och dess tillämpning för räkenskapsår som inleds efter 2024-06-30. Det innebär inte att U3 kan användas som generell K2-version för företag med kalenderår 2026.

### Behörighet: U4 punkterna 1.1–1.1C, s. 15–17

Att företaget är mindre är bara första kontrollen. Punkt 1.1A har ytterligare undantag, bland annat publika AB, vissa moderföretag/koncernfall, fysiska personer/dödsbon, bostadsrätts-/bostadsföreningar, utlandsfilialer och vissa typer av transaktioner eller instrument. För kryptotillgångar anges också ett särskilt undantag för enstaka användning som betalningsmedel; ett enkelt generellt ja/nej om ”krypto” räcker inte.

Punkt 1.1B behandlar väsentlig uppskjuten skatteskuld och byggnader som genererar minst 75 procent av nettoomsättningen. Punkt 1.1C har egna undantag från **1.1B**, med villkor om medelantal anställda, balansomslutning och nettoomsättning under de två senaste åren samt ett annat undantag för vissa företag som tidigare använt rådet. Undantagen i 1.1C får inte automatiskt göras till undantag från 1.1A.

Programmet behöver därför en fullständig och versionsbunden behörighetsbedömning med historiska underlag och särskilda villkor. Denna sammanfattning ersätter inte den fullständiga bedömningen av varje punkt.

## 4. Konkreta skillnader som påverkar kod och acceptansprov

### Periodisering: inga globala gränsbelopp

| Regelprofil i tillhandahållen version | Punkt och sida | Kontrollerad förenklingsgräns |
| --- | --- | --- |
| U1 Årsbokslut, tidigare lydelse | 2.4, s. 23 | Inkomst/utgift som var för sig **understiger 5 000 kr**. |
| U2 Årsbokslut med BFNAR 2026:1 | 2.4 och 2.4A, s. 27 | **Understiger 7 000 kr**; tillämpningsval och årsvillkor enligt avsnitt 2 ovan. |
| U3 K2, tidigare lydelse | 2.4, s. 23 | **Understiger 5 000 kr**. |
| U4 K2 med BFNAR 2025:2 | 2.4 och 2.4A, s. 31 | **Understiger 7 000 kr**; villkor enligt avsnitt 3 ovan. |

För U2/U4 behöver även punkt 2.4B om väsentlig påverkan beaktas. Undantaget ska inte ges automatiskt bara för att en enskild post ligger under beloppsgränsen. Tillämpningen kan kräva en samlad bedömning av flera förenklingsregler och konsekvent principval.

Kommentarerna till punkt 2.4 behandlar beloppet på fakturan, avtalet eller motsvarande, inte bara den del som annars skulle periodiseras. Uppdelad fakturering av samma inköp/försäljning och kontokortsfakturor med flera skilda utgifter kräver rätt bedömningsenhet. Dessa villkor ska ingå i regelkort och provfall innan automatiska förslag aktiveras.

### Rättelser: bokföringshändelse och slutdokument behöver skiljas åt

- U1 punkt 2.10, s. 25, och U3 punkt 2.12, s. 26: tidigare lydelser beskriver rättelse genom resultat-/balansräkning i det närmast efter upptäckten upprättade dokumentet.
- U2 punkt 2.10, s. 32, och U4 punkt 2.12, s. 37: ny lydelse anger omräkning av ingående balans med möjlighet till angiven förenklad redovisning i resultat-/balansräkning.
- Kommentarerna i U2/U4 anger samtidigt att rättelsen bokförs i innevarande räkenskapsår i den period då rättelsen faktiskt görs. Hur rättelsen presenteras i årsbokslut/årsredovisning är en separat fråga med tillämpliga upplysningar. U4 anger också att jämförelsetal/flerårsöversikt för föregående år inte ska räknas om enligt denna rättelseregel.

Följden för Sizzla är att en lagrad bokförd verifikation eller redan fryst historisk rapport inte ska skrivas över för att åstadkomma en presentation i slutdokumentets ingående balans. Ansvarig person, tid, orsak och rättelselänk behövs fortfarande enligt BFL. Skatteeffekten måste hanteras separat när den påverkas.

### Mallar och språk

U3 punkt 3.2, s. 27, och U4 punkt 3.2, s. 38, anger K2-årsredovisningens ordning: förvaltningsberättelse, resultaträkning, balansräkning och noter. Det ska inte bli samma mall som vanligt årsbokslut. Årsbokslutets tillåtna engelska språk ska inte föras över till årsredovisningen, som följer ÅRL:s språkkrav.

### Illustrationer är inte skattetabeller

U4 innehåller exempel med en uttrycklig antagen skattesats, bland annat 22 procent i exemplet på s. 335. Ett sådant exempel är inte belägg för en allmänt aktuell bolagsskattesats. Årets faktiska skatt ska styras av tillämplig skattelagstiftning och beskattningsperiod, inte av ett illustrationsvärde i vägledningen.

## 5. Utökade färdigvillkor

Följande tillägg gäller kravlistans G01, G04, G06, G09, G12, AB01–AB02 och EF01–EF02:

1. Regelprofilen lagrar norm, konsoliderad källa, ändringsråd, årsvillkor, eventuellt tillämpningsval och källa/sida. Tillämpningsval är granskat och låses till dokumentversionen.
2. Gränsbelopp, undantag och dokumentpresentation hämtas ur samma verifierade regelpaket. Ett gränsbelopp från den nya versionen får inte kombineras med valda äldre regler som om detta vore fri valfrihet.
3. Start-/slutdatum och faktisk verksamhetsstart samt förlängt år används för K2:s specialregel. Lanseringsdatum eller PDF-filnamn får inte ensamt välja regelversion.
4. K2-bedömningen omfattar hela 1.1–1.1C med separat hantering av undantagens räckvidd och historiska uppgifter.
5. Regelbyte och rättelse av tidigare fel är skilda händelser. Underliggande bokföring, IB-presentation, jämförelsetal och upplysningar har en dokumenterad koppling.
6. Följande gränsfall läggs till acceptansproven: 4 999,99/5 000 och 6 999,99/7 000 kronor; väsentliga sammanlagda effekter; uppdelade fakturor; 2026-12-30/31 som slutdatum; kalenderår 2026 respektive 2027; nystartat förlängt år; vanligt årsbokslut på engelska jämfört med K2-årsredovisning på svenska.
7. Först när ytterligare relevant detaljgranskning och sakgranskade provfall är klara kan respektive regelkort användas för automatiska förslag. Detta dokument är ett käll- och kravsteg, inte en implementerad regelmotor.

## 6. Vad återstår i källinsamlingen?

- **Bokföring – BFNAR 2013:2** har nu tillhandahållits och granskats i utvalda delar, tillsammans med Gränsvärden. Fusion har avgränsats till en första omfattningskontroll. Se [kompletteringen U5–U7](BFN_BOKFORING_GRANSVARDEN.md).
- **K1 – BFNAR 2006:1** har tillhandahållits och granskats i utvalda delar; se [K1-kompletteringen U8](BFN_K1_ENSKILD_FIRMA.md). Fullständig detaljgranskning och aktuell publiceringskontroll återstår.
- **K3 – BFNAR 2012:1**, om det spåret eller årsbokslut enligt punkt 1.7 ska stödjas. Någon sådan fullständig granskning har inte gjorts här.
- Aktuella tekniska deklarations-/inlämningsspecifikationer och kontroll av eventuella senare ändringar inför lanseringen.

Årsboksluts- och K2-filerna ger nu både äldre och senare jämförelseunderlag. Blockeringen av BFN:s webbplats hindrar inte läsning av de uppladdade PDF-filerna. Den kvarstår däremot för direkt kontroll av om nya dokument har publicerats efter dessa versioner.
