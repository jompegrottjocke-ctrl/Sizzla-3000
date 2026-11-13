# Sizzla 3000

Ett affärssystem för Windows 11, med svenska som standardspråk och valbar engelska. Första versionen kör lokalt och kräver inget konto eller internet för användning.

## Funktioner

- Översikt med antal kunder, artiklar och fakturautkast.
- Företagsuppgifter, kundregister och artikel-/tjänsteregister. Skapa och redigera poster, sök i registren.
- Fakturautkast med kund, datum, förfallodatum, anteckning och flera rader. Artiklar kan hämtas från registret.
- Moms 0, 6, 12 eller 25 procent per rad, beräknad i heltalsören med avrundning per rad. Endast SEK och priser exklusive moms i denna version.
- Utfärda och bokför granskade kundfakturor med löpnummer, låsta uppgifter, fakturautskrift och PDF-historik. Utkast behåller märkningen **UTKAST – EJ FAKTURA**.
- Betalningar: kund- och leverantörsreskontra, delbetalningar, kundkrediter, kvittning mot ursprungsfakturan, återbetalningar och spårbara motbokningar.
- Flera företagsdatabaser med en aktiv åt gången via Inställningar → Databaser. Skapa, namnge och aktivera; byte läser in företaget på nytt och skyddar mot skrivning från gamla fönster.
- Lokal SQLite-databas; uppgifterna finns kvar efter omstart. Sparade utkast innehåller en kopia av företagets och kundens uppgifter vid senaste sparandet.
- Personalregister med kontakt-, anställnings-, bank- och löneuppgifter. Sökning, filtrering, arkivering och återställning. Unika anställningsnummer och kontroll av svenska person-/samordningsnummer.
- Frånvaro och manuellt tilldelade betalda semesterdagar per kalenderår. Uttag kontrolleras mot saldot; överlappande frånvaro avvisas. Frånvaroregistret beräknar inte automatiskt löneavdrag eller lagstadgad semester-/sjuklön.
- Manuellt granskade lönekörningar: hel avtalad månadslön gånger sysselsättningsgrad eller timlön gånger timmar, bruttotillägg, bruttoavdrag, förmåner, skattefri kostnadsersättning och nettoavdrag.
- Löneutkast → godkänd/låst → markerad utbetald. Godkännande kräver personnummer, företagsuppgifter och uttryckligen kontrollerade skatte-/avgiftsbelopp med beräkningsunderlag. Dubbel lön för samma person och löneperiod avvisas. Ändrade personal-/företagsuppgifter kräver att utkastet uppdateras före godkännande. Skatt och arbetsgivaravgift beräknas inte automatiskt.
- Lönebesked för en person eller hela körningen. Betalningsunderlag som generell CSV (inte ett bankanpassat filformat). Ingen banköverföring utförs. Godkända körningar kan makuleras med orsak; utbetalda körningar kan inte makuleras eller rättas i denna version.
- AGI-kontrollunderlag per **utbetalningsmånad**, på skärm och CSV. Detta är inte en AGI-inlämningsfil. Automatisk skattetabell, regelstyrd sjuk-/semesterlön, rättelser av utbetald lön och ett verifierat AGI-format återstår. Personalfliken är därmed användbar, men fullständig svensk lönehantering är ännu inte färdig.
- Fem utseenden: Ljust, Mörkt, Ljust – hög kontrast, Blått och Varmt, samt Följ systemet. De tre nya ljusa alternativen har tydligare text, färgade rubrikytor och avgränsade sammanställningar. Språk och utseende sparas i SQLite och följer med över omstart. Utskrifter använder ljust papper även i mörkt läge.
- Bokföring: redigerbar startkontoplan, räkenskapsår, ingående balanser, verifikationsutkast, låst bokföring med löpnummer, motbokningar, periodlåsning och ändringshistorik.
- Saldobalans, huvudbok, resultat- och balansrapport med datumurval, utskrift och CSV-export av bokförda rader. Original och motbokningar ingår båda i rapporterna.
- Granskad bokföring av godkända lönekörningar och redan registrerad löneutbetalning. Varje underlag kan bokföras en gång per typ; rättelser sker med nya verifikationer.
- Analys med månadsdiagram, periodjämförelse, kontospecifikation, kund-/artikelförsäljning, aktuell reskontra och öppningsbara underlag. CSV och PDF-historik ingår.
- Resultatöverföring till valt eget-kapital-konto och avslut av år med valfri överföring av balanser till ett tomt efterföljande år.
- Inköp: leverantörsregister, inköpsorder, delleveranser, leverantörsfakturor och kreditfakturor med aktuell reskontra.
- Granskning mot originalbelopp, momsavdrag, bokföring, delbetalningar, återbetalningar och rättelser. Historiska underlag bevaras.
- **Säkerhet & säkerhetskopiering**: komplett databasexport, krypterade säkerhetskopior, import med förhandskontroll och möjlighet att öppna databasens katalog.
- Tid & projekt: kundkopplade och interna projekt, tidsbudget, manuella tidsrader, granskning/låsning och spårbar makulering. Överför godkända debiterbara rader till fakturautkast utan dubbelöverföring.
- Textstorlek 100–200 % och fet text sparas mellan starter.
- Bokslut/skatt, anläggningsregister, koncern och byrå har flikar med **beta kommer senare** (engelska: beta comes later).

Det här är en utvecklingsversion. Fullständigt stöd för skarp bokföring och lönehantering är inte färdigt. Bankintegration, automatisk säkerhetskopiering och komplett verifierade regelverk återstår. Se [Systemdokumentation och kvarstående krav](SYSTEMDOKUMENTATION.md) för uppbyggnad, spårbarhet och kända luckor, inklusive avsaknad av identifierad användare vid rättelser.

