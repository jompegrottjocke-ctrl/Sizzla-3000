# Kravunderlag: Bokslut & skatt

Upprättat 2026-11-13. Granskad programgrund: Sizzla 3000 0.15.1, commit 3147922. Detta dokument är ett genomförandeunderlag och en gap-analys, inte ett intyg om regelefterlevnad. Dokumentet beskriver ursprungliga luckor i 0.15.1; genomförandestatus för 0.16 framgår nedan.

## 1. Beslut och avgränsning

- Användaren har angett att lanseringen sker **efter 2026-12-29**. Exakt lanseringsdatum är inte fastställt. Lanseringen ska använda då gällande regler och stödda inlämningskanaler. Historiska beskattningsår måste fortfarande behandlas enligt de regler som gäller för respektive år.
- Två separata kravspår tas fram: aktiebolag och enskild näringsverksamhet. Bolagsform väljs uttryckligen per företag; den ska inte gissas utifrån organisationsnumret eller kontoplanen.
- Gemensam bokslutsberedning kan byggas först: avstämningar, underlag, bokslutsverifikationer och dokumentation av rättelser. Produktionen av regelverksanpassade slutdokument och skattefiler är beroende av verifierade regelversioner.
- Första föreslagna omfattning är svenska verksamheter med redovisning i SEK och enklare transaktioner. Det är ett utvecklingsförslag, inte ett beslut att alla mindre AB får använda K2. K2-behörighet och övergångsregler måste kontrolleras särskilt för aktuellt räkenskapsår.
- Handelsbolag, ekonomiska föreningar, koncernredovisning, bostadsrättsföreningar och andra särreglerade verksamheter får inte få ett generiskt AB-/EF-resultat som om stödet vore färdigt. En gemensam avstämningslista kan användas utan sådana utfästelser.
- Ingen befintlig PDF-utskrift ska benämnas komplett, undertecknad årsredovisning eller inlämnad deklaration utan att dess respektive krav är uppfyllda.

## 2. Källstatus

Lagtexterna BFL, ÅRL, ABL och IL samt Skatteverkets sidor för AB, enskild näringsverksamhet och filöverföring har lästs. Exakta länkar, lagrum och kontrollstatus finns i [källförteckningen](BOKSLUT_KALLOR.md).

**BFN-underlaget är kompletterat med uppladdade PDF-filer:** både tidigare och senare versioner av K2 (BFNAR 2016:10) och Årsbokslut (BFNAR 2017:3) har granskats i relevanta delar. Se [versions- och regelanalysen](BFN_UPPLADDADE_REGLER.md) samt [källmanifestet](BFN_UPPLADDADE_KALLOR.json). Årsbokslutsändringen BFNAR 2026:1 och K2-ändringen BFNAR 2025:2 har olika tillämpningsvillkor; lanseringsdatum får inte ensamt välja regelversion. Direktåtkomst till BFN är fortfarande blockerad. Bokföringsvägledningen och Gränsvärden har granskats i utvalda delar; se [kompletteringen U5–U7](BFN_BOKFORING_GRANSVARDEN.md). K3 för valda spår, fullständig detaljgranskning och förnyad publiceringskontroll återstår. Det tidigare nätverksförslaget är inte tillämpat.

Status nedan avser kodläget, inte juridiskt godkännande: **Delvis** = användbar funktion finns men krav återstår; **Saknas** = ingen komplett motsvarande funktion påvisad; **Källkontroll återstår** = detaljregel får inte implementeras som verifierad.

## 3. Gemensamma krav och nuläge