## Server & moln (beta)

Under Inställningar, direkt efter Databaser, finns **Server & moln** med förhandsvisning av användningsläge, HTTPS-adress, användarnamn och serverdatabas. Lokal användning är förvalt och är alltid det verkliga driftläget i denna version. Fälten sparas inte och inga anslutningar eller inloggningsförsök görs. Lösenordsfält, Anslut, Koppla från och Spara anslutning är avstängda. Testa anslutning förklarar betastatusen utan att kontakta adressen. Återställ förhandsvisning rensar formuläret.

Säkerhetsinformationen beskriver krav för den framtida serverdelen: krypterad kommunikation med HTTPS/TLS, kontroll av serverns certifikat samt inloggning/behörigheter. Den anger uttryckligen att ingen krypterad serveranslutning är aktiv. Serverdelen utvecklas senare; fliken ändrar inte säkerhetskraven på den lokala databasen eller säkerhetskopiorna.

## Flera företag under Databaser

1. Öppna **Inställningar → Databaser**. Den befintliga databasen finns kvar som **Företag 1**, på sin tidigare plats. Inga gamla uppgifter flyttas eller ersätts.
2. Ange ett databasnamn och välj **Skapa databas**. Den läggs till i listan utan att aktiveras. Varje ny databas börjar med egna tomma register, egen bokföring, egna nummerserier och tom PDF-historik. Namnet fylls initialt i som företagsnamn; språk, utseende och läsbarhet kopieras som startvärden och kan därefter ändras separat.
3. Välj **Aktivera** vid önskat företag och bekräfta bytet. Högst **10 företagsdatabaser** kan skapas, inklusive den första. Antalet visas i fliken och bara en databas är aktiv. Vyerna läses in på nytt och valet sparas till nästa start. Företagets namn och databasetikett visas i sidomenyn. Ändra namn ändrar etiketten, inte företagets bokförda identitet; företagsuppgifter hanteras under Mitt företag.
4. Osparade formulärändringar ger en fråga innan vyn lämnas. Avsluta pågående utskrift/PDF-åtgärd före byte. Öppna utskriftsfönster stängs vid byte i skrivbordsappen. Gamla fönster och ofullständiga anrop kan inte skriva i den nya databasen; de behöver läsa in aktiv databas igen.
5. Export, import och **Öppna databasens katalog** gäller den aktiva databasen. Säkerhetskopians filnamn innehåller databasetiketten. Exportera varje företag separat. En förberedd import måste slutföras genom omstart eller avbrytas före byte. Import ersätter endast den aktiva databasens innehåll; listan och övriga företag påverkas inte.
6. För att lägga till ett företag från en säkerhetskopia: skapa en ny databas, aktivera den och importera kopian under Säkerhet & säkerhetskopiering. Starta sedan om appen. Kontrollera aktivt företag före import.

Databaslistan och aktivt val finns i `databases.json` i den ursprungliga datakatalogen. Första databasens `sizzla.sqlite` ligger kvar där; nya företag ligger i `databases/<id>/`. Listan ingår inte i en enskild databasexport. För en manuell kopia av **hela arbetsplatsen**, stäng appen och kopiera hela den ursprungliga datakatalogen med `databases.json`, underkataloger och eventuella WAL/SHM-filer. Externa originalunderlag måste fortfarande kopieras separat. Redigera inte databaslistan eller flytta databasfiler medan programmet körs. Radering, sammanslagning, delade nätverksdatabaser och samtidig användning från flera programinstanser ingår inte. Använd inte 0.8 eller äldre för att hantera en arbetsplats med flera databaser.

## Arbetsflöde för Analys

1. Öppna **Analys** i verksamhetsmenyn. Välj räkenskapsår och datum inom året, sedan **Visa analys**. Jämförelse kan göras med valfria datum (högst 550 dagar); **Föregående år** fyller i motsvarande datum ett år tidigare med hantering av skottdag. Jämförelse aktiveras som förval bara när räkenskapsår täcker perioden. Saknad täckning och olika periodlängder anges tydligt. Belopp normaliseras inte till lika långa perioder.
2. **Resultat** visar intäkter, kostnader, resultat före resultatöverföring och resultat/intäkter i procent, med månadsdiagram och exakta tabellbelopp. Bara bokförda verifikationer efter bokföringsdatum används, inklusive original och motbokningar i respektive period. Utkast, IB och konto 8999 ingår inte. Kontoklassningen följer Bokföring: 3xxx och 80xx–83xx är intäkter, övriga 4xxx–8xxx kostnader. Kostnader visas med positiva normalbelopp. Procentuell förändring beräknas bara när jämförelsebeloppet är positivt; resultatandel visas bara vid positiva intäkter.
3. **Konton** visar debet, kredit och periodbelopp per resultatkonto, med jämförelsebelopp och differens. **Underlag** på en månad eller ett konto öppnar de berörda verifikationerna; från listan kan du öppna hela verifikationen i Bokföring. Kontots källista inkluderar jämförelseperiodens verifikationer om jämförelse används.
4. **Kunder** och **Artiklar** använder utfärdade kundfakturor/krediter efter fakturadatum, exklusive moms, inte bokföringsdatum. Krediter minskar belopp och antal i sin egen period. Utfärdade dokument ligger kvar även om deras bokning motbokats. Listorna sorteras efter nettoförsäljning och kan öppna fakturaunderlagen. De behöver därför inte stämma mot bokförd intäkt för samma datumurval.
5. Nya fakturarader som väljs från artikelregistret behåller artikel-ID och artikelnumrets kopia genom sparande, utfärdande och kreditering. Äldre/manuella rader matchas inte genom namn utan redovisas separat efter beskrivning och enhet. Olika enheter får separata rader även för samma artikel. Befintliga utfärdade fakturor ändras inte retroaktivt. Försäljningsvärde är inte vinst eller lagervärdering.
6. **Aktuell reskontra** visar kund-/leverantörssaldon, förfallna fakturor, kvarstående krediter och dokument utan aktiv bokföring. Den följer senast inlästa uppgifter och påverkas inte av periodvalet. Leverantörslistan inkluderar godkända ännu ej bokförda dokument. Kreditbelopp visas negativt och ingen historisk åldersanalys per valt datum görs.
7. **Uppdatera uppgifter** läser aktuell databas igen. Varje vy visar underlagens inläsningstid och beräkningsgrund. CSV-exporten gäller den valda analysvyn och anger datum och datakälla; det är inte en säkerhetskopia, SIE-fil eller deklaration. Utskrift/PDF bevaras genom befintlig utskriftshistorik; **Öppna underlag** återgår till en aktuell analys med rapportens filter, medan PDF-kopian är oföränderlig.

Analysen läser endast den aktiva företagsdatabasen. Den ändrar inga verifikationer eller fakturabelopp och skapar inte budget, prognos, bankavstämning eller koncernanalys. Schemat är fortsatt 8. Utseende väljs under **Inställningar → Utseende & läsbarhet**, eller via snabbvalet **Utseende** överst på övriga sidor och sparas per databas; utskrifter använder ljust papper även med färgteman.

## Arbetsflöde för Tid & projekt

1. Skapa ett projekt med unik kod, namn och eventuell kund. Koden får ha högst 30 tecken: bokstäver, siffror, bindestreck och understreck, utan mellanslag (exempel `PROJ-2026-01`). Regeln visas vid fältet och fel visas direkt medan du skriver. Projektnamnet får innehålla mellanslag. Utan kund är projektet internt och kan bara ha icke debiterbar tid. Ange standardtimpris, moms, valfria start-/slutdatum och tidsbudget. Budgeten är en jämförelse, inte ett hårt stopp. Projektkod och kund låses när det finns tidsregistreringar, även makulerade; historiken behåller sina uppgifter.
2. Välj **Registrera tid**. Ange arbetsdatum, person, timmar och arbetsbeskrivning. Du kan välja en aktiv anställd eller ange ett namn manuellt för exempelvis ägare/konsult. Ange **decimaltimmar**: 1,50 = 1 timme 30 minuter; högst två decimaler. Ingen start-/stopptimer finns. Framtida arbete och arbete utanför projektets datum avvisas. Summan får inte överstiga 24 timmar för samma registrerade person och dag, även över flera projekt. Manuella namn är inte verifierade identiteter.
3. Projektets pris och moms fylls i som förslag och kan ändras på tidsraden. Debiterbar tid kräver kund och pris över noll. Spara utkastet, öppna det och välj **Godkänn och lås**. Knappen sparar synliga utkaständringar först och visar sedan uppgifterna för uttrycklig granskning. Om projektet/personen ändrats måste tidsutkastet sparas om. Godkänd tid ändras inte i efterhand.
4. Felregistrerad tid makuleras med orsak och bevaras i historiken. Skapa därefter en korrekt ny registrering. Tid som redan överförts måste först frigöras genom återtagning av det ej utfärdade fakturautkastet. Utfärdad tid kan inte frigöras för ny fakturering.
5. Under **Fakturaunderlag → Skapa fakturautkast**, välj ett kundprojekt och högst 100 godkända debiterbara rader. Hela tidsrader överförs, inte delar av en rad. Granska timmar, pris, fakturadatum, förfallodatum och urval. Varje rad blir en fakturarad med timmar, timpris, moms och beskrivning. Överföring, koppling och fakturautkast skapas tillsammans eller inte alls; samma tidsrad kan inte överföras två gånger.
6. Välj **Öppna faktura / utkast** och granska underlaget i Fakturering. Där kan utkastet redigeras och sedan uttryckligen utfärdas/bokföras med fakturanummer. Överföring från Tid & projekt skapar ingen bokföring och skickar ingenting till kunden. Fakturaunderlaget bevarar den ursprungliga tids- och prissammanställningen även om fakturautkastet redigeras separat; jämför dokumenten före utfärdande.
7. **Återta fakturautkast** fungerar bara före utfärdandet och kräver granskning och orsak. Det raderar utkastet inklusive eventuella manuella ändringar och frigör alla dess tidsrader. Tidsunderlaget bevaras som makulerat. Utfärdade fakturor rättas med kreditfaktura i Fakturering. Krediter eller motbokning av fakturans verifikation frigör inte automatiskt timmarna.
8. Filtrera tidsregistreringar på projekt, status, datum och söktext (person/arbete/projekt). Exportera urval till CSV eller skriv ut tidsrapport med PDF-historik. Ett fakturaunderlag kan också skrivas ut separat. Projektöversikten visar godkända timmar mot budget; statistik visar registrerad/godkänd tid och återstående debiterbar tid. Avslut kräver att tidsutkast hanterats; arkivering kräver även att kvarvarande debiterbar tid hanterats. Projekt kan återöppnas.

Tid, projekt och fakturaunderlag hålls separerade per företagsdatabas och ingår i dess säkerhetskopia. Detta är manuell tids- och fakturaunderlagshantering, inte automatisk löneberäkning, avtalsstyrd arbetstidskontroll eller attest av en identifierad chef. Övertid, OB, frånvaroavdrag, utlägg, kostnader, projektvinst och automatisk löneöverföring ingår inte. Faktureringen gäller SEK; fakturans vanliga granskningskrav gäller även tidsunderlag.