| ID | Krav / källa | Nuläge i 0.15.1 | Konkret färdigvillkor |
| --- | --- | --- | --- |
| G01 | Företagsform, räkenskapsår, bokföringsmetod, redovisningsvaluta och regelverk ska skiljas åt. BFL 3 kap., 4 kap. 6 §, 5 kap. 2 §, 6 kap. | Delvis: företagsuppgifter och räkenskapsår finns. Ingen uttrycklig bolagsform, metod eller årsvis regelprofil. SEK används. | Profil per företag/år med periodstart/-slut, företagsform, metod, valuta, regelverk och verifierad regelversion. Inkompatibla val ger begripligt besked. EF:s kalenderår och AB:s möjlighet till brutet år hanteras enligt lag, inklusive första/omlagda år. |
| G02 | Presentation i registreringsordning och systematisk ordning. BFL 5 kap. 1 §. | Delvis: numrerade verifikationer, huvudbok, resultat-/balansrapporter och CSV finns. | Export och skärmvisning går att följa från registreringsordning och huvudbok till samma verifikation/rad, med ingående balans och hela urvalet. Årsavgränsning, spårbar ordning och fullständighet verifieras. |
| G03 | Verifikation för varje post med erforderliga datum, innehåll, belopp, motpart och identifiering samt hänvisning till underlag. BFL 5 kap. 6–10 §§. | Delvis: datum, beskrivning, referens, rader, skapande-/bokföringstid och vissa källkopplingar finns. Generella manuella verifikationer saknar särskilt motpartsfält och enhetlig underlagsförteckning. | Verifikationsmodell och dokumenterad rutin täcker affärshändelsedatum, sammanställning, bokföring, motpart och källhänvisning. Tillåtna undantag identifieras mot tillämpliga regler. Underlag kan finnas i ordnad extern förvaring; lagring i själva appen är inte ett generellt lagkrav. |
| G04 | Rättelse anger när och vem; original och rättelse ska lätt kunna följas. BFL 5 kap. 5 och 9 §§. | Delvis: motbokning med länk, orsak och tidsstämplar finns. Händelselogg saknar ansvarig person/aktör. | Alla rättelsevägar får identifierbar ansvarig person och tidsstämpel. Det omfattar Bokföring, försäljning, inköp, lönebokföring och anläggningar. Identiteten sparas vid händelsen, inte bara som en senare ändringsbar hänvisning. Äldre händelser märks ”Ansvarig ej registrerad”; identitet får inte hittas på i efterhand. |
| G05 | Systemdokumentation och behandlingshistorik. BFL 5 kap. 11 §. | Delvis: SYSTEMDOKUMENTATION.md och flera händelselistor finns. | Versionsbunden beskrivning av registrering, beräkningar, integrationer, rättelser, låsning och lagring. Företagets egna rutiner kan kompletteras. Historik med relevanta före-/efteruppgifter och samband kan exporteras och förstås utan databasverktyg. |
| G06 | Bokslutstransaktioner för årets resultat och ställning. BFL 5 kap. 3 § och 6 kap. | Delvis: manuella bokningar, avskrivningar och resultatomföring finns. Samlad bokslutsberedning saknas. | Avstämningspunkter för bank/kassa, reskontra, moms, löner, tillgångar, lager, periodiseringar, skulder och eget kapital. Varje punkt har underlag, belopp, eventuell differens, ansvarig och status. Tillämplighet kan motiveras; en checklista i sig bevisar inte riktiga belopp. |
| G07 | Sidoordnad bokföring när det behövs för kontroll och överblick. BFL 5 kap. 4 §. | Delvis: kund-/leverantörsreskontra, lager och tillgångar finns. Automatisk huvudboksavstämning saknas. | Saldon per balansdag jämförs med faktiskt konfigurerade huvudbokskonton. Äldre ingående poster, kreditposter, manuella rättelser och olika bokföringsdatum ingår. En historisk rapport får inte enbart utgå från dagens status. |
| G08 | Obetalda fordringar/skulder vid årets slut även vid kontantmetod. BFL 5 kap. 2 §. | Delvis: reskontra finns. Automatiska fakturaflöden bokför vid utfärdande/godkännande; någon särskild komplett kontantmetod är inte påvisad. | Stödd metod visas uttryckligen. Bokslutsflödet identifierar ej bokförda obetalda poster och förhindrar dubbelbokning när betalning sker nästa år. Befintliga faktureringsflöden ska inte marknadsföras som färdig kontantmetod. |
| G09 | Årsslut, resultat och korrekt kontinuitet till nästa år. ÅRL 2 kap. 4 §, BFL 6 kap. samt tillämpligt BFN-regelverk. | Delvis: resultatomföring, årslåsning och överföring av ingående balans finns. | Stängning sker mot granskad bokslutsversion. Kvarvarande utkast och saknade obligatoriska moment hanteras. Senare bokningar gör berörda avstämningar och dokument inaktuella. Rättelser efter stängning ska hanteras enligt verifierad rutin; exakt låstidpunkt måste stämmas av mot BFN. |
| G10 | Bevarande, läsbarhet och åtkomlighet. BFL 7 kap. | Delvis: databasbackup, krypterad export, återställning och sparade PDF finns. Komplett arkivrutin för samtliga originalunderlag är inte verifierad. | Arkivförteckning som täcker databas, verifikationer, originalunderlag, systemdokumentation och behandlingshistorik. Återläsning och läsbarhet över bevarandetiden provas. Bevarandetid beräknas till och med sjunde året efter kalenderåret då räkenskapsåret avslutades. Förvaringsplats och eventuella utlandsundantag måste dokumenteras. |
| G11 | Överföring/ersättning av räkenskapsinformation ska inte medföra förlust eller ändring. BFL 7 kap. 1, 2 och 6 §§. | Delvis: backup före återställning och fil-/schemakontroll finns. Ett versions- och ansvarsbundet återställningsprotokoll saknas. | Import/återställning visar vilket företag och vilken tidpunkt som återställs och dokumenterar ansvarig, anledning och tidigare tillstånd. En äldre backup får inte framställas som komplett aktuell bokföring. Skanning är inte ett ovillkorligt tillstånd att förstöra original; villkoren måste vara uppfyllda. |
| G12 | Regler, formulär och datum ska gälla rätt period. IL, tillämplig redovisningsnorm och Skatteverkets specifikationer. | Saknas som samlad regelmotor. | Versionerade regler med källa, publicerad version, giltighetsperiod och övergångsvillkor. Räkenskapsår, beskattningsår, deklarationsår och datum för inlämning hålls isär. Okänt år/regelverk ger ingen påstått slutlig automatisk beräkning. |