## Arbetsflöde för Fakturering och Betalningar

1. Fyll i företagets namn, organisationsnummer och fullständiga adress. Vid momspliktig försäljning krävs momsregistreringsnummer i formen SE + organisationsnumrets tio siffror + 01. Formatet kontrolleras, inte registreringen hos Skatteverket. Ange bankgiro eller betalningsinstruktioner. Kunden behöver namn och fullständig adress.
2. Skapa ett öppet räkenskapsår och kontrollera konton i Bokföring. Första fakturan kan föregås av **Startnummer** i Fakturering; kontrollera tidigare nummer från andra system. Fakturor och kreditfakturor delar en löpande nummerserie som inte kan ändras efter första utfärdandet.
3. Skapa och spara ett fakturautkast med rader, enhet, datum, förfallodag och moms. Öppna det sparade utkastet och välj **Utfärda och bokför**. Granska kund, företag, rader, leverans-/utförandedatum och kontering. Momsfri försäljning kräver en förklaring. Utfärdande, nummer och verifikation sparas tillsammans; ett misslyckat försök förbrukar inget nummer.
4. Utfärdade uppgifter är låsta och behåller sina kopior av företag, kund och rader även om registren ändras. Spara PDF eller skriv ut fakturan från **Utfärdade fakturor**. Leverera fakturan själv; utfärdandet skickar ingen e-post eller e-faktura. Betalningsmeddelandet KF + nummer är inte ett validerat OCR-nummer.
5. Registrera en faktiskt mottagen betalning med datum, belopp, bankunderlag, bokföringsdatum och granskat bankkonto. Delbetalningar stöds; överbetalningar avvisas. Registrering och verifikation sparas atomiskt. Programmet flyttar inga pengar.
6. Skapa kredit från originalfakturan genom att välja antal på dess rader och ange orsak. Belopp och moms hämtas proportionellt från originalet med kumulativ öresavrundning så att en full kredit motsvarar originalet exakt. Krediter kan sammanlagt inte överstiga originalets antal. Kvitta krediten mot dess egen ursprungsfaktura eller registrera en faktiskt genomförd återbetalning. Kvittning flyttar inga pengar.
7. Felaktiga betalningar och kvittningar motbokas med datum och orsak. Samma uppdatering av reskontran görs om rättelsen startas i Bokföring. Hantera betalningar och kvittningar före fakturabokningen och kreditbokningar före originalets bokning. Motbokning återtar ingen verklig banköverföring. En utfärdad faktura ligger kvar även om bokningen motbokas och måste återbokföras innan nya betalningar kan registreras. Återbokföring ändrar inte fakturanumret.
8. **Betalningar** samlar kundreskontra, leverantörsreskontra, betalningshistorik och kundhändelser. Sök, filtrera och exportera aktuellt urval till CSV. Leverantörsvyn länkar till befintligt inköpsunderlag. Reskontrorna visar aktuell status, inte historiska saldon per valfritt datum; leverantörsvyn inkluderar godkända underlag även före bokföring. Utfärdade kundunderlag utan aktiv bokföring markeras särskilt.

Flödet gäller vanliga svenska fakturor i **SEK enligt fakturametoden**. Andra valutor, kontantmetod, utländsk/omvänd moms, förskott, överbetalningar, automatisk leverans, påminnelser, bankfiler och bankavstämning ingår inte. Befintliga utkast utfärdas inte automatiskt. Bokför inte äldre fakturor på nytt om de redan ingår i tidigare bokföring eller ingående balans. Fakturor och krediter påverkar inte lagersaldot; utleveranser registreras separat.

## Arbetsflöde för Lager

1. Skapa varor och tjänster i artikelregistret. Öppna Lager → Inställningar på de varor som ska lagerföras och aktivera lagerhantering, ange plats/hylla och beställningspunkt. Tjänster kan förbli ej lagerförda. Lagerartiklar behöver unika artikelnummer (även utan skillnad på stora/små bokstäver). Ett enda lager med en platsnotering per artikel stöds.
2. Registrera **Ingående saldo** före artikelns första rörelse, eller skapa en inventering för att ange aktuellt faktiskt antal. Ingen historik från äldre inleveranser räknas om automatiskt. Nya poster använder heltal i hundradelar av artikelns enhet; högst två decimaler kan anges.
3. **Registrera lagerrörelse** för inleverans eller uttag, med datum, underlag och orsak. Negativa saldon avvisas både nu och i den kronologiska historiken. Framtida lagerdatum stöds inte. Artikelnummer och enhet skyddas när lagerhantering används eller artikeln har rörelser; namn och försäljningspris kan fortfarande ändras.
4. På nya inköpsorder: välj artikel från registret eller koppla raden med **Artikelkoppling för lager**. Spara och granska ordern. Kopplingen och om raden ska lagerföras sparas före utfärdande. Ändrad lageraktivering kräver att utkastet sparas om före utfärdande. Enheten måste överensstämma; ingen automatisk förpackningsomräkning görs. Ordervyn visar vilka rader som lagerförs.
5. Inleveranser från utfärdade lagerkopplade order uppdaterar inköp och lager atomiskt, även vid delleverans. Rättelse görs i Inköp och skapar en motrörelse i lager på dagens datum. Om varorna redan förbrukats och rättelsen skulle ge negativt saldo avvisas hela rättelsen; mottagningsstatus och lager lämnas då båda oförändrade. En manuell rad med samma artikelnummer utan artikelkoppling påverkar inte lagret.
6. **Ny inventering**: välj datum och referens, fyll faktiskt antal för artiklar som räknats och lämna övriga tomma. Ett utkast kan omfatta upp till 500 artiklar. Granska registrerat antal, räknat antal och differenser och välj **Godkänn och uppdatera saldo**. Ändrade lagerrörelser eller lagerinställningar efter räkningens start blockerar godkännande. Makulera då utkastet, uppdatera uppgifterna och skapa ett nytt.
7. Godkända inventeringar och lagerrörelser ändras eller raderas inte. Manuell in-/utleverans kan rättas med en motsatt rörelse; original och orsak bevaras. Inleveranser från inköp rättas vid inköpsunderlaget, inventeringsdifferenser med en ny inventering. Nya rörelser eller inventeringar får inte dateras före en senare godkänd inventering för samma artikel, så att dess räknade saldo inte ändras retroaktivt. Rörelser samma dag ordnas efter registreringsordning.
8. Sök och filtrera lagerlistan, visa artiklar under beställningspunkten och filtrera rörelsehistoriken på artikel, typ och datum. **Uppdatera** läser aktuella uppgifter om en annan vy har ändrat lagret. Lagerhantering kan avaktiveras först när saldo är noll och utfärdade lagerkopplade order avslutats.
9. Lagerlistor, rörelser och inventeringar kan skrivas ut till PDF med den befintliga utskriftshistoriken. Aktuellt urval kan exporteras som CSV. PDF-kopior, lagerdata och historik ingår i databasens säkerhetskopior.