G04 är en prioriterad lucka före färdig bokslutsfunktion. En lokalt angiven ansvarig person kan vara en utgångspunkt; lagen anger uppgift om vem, inte ett generellt krav på en viss inloggningsteknik. Hur personen identifieras och hur uppgiften bevaras ska beskrivas. Detta arbete ska inte återinföra det tidigare borttagna lösenordslåset.

## 4. Aktiebolag

| ID | Krav | Källa / status | Färdigvillkor |
| --- | --- | --- | --- |
| AB01 | Årsredovisning och rätt regelverk. | BFL 6 kap. 1 § och ÅRL; Uppladdade K2-versioner har granskats beträffande tillämpning och övergång; fullständig produktbedömning återstår. | Bolagsform och tillämpligt regelverk är validerade. K2 väljs inte enbart för att bolaget verkar litet. K3 och särskilda verksamheter hänvisas till verifierat stöd eller extern hantering. |
| AB02 | Balansräkning, resultaträkning, noter och förvaltningsberättelse. Kassaflödesanalys när tillämpligt. | ÅRL 2 kap. 1–4 §§ samt relevanta 3–6 kap. | Sammanhängande dokument med fullständig tillämplig struktur, värderingar, jämförelsetal och upplysningar. Nuvarande kontoklassbaserade balans-/resultatrapporter och PDF är inte en komplett årsredovisning. |
| AB03 | Språk, datering och underskrifter. | ÅRL 2 kap. 5–7 §§. | Årsredovisningen är på svenska även när appens gränssnitt är engelskt. Samtliga styrelseledamöter och utsedd VD omfattas av underskriftsflödet. Namn/datum, avvikande mening där tillämpligt och slutlig dokumentversion bevaras. En knapp ”godkänn”, en bild av en namnteckning eller en hash ska inte likställas med föreskriven elektronisk underskrift. Pappers- och elektroniska flöden skiljs åt. |
| AB04 | Stämma, fastställelse och inlämning. | ABL 7 kap. 10 §, ÅRL 8 kap. 3 och 6 §§. | I normalfallet årsstämma inom sex månader. Inlämningsfristen en månad efter fastställelse registreras separat från sjumånadersgränsen för förseningsavgift; de ska inte reduceras till samma påminnelsedatum. Revision, särskilda fall och anstånd måste behandlas när tillämpligt. Fastställelseintyg och rätt kopia måste hanteras i valt inlämningssätt. |
| AB05 | Skattemässigt resultat och bolagsskatt. | IL, bl.a. 14 kap., 18 kap., 30 kap., 40 kap. och 65 kap. 10 §. | Bokfört resultat bryggas till beskattningsbar inkomst med specificerade justeringar. Avdrag, ej avdragsgilla kostnader, ej skattepliktiga intäkter, underskott, fondavsättningar och skillnader i avskrivning har underlag och årsbunden regelversion. Samtliga tillämpliga områden ska vara kontrollerade innan beräkningen får märkas fullständig. |
| AB06 | Deklarationsunderlag och eventuella inlämningsfiler. | Skatteverkets AB-information och filöverföring; tekniska formatspecifikationer återstår. | INK2, INK2R och INK2S hålls ihop med tillämpliga övriga bilagor. Varje ruta kan spåras till bokföring/justeringsunderlag. En PDF eller CSV benämns underlag, inte godkänd inlämningsfil. SRU eller annan integration får lanseras som stödd först efter kontroll mot aktuell specifikation och accepterad validering. |
| AB07 | Uppdaterad inlämningskanal efter 2026-12-29. | Skatteverket anger att den äldre e-tjänsten ”Inkomstdeklaration 2” avvecklas detta datum. | Lanseringen byggs kring då stödda kanaler. Den äldre tjänstens avveckling ska inte beskrivas som att blanketten INK2 upphör. Skatteverket beskriver även ”Inkomstdeklaration 2, 3 och 4” och Filöverföring; kanal, periodstöd och format kontrolleras igen inför lansering. Inga obeställda deklarationer lämnas automatiskt. |