Lagermodulen hanterar **antal**, inte automatisk lagervärdering eller lagerbokföring. Fakturautkast och utfärdade kundfakturor drar inte lager; registrera utleverans manuellt med referens. Leverantörsfakturor/krediter ändrar inte antal. Reservationer, flera lager, lagerflyttar, batch-/serienummer, FIFO/medelpris och automatisk koppling till kundorder ingår inte i denna version.

Version 0.11 använder fortsatt **schema 8**. Befintliga uppgifter och PDF-historik bevaras vid uppgradering eller import av kompletta schema 4/5/6/7-kopior från 0.5–0.9-serien. Äldre programversioner ska inte användas mot den uppgraderade databasen.

## Utskriftshistorik under Dokument

- Öppna **Dokument → Utskriftshistorik** för datum, dokumenttyp, nummer, mottagare och status. Sök, filtrera på lokala datum, typ (inklusive Lönebesked) och status samt bläddra 25 rader åt gången. Övrig dokumenthantering är fortfarande beta.
- Befintliga utskriftsvyer för tidsrapporter/fakturaunderlag, fakturautkast, utfärdade kundfakturor/krediter, enskilda eller samlade lönebesked, verifikationer, bokföringsrapporter, inköpsorder och leverantörsfakturor får **Spara PDF** och **Historik för underlaget**. Historiklänkar finns även vid underlagens utskriftsknappar. Dessa underlag behåller sina befintliga utkast-/granskningsmarkeringar.
- I skrivbordsappen skapas en oföränderlig PDF innan utskrifts- eller spara-dialogen öppnas. Varje försök får en egen historikrad. Från detaljerna kan du **Visa PDF**, **Spara PDF**, **Skriv ut igen** eller **Öppna underlag**. Omutskrift och ny PDF-export använder sparade PDF-bytes, även om originalunderlaget har ändrats. PDF-kopians ursprungliga tidpunkt visas också.
- Status skiljer mellan förberedelse, öppnad dialog, skickad till utskriftssystemet, sparad PDF, avbrutet och misslyckat. Native utskriftsdialogens callback avgör status; fysiskt papper kan inte bekräftas. Efter avbrott/omstart med ett oavslutat försök visas **Okänt resultat**, aldrig en antagen lyckad utskrift. Fel vid PDF-generering registreras med förklaring och utan PDF-knappar.
- Historiken registrerar appens utskriftsknappar och Ctrl + P i utskriftsvyn. Utskrift direkt från en PDF-visares egna kontroller eller externa program registreras inte. Utvecklingsläget i vanlig webbläsare har kvar utskriftsförhandsvisning men kan inte skapa automatiska PDF-kopior eller tillförlitlig historik; detta anges i vyn.
- PDF-kopior och historik lagras i SQLite och ingår i databasexport/import. En PDF får vara högst 20 MB. Databasen växer när kopior sparas; gränsen på 64 MB för import via appen gäller fortfarande för hela säkerhetskopian. Ta regelbundna säkerhetskopior. Historiken kan inte återskapa utskrifter gjorda före uppdateringen och har ingen funktion för radering eller separat åtkomstkontroll för löner.
- Utskriftshistoriken infördes i version 0.6 med schema 5; nuvarande version använder schema 8. Uppgradering och import av kompletta schema 4-kopior från 0.5-serien bevarar tidigare företags-, personal-, kund-, inköps- och bokföringsdata. Kör inte äldre programversioner mot den uppgraderade databasen.

## Arbetsflöde för Bokföring