IL 65 kap. 10 § anger vid kontrollen 20,6 procent för juridiska personer. Övergångsbestämmelserna visar också historiska perioder med annan procentsats. Detta är ett exempel på varför en enda global procentsats inte räcker; själva skatteunderlaget måste dessutom vara korrekt. Dokumentet godkänner ingen skatteberäkningsmotor.

## 5. Enskild näringsverksamhet

| ID | Krav | Källa / status | Färdigvillkor |
| --- | --- | --- | --- |
| EF01 | Årsbokslut eller, när villkoren uppfylls, förenklat årsbokslut. | BFL 6 kap. 1 och 3–7 §§. Årsbokslutsversioner har granskats i relevanta delar; K1 har granskats i utvalda delar; fullständig detaljgranskning återstår. | Kontroll av tillämplig avslutningsform. Gränsen normalt högst tre miljoner kronor i årlig nettoomsättning är relevant för förenklat årsbokslut, tillsammans med att företaget inte måste upprätta årsredovisning. Det är inte samma bedömning som val av bokföringsmetod. |
| EF02 | Räkenskapsår och bokslutets innehåll. | BFL 3 kap. 1 och 3 §§, 6 kap. 4–7 §§. | Kalenderår tillämpas enligt lag och första/omlagda år behandlas särskilt. Resultat-/balansräkning, specificeringar, upplysningar, datering/undertecknande och färdigställandetid uppfyller den valda formen. För årsbokslut anger BFL 6 kap. 7 § normalt senast sex månader; deklarationsfristen måste kontrolleras separat och kan kräva tidigare arbete. |
| EF03 | NE-underlag och skattemässiga justeringar. | Skatteverkets information om enskild näringsverksamhet, IL. | NE-underlag kopplas till bokslutet och tillämpliga justeringar. Egna insättningar/uttag, privat användning, underskott, periodiseringsfond, expansionsfond, räntefördelning samt egenavgiftsavdrag/avstämning bedöms där tillämpligt. Ej stödda fall måste identifieras. Belopp kan registreras från granskat externt underlag utan att appen påstår sig ha räknat fram dem. |
| EF04 | Avgränsning mot ägarens fullständiga personliga skatt. | IL samt Skatteverkets NE-information. | Näringsresultatet ska inte presenteras som personens slutliga skatt. Övriga inkomster, kommun, avgifter och avdrag kan påverka slutresultatet. Full privat deklaration kräver ett separat verifierat omfattningsbeslut. |
| EF05 | Inlämning och tidsfrister. | Skatteverkets information; årsvis formatkontroll återstår. | NE lämnas i rätt sammanhang med Inkomstdeklaration 1. Underlag, filframställning, underskrift och faktiskt inlämningskvitto är separata steg. Frister, anstånd och specialfall är årsbundna. |

## 6. Produkt- och datakrav

Följande är föreslagna lösningar på ovanstående behov, inte ordagranna lagkrav:

1. **Bokslutsärende:** företag, år, företagsform, valuta, metod, regelprofil/version och ansvarig. Utkast → granskat underlag → slutversion, med skäl för återöppning och bevarade äldre versioner.
2. **Avstämningspost:** konto/område, saldo per balansdag, jämförelsebelopp, differens, källa, underlagsreferens, kommentar, ansvarig och granskningsdatum. Ett ej tillämpligt moment kräver motivering.
3. **Rättelseaktör:** bevarat aktörs-ID och visningsnamn samt registrerings-/bokföringsdatum och orsak. Ansvarig ska följa hela anropskedjan även när en annan modul skapar rättelseverifikationen.
4. **Bokslutsjustering:** förslag med tydlig motivering och källa, förhandsvisade balanserade rader, uttrycklig granskning och länk till skapad verifikation. Inget automatiskt ändrande av redan bokförda originalrader.
5. **Revisionskontroll:** en ändrad verifikation, tillgångshändelse, ingående balans eller relevant reskontrapost markerar berörda avstämningar och dokument som inaktuella. Tidigare underskriven/slutlig version ersätts inte tyst.
6. **Dokumentversion:** stabilt innehåll, datum, språk, regelversion, granskningsstatus och underlagsförteckning. Arkivexport bevarar både resultat och behandlingshistorik. Frysta PDF-kopior återanvänds för historiska utskrifter.
7. **Skattebrygga:** bokfört resultat, varje justering, mellanresultat, källa och regelversion samt beroenden till tidigare års fonder/underskott. Okänt eller otillräckligt underlag ger en tydlig ofullständig status.
8. **Inlämningsstatus:** framställt underlag, validerad fil, användarens godkännande, överföring, mottagningskvitto och eventuell signering är olika tillstånd. Framställd fil eller öppnad webbplats betyder inte ”inlämnad”.

## 7. Minsta acceptansprov före färdig modul

Dessa prov ska implementeras tillsammans med respektive funktion; detta dokument innehåller inte ny exekverbar testkod.

| Prov | Förväntat resultat |
| --- | --- |
| A01 Rättelse via Bokföring respektive Inköp, Försäljning, Lön och Anläggningar | Original, rättelse, ansvarig, tid och orsak kan följas i gränssnitt och export. Saknad aktör hanteras enligt beslutad obligatorisk rutin. Äldre historik får ingen fabricerad aktör. |
| A02 Samma bokslutsförslag skickas två gånger / annan post ändras efter förhandsgranskning | En verifikation skapas som mest; ändrat underlag kräver ny granskning. |
| A03 Obetald faktura vid årsskifte och betalning nästa år | Tillämplig metod ger korrekt fordran/skuld, moms och resultat utan dubbelbokning. Metod som ännu inte stöds märks tydligt. |
| A04 Betalning/kredit/rättelse efter balansdagen | Balansdagens reskontra speglar då gällande händelser, inte bara dagens restbelopp/status. |
| A05 Avskrivning, försäljning eller motbokning före/efter balansdag | Register, huvudbok och rapport följer rätt bokföringsdatum. Saknad äldre historik och manuella bokningar identifieras. |
| A06 Periodisering med återföring | Rätt år påverkas; återföring är länkad, granskad och kan inte köras dubbelt. Års- och periodlås följs. |
| A07 Bokslutet ändras efter granskning | Berörda avstämningar och dokument blir inaktuella. En fryst slutversion och dess underskriftsinformation bevaras. |
| A08 AB respektive EF, brutet och första år | Fel företagsform/år/metod/regelverk stoppas eller förklaras. Datumsamband och gränsfall vid månadsskifte och skottår är verifierade. |
| A09 Årsredovisning med engelskt appgränssnitt | Dokumentets föreskrivna svenska språk och innehåll behålls; appöversättningen ändrar inte lagkrav. |
| A10 Frister | Årsstämma, en månad från fastställelse, sju månaders avgiftsgräns och deklarationsfrist blandas inte ihop. Anstånd/särfall hanteras separat. |
| A11 Historisk regelversion och okänt nytt år | Rätt periodregel används. Ett okänt år får ingen påstått färdig automatisk skatt eller inlämningsfil. |
| A12 Export till accepterad myndighetskanal | Formatriktig fil enligt kontrollerad version, full spårbarhet till rutor och underlag samt redovisat valideringsresultat. Test görs före påstående om inlämningsstöd. |
| A13 Byte mellan två företag och återställning av äldre backup | Inga underlag, aktörer eller regelval blandas. Återställningens effekter och ansvarig dokumenteras. |
| A14 Arkiv och återläsning | Räkenskapsinformation, underlag och dokumentation går att hitta, läsa och skriva ut efter återläsning på en ren dator. Enbart filens integritetskontroll räcker inte. |