1. Fyll i företaget och skapa ett räkenskapsår under Bokföring. Kalenderår och brutna år stöds, med högst 18 månaders längd och utan överlappning.
2. Kontrollera startkontoplanen. Den är ett redigerbart urval av vanliga konton, inte en komplett eller versionscertifierad BAS-kontoplan. Svenska och engelska kontonamn kan anges. Konton med saldo i öppna år kan inte inaktiveras.
3. Ange balanser från föregående bokföring under Räkenskapsår → Ange ingående balans. Endast kontoklass 1–2 tillåts. Debet och kredit måste balansera. IB låses när första verifikationen bokförs.
4. Skapa ett balanserat verifikationsutkast med datum, text och bilagereferens. Granska och välj **Bokför och lås**. Företagsnamn och organisationsnummer krävs. Organisationsnumret låses efter första bokförda verifikationen; använd en separat databas för ett annat företag. Löpnummer i serie A tilldelas atomiskt vid bokföring, separat för varje räkenskapsår. Misslyckade försök förbrukar inga nummer.
5. Bokförda rader ändras eller raderas inte. **Skapa motbokning** ger en ny verifikation som spegelvänder originalet och länkar rättelsen. Bokför därefter vid behov en ny korrekt verifikation. Motbokningen kan göras i ett senare öppet år och får inte dateras före originalet. Motbokningar kan inte motbokas igen automatiskt.
6. Rapporter räknar bara bokförda poster, inklusive original och motbokning, samt IB. Huvudboken visar löpande saldo. Saldobalans visar debetpositiva/kreditnegativa saldon; resultatrapporten visar intäkter positivt och kostnader negativt. Konto 8999 särredovisas som resultatöverföring. Balansrapporten visar även ej överfört resultat och en kontroll som ska vara noll.
7. Lås avstämda perioder. Låsningen kan bara flyttas framåt och saknar återöppning i denna version. Utkast i perioden måste först hanteras. Årets sista dag låses via **Avsluta år**.
8. Vid årets slut: bokför nödvändiga justeringar och överför återstående resultat med valt konto i eget kapital (20xx, exempelvis 2019 eller 2099 beroende på företagsform) mot 8999. Avsluta sedan året. Balanskonton kan föras vidare till ett tomt år som börjar direkt dagen efter. Avslutade år är skrivskyddade. Ändringar efter en tidigare resultatöverföring kan kräva att denna motbokas och beräknas om före avslut.

Lönebokningen använder de manuellt verifierade beloppen i godkänd lönekörning. Kontant bruttolön, kostnadsersättning och arbetsgivaravgift bokas mot skatt, avgiftsskuld, löneskuld och eventuella reglerade personalfordringar. Förmåners faktiska kostnader bokförs separat; förmånsvärdet skapar ingen extra kontant kostnad. Bankbokning kräver att lönen är markerad utbetald och först bokförd mot skuldkonton. Den använder lönebokningens sparade löneskuldskonto. Ingen överföring görs till banken. Motboka bankbokningen före lönebokningen vid rättelse. En lönekörning med aktiv bokföring kan inte makuleras i Personal.

Bilagereferenser pekar på underlag som du själv bevarar. Digitala bilagor, SIE-import/export, automatisk momsdeklaration, bankavstämning och årsredovisning ingår ännu inte. CSV-exporten innehåller verifikationsrader för urvalet, inte IB eller en fullständig säkerhetskopia. Säkerhetskopiera hela databasen enligt instruktionerna nedan. Kundfakturor bokförs atomiskt vid uttryckligt utfärdande; sparade utkast bokförs inte.

## Arbetsflöde för Inköp

1. Skapa leverantör med kontaktuppgifter, betalningsvillkor och eventuellt bankgiro/plusgiro. Leverantörer kan arkiveras genom att markera dem som inaktiva. Historiska order och fakturor behåller en kopia av uppgifterna. Ändrade leverantörsuppgifter kräver att utkast sparas om före granskning.
2. Skapa inköpsorder med inköpspris, antal, rabatt och moms. Artikelregistret kan fylla i namn, artikelnummer och enhet; försäljningspriset används inte som inköpspris. Granska och utfärda ordern, som sedan kan skrivas ut. Ingen e-post skickas.
3. Registrera inleveranser med följesedelsreferens. Delleveranser stöds och överleverans avvisas. Rätta felregistreringar med orsak. Order kan avslutas med kvarstående kvantitet; detta är inte samma sak som att allt har levererats. Inleveranser uppdaterar lagersaldot för rader som kopplats till lagerförda artiklar före utfärdande. Inga bokföringsposter skapas.
4. Registrera leverantörsfaktura, eventuellt från ordern. Ange leverantörens nummer, datum, förfallodag, betalningsreferens och hänvisning till originalet. Inköpsorder och fakturarader jämförs manuellt; inga lagersaldon eller mottagningsattester skapas automatiskt.
5. Kontrollera radpriser, rabatt, moms och avdragsgill andel. Andelen avdragsgill moms är ett förslag, inte en automatisk bedömning av avdragsrätt. Moms beräknas per rad; en manuell avvikelse på högst ett öre per rad tillåts för avstämning mot fakturan. Öresutjämning stöds inom ±1 SEK. Ange originalets totalbelopp, som måste stämma exakt före godkännande. Dubbelregistrering av godkänt fakturanummer för samma leverantör avvisas.
6. Godkända fakturor är låsta. Välj **Bokför faktura**, öppet räkenskapsår, datum och granskade konton. Ej avdragsgill moms läggs på kostnads-/tillgångskontot. Avdragsgill moms och leverantörsskuld bokförs separat. Godkännande och bokföring är skilda steg; reskontran visar även ännu ej bokförda dokument.
7. Registrera faktiskt genomförda betalningar med belopp och bankreferens. Delbetalningar stöds; större belopp än kvarvarande skuld avvisas. Registreringen och bokföringen sparas tillsammans eller inte alls. Ingen banköverföring görs av programmet. Bokföringsdatum kan skilja sig från faktiskt betalningsdatum när en registrering rättas i en öppen period.
8. Registrera kreditfaktura från originalfakturan med positiva belopp. Den kvittas först mot obetald del av originalet. Överskjutande kredit blir en fordran på leverantören och kan regleras med registrerad återbetalning. Krediter kan inte tillsammans överstiga originalbeloppet. Krediten bokförs på originalets leverantörsskuldkonto.
9. Felaktiga betalningsregistreringar kan motbokas från Inköp eller Bokföring. Båda vägarna uppdaterar reskontran i samma transaktion. Ingen faktisk bankbetalning återtas. Motboka betalningar före kredit-/fakturabokningen och krediter före originalfakturan. Ett godkänt dokument som felregistrerats kan makuleras först efter att tillhörande bokföring och aktiva beroenden hanterats; historiken raderas inte.

Reskontran är aktuell, inte en historisk rapport per valfri dag. Den visar skulder, förfallna belopp och belopp att få tillbaka samt kan exporteras till CSV. Belopp avseende kreditfakturor får negativa tecken i exporten. Originalfakturor och följesedlar bevaras separat; utskriften från registret ersätter inte originalet.

Denna version stödjer vanliga svenska inköp i **SEK enligt fakturametoden**. Kontantmetod, utländsk/omvänd moms, förskott, överbetalningar, automatisk tolkning av PDF/OCR, bankfiler och automatisk lagerbokning ingår inte. Gamla fakturor som redan bokförts eller ingår i IB ska inte bokföras en gång till; import och avstämning av äldre leverantörsreskontra kräver separat hantering.

## Utveckling

Använd Node.js 24 LTS och npm. Arbeta i den befintliga utcheckningen; molnuppgifter är redan isolerade och behöver ingen extra Git-worktree.

```sh
npm ci
npm start
```

`npm start` kör gränssnitt och API lokalt på port 3000. Ändra port med miljövariabeln `PORT`. För skrivbordsappen:

```sh
npm run desktop
```

I molnmiljön måste paketverktygen ha skrivbara cachekataloger och Node använda den tillhandahållna nätverksproxyn. De sparade miljöinstruktionerna innehåller inställningarna. Om Electron-binären saknas, kör `node node_modules/electron/install.js` med samma proxy- och cacheinställningar; behåll TLS- och checksummeverifiering.

## Tester och Windowsbygge

```sh
npm test
npx playwright install chromium
npm run test:ui
node tests/desktop-smoke.cjs
npm run dist:win
```

Desktoptestet kräver en grafisk miljö. Webbläsartester kan använda installerad Chromium via `SIZZLA_CHROMIUM`. Ange en tom separat datakatalog med `SIZZLA_TEST_DATA` när UI-testet upprepas; standardkatalogen är `/tmp/sizzla-ui-tests` för lokal Linuxutveckling. Testa aldrig mot en katalog med användardata.

Windowsinstallationsprogram byggs till `dist/`. GitHub Actions-filen `.github/workflows/windows.yml` testar och bygger på Windows när den körs i GitHub; artefakten laddas upp till körningen. En push till en versionstagg `v*` publicerar en förhandsrelease med installationsprogrammet efter godkända tester. Byggkommandot publicerar inte själv; publiceringen sker i ett separat GitHub-steg. Installationsprogrammet är ännu inte kodsignerat. Ett byggt paket är inte bevis för att installationen och samtliga funktioner har verifierats på Windows 11.

För ett Windows-paket utan installationsprogram: `npx electron-builder --win zip --x64`. Packa upp **hela ZIP-filen** och starta `Sizzla 3000.exe` i den uppackade katalogen. Vid korsbygge på Linux utan Wine kan `--config.win.signAndEditExecutable=false` användas för ZIP-paketet; det lämnar Electrons standardikon och metadata. NSIS-installationsbygget kräver däremot Wine på Linux eller en Windowsbyggmaskin.

## Data och säkerhet

- Skrivbordsappen använder Electrons användardatakatalog, normalt `%APPDATA%/Sizzla 3000/data` på Windows. Webbutveckling använder `.local/` i projektet.
- `SIZZLA_DATA_DIR` kan ange en annan lokal datakatalog. Använd inte en gemensam nätverksmapp för databasen.
- Under **Säkerhet & säkerhetskopiering → Exportera hela databasen** skapas en konsekvent SQLite-kopia även medan appen är öppen. Alla tabeller, historik och inställningar ingår. Refererade originaldokument som finns utanför databasen måste kopieras separat. Automatisk schemalagd säkerhetskopiering ingår inte.
- Kryptering är förvalt för export. Ange och upprepa ett separat lösenord med 10–256 tecken. Formatet `.sizzla` använder AES-256-GCM med slumpmässig salt/nonce och scrypt (N=32768, r=8, p=1). Ett borttappat lösenord kan inte återställas. Avmarkerad kryptering ger en vanlig `.sqlite`-fil.
- **Importera databas** accepterar kompletta säkerhetskopior från denna databasstruktur, upp till 64 MB. Ange lösenord för krypterad kopia och markera uttryckligen att nuvarande data ska ersättas. Appen kontrollerar integritet, referenser, schema och JSON innan importen förbereds. Delimport och sammanslagning stöds inte. Inställningar från kopian återställs också. Äldre låsinställningar förblir inaktiva.
- Importen börjar gälla vid nästa programstart. Fortsätt inte registrera data före omstart. **Avbryt förberedd import** behåller den nuvarande databasen. Okrypterade räddningskopior sparas som `before-import-*.sqlite` när importen förbereds och `before-restart-import-*.sqlite` precis innan bytet. Skydda även dessa filer med Windowsåtkomstskydd/BitLocker. Ett fel under kontrollen lämnar den befintliga databasen kvar.
- **Öppna databasens katalog** öppnar den konfigurerade datakatalogen i Windows Utforskaren. Funktionen är tillgänglig i skrivbordsappen. För manuell kopiering: stäng programmet och kopiera hela datakatalogen, inklusive eventuella `-wal`/`-shm`-filer. Behåll alltid en kopia av tidigare data innan manuell återställning.
- **Utseende & läsbarhet** har en egen flik under Inställningar. Där väljer du färgtema, textstorlek (100, 125, 150, 175 eller 200 %) för hela gränssnittet samt valbar fet text. Välj **Spara** för att spara alla tre valen tillsammans. Standard är Följ systemet, 100 % och normal text. Sparade val behålls vid uppdatering. Menyer och formulär anpassas vid förstoring; breda tabeller kan rullas i sidled. Pappersutskrifter behåller normal skala.
- Programlås och upplåsningshistorik är bortkopplade i 0.5.4. Låsknapp, Ctrl + L, inaktivitetsmätning och Windowskoppling för låsning ingår inte. Äldre låsinställningar och historik ligger kvar orörda för kompatibilitet med säkerhetskopior, men kan inte aktivera ett lås, heller inte efter import. Använd Win + L för att låsa Windows.
- Databasen är inte krypterad i applikationen. Använd Windowskontots åtkomstskydd och exempelvis BitLocker för skydd på disk.
- Versionerna 0.2–0.11 utökar databasen utan att ersätta befintliga kunder, artiklar, inställningar, fakturautkast, personal eller bokföring. Aktuell databas använder schema 8. Ta en säkerhetskopia före uppdatering. Äldre programversioner ska inte användas mot den uppgraderade databasen.
- API:t lyssnar endast på loopback och tillåter endast rätt Host-header. Skrivningar kräver samma origin och en sessionsspecifik token. Rendererprocessen saknar Node-åtkomst och kör med sandbox och context isolation.
- Det finns ännu ingen fjärrinloggning eller fleranvändarhantering. Exponera inte den lokala tjänsten på nätverket.