## 8. Föreslagen genomförandeordning

1. **Gemensam redovisningsgrund:** G01, G03–G05 och G10–G11, med rättelseaktör som första konkret kodändring.
2. **Bokslutsberedning:** G06–G09 och gransknings-/versionsflödet; stäm av verkliga balansdagssaldon och visa kvarstående moment.
3. **Regelverksanpassade dokument:** AB01–AB04 respektive EF01–EF02 när BFN-version och behörighet är verifierade. Frist- och signeringsrutiner verifieras för valt dokumentformat.
4. **Skatteunderlag:** AB05–AB06 respektive EF03–EF05 med versionsstyrda regler, redovisade begränsningar och kontrollerade beräkningsexempel.
5. **Inlämningsstöd:** AB07 och A12 först efter verifierad aktuell kanal/specifikation och användarstyrd överförings-/signeringsrutin.

**Kvarstående kontroll före regelberoende implementation:** återstående detaljgranskning av bokföringsvägledningen, K3 för valda spår, återstående detaljregler i de uppladdade dokumenten och eventuella senare ändringar; fullständiga tekniska inlämningsspecifikationer; exakt lanseringsperiod och första stödda beskattningsår; sakgranskning av beräkningsfall och fullständiga boksluts-/årsredovisningsexempel. Befintlig kod och Windows-tester är inte bevis för att dessa krav är uppfyllda.

## 9. Komplettering från användarens BFN-filer

[BFN-analysen](BFN_UPPLADDADE_REGLER.md) kompletterar särskilt G01, G04, G06, G09, G12, AB01–AB02 och EF01–EF02. Den innehåller tillämpningsmatriser för BFNAR 2025:2 respektive 2026:1, K2:s utökade behörighetskrav, tidigare/nya periodiseringsgränser, rättelsepresentation och skillnader mellan årsredovisning och vanligt årsbokslut. Där angivna färdigvillkor och provfall ska ingå i genomförandet. Regelanalysen innebär ingen ny appfunktion eller ändring i tidigare bokföring.

K1-spåret kompletteras av [U8: enskild firma](BFN_K1_ENSKILD_FIRMA.md), med krav på samlad verksamhetsbedömning, årsberoende prisbasbelopp, separat K1-mall och provfall för kontantmetodens årsskifte.

## 10. Första genomförande i 0.16

Gemensam bokslutsberedning har implementerats: ärenden, manuellt dokumenterade regelval, nio avstämningsområden mot huvudbok, konservativ inaktualitetskontroll, bevarade arbetsversioner, återöppning med orsak samt JSON/PDF-underlag. Lokalt angiven ansvarig bevaras vid nya bokföringshändelser och krävs vid motbokning/kreditbokning och bokslutsgranskning. Programversions- och kontoplansändringar får metadata. Detta minskar luckorna i G04/G06/G09 men fullständiga slutdokument, beräkningsregler, källarkiv och verifierad behandling enligt samtliga krav återstår.

Operatörsuppgiften är självdeklarerad, inte autentiserad. Äldre okända aktörer lämnas okända. Regelprofil och behörighet bedöms manuellt, och kontantmetodens bokslutsflöde stöds ännu inte. Avstämt arbetsunderlag får inte markeras som färdig årsredovisning, föreskrivet årsbokslut eller deklaration. Se aktuell [systemdokumentation](../SYSTEMDOKUMENTATION.md).