## Förberett för nästa steg

Gränssnittet använder ett HTTP-API. Validering och momsberäkning ligger i `src/domain.cjs`, lagring och lokalt API i `src/server.cjs`, Windowsfönstret i `src/desktop.cjs`. Gränssnittet ligger i `public/` och använder gemensamma svenska/engelska språktexter.

Personal, löneberäkning, frånvaro och statusövergångar ligger i `src/hr.cjs`; personalgränssnittet i `public/hr.js`. Pengar och decimalantal lagras som heltal i ören respektive hundradelar. Beräkningen av skatteavdrag, avgifter och klassificeringen av förmåner/kostnadsersättningar måste tills vidare göras och verifieras utanför programmet. Inga åldersgränser, skattesatser eller myndighetsformat antas som standard. Aktuella myndighetsregler måste verifieras innan automatisk svensk löneberäkning införs.

Bokföringsmodulen ligger i `src/accounting.cjs` och `public/accounting.js`. Rapporternas saldoberäkning delas av server och gränssnitt i `public/ledger-math.js`. Låsning av bokförda belopp skyddas även med SQLite-triggers; detta gör inte databasfilen skyddad mot manipulation av någon med full filåtkomst. Databasmigreringen till schema 3 bevarar tidigare personal-, kund- och fakturadata.

Inköp ligger i `src/purchases.cjs` och `public/purchases.js`. Bokföringsmodulens interna transaktionsgränssnitt används för att spara inköpsregistrering och motsvarande verifikation atomiskt. Motbokningskopplingen håller betalningsstatus och bokföring samordnade även när rättelsen startas i Bokföring. Uppgraderingen från schema 3 till 4 testas med befintliga bokförings-, personal- och kunduppgifter.

Det ger en grund för en framtida `sizzla-3000-server`. Serverdrift kräver separat implementation av HTTPS/TLS, autentisering, behörigheter, revisionslogg, datamigreringar, samtidighetskontroll, säkerhetskopiering och eventuellt en serverdatabas. Molndrift och synkronisering ingår inte i denna version.

Säkerhetskopiering, och import ligger i `src/security.cjs`; gränssnitt och läsbarhet i `public/security.js` och `public/accessibility.css`. Lösenord för krypterade säkerhetskopior kräver fortfarande minst 10 tecken.

Utskriftshistorik och PDF-lagring finns i `src/printing.cjs`, den begränsade IPC-bryggan i `src/print-preload.cjs` och de inbyggda dialogerna i `src/desktop-printing.cjs`. Ursprung och huvudram kontrolleras före native anrop; renderern får varken generell Node-åtkomst eller valfria filvägar.

Lagermodulen ligger i `src/inventory.cjs` och `public/inventory.js`. Inköpsmodulens lagerkoppling körs inom samma SQLite-transaktion som mottagningen/rättelsen. Ingången via artikelregistret skyddar artikelnummer och enhet när de används i lager.

Fakturering och kundbetalningar ligger i `src/sales.cjs` och `public/sales.js`. Utfärdande, regleringar och bokföringskopplingar använder gemensamma SQLite-transaktioner. Schema 7 bevarar befintliga data, lager och PDF-historik.

Databaslistan hanteras i `src/databases.cjs` och `public/databases.js`. Servern öppnar ett nytt sammanhang före byte, sparar aktivt val och byter sessionsidentifierare. Native utskrift blockeras under bytet och använder aktuell session; databasformatet är nu schema 8.

Tid och projekt finns i `src/time.cjs` och `public/time.js`. Schema 8 tillför projekt, tidsrader, låsta fakturaunderlag och händelser. Vid databasbyte laddas även tidsmodulen om; äldre kompletta säkerhetskopior får tomma tidstabeller utan att kund-, bokförings- eller PDF-data ersätts.

Analysens rena beräkningar finns i `public/analysis-math.js` och gränssnittet i `public/analysis.js`. Samma beräkningar verifieras i Node-tester. Färgteman ligger i `public/themes.css`; tillåtna temaval valideras i det lokala API:t och sparas i databasens befintliga preferenser.
