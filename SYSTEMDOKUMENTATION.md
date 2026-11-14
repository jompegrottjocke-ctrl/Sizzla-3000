# Sizzla 3000 – systemöversikt och kvarstående krav

Version 0.24.0, databasschema 10. Uppdaterad 2026-11-14.

Detta är en teknisk grund för systemdokumentation, inte en försäkran om fullständig efterlevnad. Företaget behöver komplettera den med sin kontoplan, ansvarsfördelning, underlagsförvaring, andra system och rutiner. Fullständigt stöd för skarp bokföring är ännu inte färdigt.

Utseende, textstorlek och fet text hanteras i Inställningar → Utseende & läsbarhet. De sparas i samma befintliga `preferences`-post per företagsdatabas; flytten ändrar inte lagringsformat eller tidigare val. Säkerhet & säkerhetskopiering hanterar export/import och katalogöppning.

## Organisation och lagring

En lokal Windowsapp används för ett företag per databas. Upp till tio företagsdatabaser, inklusive den första, kan registreras under Databaser, men endast en är aktiv åt gången. Register, bokföring, löner, lager och PDF-historik är separerade. Electron visar gränssnittet; ett API på loopback validerar och lagrar uppgifter i SQLite. Ingen molnsynkronisering eller fleranvändarhantering finns. Databaskatalogen kan öppnas från Säkerhet & säkerhetskopiering. Normal Windowsplats är `%APPDATA%/Sizzla 3000/data`; `SIZZLA_DATA_DIR` kan ändra den. Första databasen ligger kvar i denna katalog. `databases.json` innehåller listan och aktivt val; nya databaser ligger i `databases/<id>/`. En gemensam nätverksmapp stöds inte.

| Del | Lagring och samband |
| --- | --- |
| Företag, kunder, artiklar och fakturautkast | Inställningar och `records`; sparade utkast har kopior av parternas uppgifter. |
| Bokföring | `ledger_accounts`, `ledger_years`, `ledger_vouchers`, `ledger_events`. Rader och företagsuppgifter finns i verifikationens JSON-data. |
| Personal och lön | `src/hr.cjs`; godkända löneunderlag kan kopplas till löne- och utbetalningsverifikationer via källtyp och käll-ID. Skatt och avgifter granskas manuellt. |
| Inköp | `src/purchases.cjs`; order, mottagningar, fakturor och betalningar med sparade uppgifter och bokföringskoppling. |
| Kundfakturor och regleringar | `sales_documents`, `sales_payments`, `sales_allocations`, `sales_events`. Kredit pekar på original; betalning och kvittning pekar på berörda dokument. |
| Lager | `src/inventory.cjs`; antal, rörelser och inventeringar. Inköpsmottagning och lagerrörelse sparas tillsammans. Ingen automatisk lagerbokföring. |
| Tid och projekt | `time_projects`, `time_entries`, `time_batches`, `time_events`. Godkänd tid låses; fakturaunderlag pekar på fakturautkast och bevarar en kopia av valda tidsrader, projekt, kund och företag. |
| Utskrifter | `src/printing.cjs`; PDF-bytes och försökshistorik i databasen. PDF skapas vid utskrift/export, inte automatiskt vid varje bokföring. |

## Bearbetning och identifiering

Pengar lagras i heltalsören och antal i hundradelar. Fakturarader beräknas med moms 0, 6, 12 eller 25 procent och avrundning per rad. Delkrediter räknas proportionellt med kumulativ avrundning mot originalets belopp. Endast vanliga svenska SEK-flöden enligt fakturametoden stöds för fakturering och inköp.

Verifikationer får löpnummer i serie A per räkenskapsår när de bokförs. Identiteten består av år, serie och nummer; internt används även ett unikt ID. Kundfakturor och krediter delar en separat nummerserie som börjar på valt startnummer. Interna ID:n skiljer även dokument med samma synliga nummer i olika moduler åt.

Manuella verifikationer innehåller datum, beskrivning, referens, konton, radnoteringar och belopp. Referensen behöver tydligt ange originalunderlag och var det finns. Underlag från lön, inköp och försäljning kopplas via `source_kind` och `source_id` till respektive register. Rapporter använder bokförda verifikationer inklusive motbokningar samt ingående balans; utkast ingår inte.

Utfärdande av kundfaktura, kundbetalning och kvittning samt motsvarande verifikation sker i samma SQLite-transaktion. Fel rullar tillbaka hela operationen. Kundfakturan får sitt nummer först vid lyckat utfärdande och bokföring. Leverantörsfakturans godkännande och bokföring är separata steg. Aktuell leverantörsreskontra inkluderar även godkända ännu ej bokförda underlag.

Vid byte öppnas måldatabasen först. Aktivt val sparas atomiskt i en separat JSON-fil, skrivsessionen byts och den tidigare anslutningen stängs. Gamla och ofullständiga skrivförfrågningar avvisas. Skrivbordsappen blockerar byte under pågående PDF-/utskriftsåtgärd och stänger gamla utskriftsfönster. Databasbytet är ingen bokföringsrättelse eller användaridentifiering. Databaslistan är inte en revisionslogg.

Tid anges i hundradelstimmar och pris i heltalsören. Samma beräkningsfunktion används när tidsrader blir fakturarader. Godkännande är en uttrycklig lokal granskningsåtgärd, inte identifierad chefsattest. Överföring till ett fakturautkast kopplar hela tidsrader atomiskt utan bokföringspost. Bokföring skapas först vid fakturans utfärdande. Fakturautkast kan redigeras separat; det sparade tidsunderlaget ändras inte. Återtagning före utfärdande tar bort utkastet och frigör tidsrader i samma transaktion, medan underlaget och orsaken bevaras. Utfärdande identifieras via försäljningsmodulens koppling till utkast-ID och hindrar återtagning. Krediter/motbokning frigör inte automatiskt tid. Ingen löneöverföring eller kostnads-/projektresultatbokföring sker.

Analysmodulen (`public/analysis-math.js`, `public/analysis.js`) läser inlästa uppgifter från aktiv databas. Resultatanalys använder bokförda verifikationers datum och inkluderar motbokningar, med kontoklassning enligt Bokföring och undantag för resultatöverföring 8999. Kund-/artikelstatistik bygger på utfärdade dokument efter fakturadatum och nettoförsäljning; aktuell reskontra använder aktuella saldon, inte historiska saldon vid rapportens slutdatum. Rapporten anger datakälla, urval och inläsningstid. Artikel-ID och SKU-kopia bevaras på nya valda artikelrader, medan äldre/manuella rader redovisas separat utan gissad registerkoppling. CSV är arbetsmaterial. PDF-kopian bevaras i utskriftshistoriken; återöppning av analysen räknar om aktuella uppgifter och ersätter inte den sparade PDF-kopian.

## Rättelser och befintlig historik

Bokförda verifikationsdata skyddas mot ändring och radering i appen och med SQLite-triggers. Rättelse görs genom en ny motbokningsverifikation med orsak och datum; original och rättelse pekar på varandra (`corrects`, `reversed_by`). En korrekt ny registrering kan sedan göras vid behov. Avstämda perioder kan låsas framåt. Utfärdade kundfakturor ändras inte; kommersiella rättelser görs med kreditfakturor.

`ledger_events` bevarar tidpunkt, objekt, åtgärd och JSON-data för bland annat utkast, bokföring, rättelser, konton och årshantering. Bokföringsvyn visar tidpunkt, objekt och åtgärd; den visar inte hela loggens JSON-innehåll. `sales_events` kompletterar med kundfakturornas och regleringarnas händelser. `time_events` registrerar projektändringar, tidsregistrering, godkännande, makulering och överföring/återtagning av fakturaunderlag. Inte heller denna historik identifierar operatören. Betalningsrättelse från Bokföring uppdaterar berörd reskontra i samma transaktion. Tidpunkter lagras som UTC; gränssnittet visar lokal tid. Historiken bygger på datorns klocka.

Historiken är **inte en fullständig behandlingshistorik**. Från 0.16 krävs lokalt angiven ansvarig vid motbokning och kreditbokning. Namn/ID sparas i nya verifikationer och nya bokföringshändelsers JSON-data. Uppgiften är självdeklarerad, inte autentiserad; äldre uppgifter kompletteras inte i efterhand. Bokföringshistoriken visas med ansvarig/programversion och kan exporteras med detaljer. Alla registerändringar och beräkningsregler är ännu inte fullständigt dokumenterade. Lokala SQL-skydd skyddar inte mot någon med full kontroll över databasfilen. Dessa begränsningar måste åtgärdas och verifieras innan stöd för full efterlevnad kan beskrivas som färdigt.

## Bevarande och återställning

Exportera varje företagsdatabas regelbundet, även före uppdatering. Export/import gäller bara aktiv databas. Databaslistan ingår inte i databasexporten; en manuell kopia av hela arbetsplatsen kräver stängd app och hela den ursprungliga datakatalogen med listan och alla underkataloger. Exporten omfattar register, bokföring, historik, inställningar, importerade originalunderlag och sparade PDF-kopior. Refererade originalfakturor, bankunderlag och andra filer utanför databasen ingår inte och måste bevaras separat med tydliga referenser. CSV är ett urval, inte en fullständig säkerhetskopia eller SIE-fil.

Krypterad export använder AES-256-GCM och scrypt. Själva arbetsdatabasen är inte applikationskrypterad. Skydda dator och kopior med åtkomstskydd och lämpligt diskskydd. Programlås ingår inte. Import av komplett kopia ersätter hela databasen vid nästa start; räddningskopior bevaras lokalt. Importgränsen är 256 MB inklusive original och PDF-kopior.

Företaget behöver fastställa och prova rutiner för läsbarhet, återställning, förvaring och lagstadgad bevarandetid enligt 7 kap. bokföringslagen. Det finns ingen automatisk arkivtjänst, schemalagd säkerhetskopiering eller garanti om långsiktig läsbarhet. Bevara relevanta programversioner, systemdokumentation och egna rutiner tillsammans med räkenskapsinformationen. Äldre program ska inte öppna en uppgraderad arbetsdatabas.

## Kvarstående arbete före skarp användning

- Identifiera och bevara vem som utfört rättelser, tillsammans med tid, orsak och berörda underlag. Det innebär inte att det borttagna programlåset återinförs.
- Göra fullständiga historikdetaljer tillgängliga och exporterbara samt kartlägga luckor i loggningen, inklusive ändrade företags-/registeruppgifter och återställning.
- Säkerställa konsekventa hänvisningar från samtliga bokföringsposter till kompletta verifikationer, motpart och originalunderlagens förvaringsplats. Den manuella referensrutan ensam garanterar inte detta.
- Versionsbevara och tillgängliggöra systemdokumentation i distributionen samt ge stöd för företagets egna rutiner och kopplingar till andra system.
- Verifiera arkivering och återläsning över tid, avstämning av huvudbok/reskontra samt stödet mot aktuell normgivning från Bokföringsnämnden. Automatiska tester av belopp och låsning är inte en sådan fullständig granskning.

## Framtida molndrift och personuppgifter

Fliken Server & moln är en ren betaförhandsvisning. Adress, användarnamn och serverdatabas finns bara tillfälligt i gränssnittets minne. Ingen konfiguration sparas och inget anslutnings-/inloggningsanrop görs; lösenordsfält och anslutningsknappar är avstängda. Säkerhetstexterna anger planerade krav på HTTPS/TLS, certifikatkontroll och behörigheter, och bekräftar inte någon aktuell krypterad anslutning. Det faktiska driftläget förblir lokalt.

Den lokala versionen skickar inte företagets register till en Sizzla-server. Om en framtida tjänst behandlar personuppgifter för kundföretagets räkning behöver personuppgiftsansvarig och personuppgiftsbiträde identifieras och ett personuppgiftsbiträdesavtal enligt artikel 28 GDPR finnas på plats. Även underbiträden, instruktioner, säkerhet, incidenthantering, återlämning/radering och eventuella överföringar behöver hanteras. Krypterad transport ersätter inte avtalet eller dessa rutiner. Server- och molndrift ingår ännu inte.

## Källa och kontroll

[Bokföringslag (1999:1078), Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/), läst 2026-11-12. Särskilt 4 kap. 1–2 §§, 5 kap. 5–11 §§ och 7 kap. Detta dokument beskriver implementationen och kända luckor; det är ingen fullständig granskning av lag, god redovisningssed eller kundens användning.

## Import av artiklar och inventering (0.12.0)

Artiklar & tjänster respektive Lager har separata importguider. CSV (UTF-8 eller Windows-1252; semikolon, komma eller tabb) och Excel .xlsx stöds, högst 5 MB och 50 kolumner. Första ifyllda raden är rubriker. Artikelimport tillåter 5 000 datarader, inventering 500. Excel begränsas även till 20 blad och 30 MB uppackad data; formler och externa datatyper som datum i importfälten avvisas. Äldre .xls och .xlsm stöds inte. Mallar med texter och exempel finns i båda formaten.

Kolumner kopplas och varje rad valideras före import. Artikelnummer matchas utan hänsyn till stora/små bokstäver. Dubbletter i filen, flera registerträffar, ogiltiga priser, enheter och GTIN blockeras. Priser är SEK exklusive moms, med högst två decimaler; moms är 0/6/12/25. GTIN valideras med längd och kontrollsiffra, vilket inte verifierar ägarskap hos GS1. Befintliga artiklar hoppas över som standard; uppdatering kräver aktivt val. Okopplade valfria fält behålls på befintliga artiklar, nya får pris 0, moms 25 och tom GTIN.

Förhandsgranskningen är tidsbegränsad till 30 minuter, knuten till aktiv databas och kontrolleras mot förändringar i artikel- och lagerunderlaget vid sparande. Alla rader sparas i en SQLite-transaktion; fel ger återställning. Upprepat sparande av samma granskning gör inte dubbla importer. Byte av företag kastar tidigare importsessioner.

Inventering matchar befintliga artiklar och skapar endast utkast. Uttryckligt val kan aktivera lagerhantering när utkastet skapas; det återtas inte automatiskt om utkastet annulleras. Räknade antal är absoluta saldon. Antal och valfria lagerplatser ändras först vid separat granskning och godkännande av utkastet, med lagrets ordinarie revisions- och datumkontroller. En kopplad tom lagerplats tömmer platsen vid godkännande. Filens SHA-256, namn, blad och radantal sparas i inventeringsunderlaget. Samma fil och datum kan inte skapa ytterligare utkast så länge det tidigare inte annullerats.

Importhändelser lagras i befintlig inventory_events-tabell och inventeringens källa i befintlig JSON-data. Ingen schemaändring görs (schema 8). Säkerhetskopior omfattar dessa uppgifter. Originalfiler lagras inte; företaget måste spara underlagen enligt sina dokumentationsrutiner.

## WhatsApp i Personal (0.13.0)

Personal visar en av/på-knapp överst. Funktionen är på tills användaren stänger av den och valet lagras per företag i preferences.whatsappEnabled. När den är av döljs alla kontaktikoner och den inbyggda öppningsfunktionen blockerar även äldre sidors anrop. Databasschema 8 behålls; säkerhetskopior innehåller valet.

En ikon vid den anställdas namn öppnar ett nummer från den aktuella personalprofilen via Windows registrerade whatsapp:-protokoll. Svenska mobilnummer med 07 normaliseras till +46; andra nummer kräver +landskod eller 00-landskod. Mellanslag, bindestreck, parenteser och punkter tillåts som formatering. Nummer som inte kan normaliseras ger avaktiverad ikon med hjälptext. Syntaktisk kontroll verifierar inte att numret har ett WhatsApp-konto.

Öppningen använder en begränsad Electron-brygga som tar anställd-ID och aktuell databastoken; gränssnittet får inte ange en valfri extern URL. Ursprung, huvudfönster, aktiv databas, av/på-val och aktuellt nummer kontrolleras i huvudprocessen, före öppningen. Windows får öppna protokollet direkt, utan krav på att appens installationssökväg kan läsas (Microsoft Store-appar kan sakna sådan metadata). Inga meddelanden fylls i eller skickas. Vid klick lämnas telefonnumret till den lokalt registrerade WhatsApp-appen. Sizzla skickar inga uppgifter till WhatsApp i bakgrunden.

Windowsappen kräver installerad och registrerad WhatsApp Desktop; misslyckad öppning ger meddelandet ”WhatsApp Desktop behövs för denna funktion.” Inloggning och chattens tillgänglighet hanteras av WhatsApp. Webbläsarversionen öppnar inte webbchatten utan visar samma krav på skrivbordsappen.

## Personalformulär och läsbarhet (0.14.0)

Formulär för anställda, löneutkast och frånvaro har nu en separat rullningsyta för fälten. Rubrik och åtgärdsknappar ligger utanför rullningsytan. Dialogens maximala storlek tar hänsyn till programmets textförstoring, och knapparna kan radbrytas. Spara och Avbryt förblir synliga vid redigering även med 200 procents textstorlek. Ingen ändring av sparande, validering eller databasformat görs.

## Profilbilder och e-post i Personal (0.14.0)

En valfri bild väljs i personalprofilen. JPEG, PNG och WebP accepteras, högst 10 MB. Webbläsarens bildavkodare förminskar bilden till högst 384 × 384 bildpunkter med bibehållna proportioner och kodar om den till JPEG (högst 150 KiB). Omkodningen tar bort originalfilens metadata. Val, byte och borttagning sparas först med Spara; Avbryt behåller den lagrade bilden. Den omkodade bilden lagras i befintlig employees.data, inte som extern filsökväg, och ingår i företagets säkerhetskopia. Servern kontrollerar format, storlek och JPEG-dimensioner. Originalfilen lagras inte. Bilder utelämnas ur nya lönekörningars personögonblicksbilder och läggs inte på lönebesked.

Brevikonen bredvid namnet öppnar ett nytt mejl i Windows standardprogram för e-post med den aktuella personalprofilens adress som mottagare. Saknad eller ogiltig adress ger avaktiverad ikon. En separat, ursprungs- och databastokenkontrollerad Electron-brygga läser adressen från databasen och öppnar endast mailto:, utan ämne, meddelandetext eller automatisk sändning. Vid fel visas instruktion om standardprogram. Brevknappen påverkas inte av WhatsApp Desktop-knappens av/på-val. WhatsApp-knappens etikett och hjälptext anger uttryckligen Desktop och textchatt. Den öppnar send-länken, aldrig en samtalslänk.

Databasschema 8 är oförändrat. Äldre profiler utan bild fungerar; uppdateringar som utelämnar bildfältet bevarar befintlig bild.

## Anläggningsregister (0.15.1)

Anläggningsregister är en arbetsmodul under Verksamhet. Tillgångar registreras med unikt nummer, benämning, kategori, serienummer, placering, anskaffningsdatum/-värde, restvärde, avskrivningsstart, nyttjandeperiod 1–600 månader, konton och underlagsreferens. Registeruppgifter lagras som `records.kind=fixed_asset`; händelser som `asset_operation`. Ändringshistoriken använder befintlig `ledger_events` med entity=asset och bevarar före-/efteruppgifter eller händelse-/verifikationsreferenser. Inga nya tabeller eller ändrade SQL-definitioner krävs: databasschema 8 behålls. Separata företagsdatabaser och säkerhetskopior omfattar även registret och dess historik.

Registrering och aktivering bokför inte anskaffningen. Inköpet ska redan vara bokfört, och användaren granskar det vid aktivering. Underlaget kan vara en befintlig bokförd, inte motbokad verifikation, en bokförd godkänd leverantörsfaktura eller en tydlig manuellt angiven historisk underlagsreferens. Vid faktisk verifikationskoppling kontrolleras tillgängligt nettodebet på tillgångskontot mot redan kopplade aktiva/avyttrade tillgångars anskaffningsvärden. Registrering får inte kapitalisera samma belopp flera gånger. Manuella historiska referenser kan inte kontrolleras automatiskt och måste stämmas av av företaget. Aktiverade tillgångar låser organisationsnumret på samma sätt som bokförda verifikationer.

Metoden är linjär avskrivning i heltalsören med hela månader från vald startmånad, utan dagsproportionering. Avskrivningsbart belopp är anskaffningsvärde minus restvärde. Månadens belopp är skillnaden mellan avrundade kumulativa målbelopp, så totalsumman blir exakt även när ören måste fördelas ojämnt. För redan använda tillgångar kan användaren ange tidigare bokförd ingående avskrivning och sista månad; återstående belopp fördelas över kvarvarande månader. Underlaget för ingående belopp kontrolleras manuellt. Ingen avskrivning av ingående belopp bokförs igen.

Endast nästa månad i ordning kan registreras. Månaden måste vara avslutad senast på valt bokföringsdatum och bokföring kan inte dateras framåt i tiden. Varje förslag förhandsgranskas och bekräftas. Förslag gäller högst 30 minuter och kontrolleras igen mot tillgång, företag, räkenskapsår, konton och relevanta källor före bokföring. Dubbelklick på samma förslag skapar inte ytterligare bokning. Registrering och verifikation sparas atomärt. Belopp som avrundas till noll registrerar perioden utan en tom verifikation. Konton och ekonomiska villkor låses efter aktivering; metadata kan ändras med historik. Återgång till utkast tillåts före första händelsen. Annullering bevarar raden och historiken och kräver att alla gällande händelser först motbokats.

Bokföringen använder befintligt `accounting.postSource` med source_kind=assetOperation och unikt händelse-ID. Ordinarie kontovalidering, balansering, räkenskapsår, periodlås och låsta verifikationer gäller. Standardkonton 1220, 1229, 7832, 3973 och 7973 läggs till om de saknas; tidigare egna konton ändras inte. Konto för tillgång/ackumulerad avskrivning väljs bland 10–12xx, avskrivningskostnad bland 78xx, vinst bland 3xxx och förlust bland 4–7xxx. Ekonomiska och skattemässiga klassificeringar ansvarar användaren för.

Avyttring hanterar utrangering och försäljning. Försäljningen ska först vara bokförd, exempelvis via kundfakturering. Den kopplade försäljningsverifikationen måste ha tillräckligt ej tidigare fördelat kreditbelopp på valt intäktskonto. Avyttringen tar bort anskaffningsvärde och ackumulerade avskrivningar samt omför försäljningsintäkten till vinst/förlust. Den skapar ingen ny faktura, moms, betalning eller kundfordran. Alla avskrivningsmånader före avyttringsmånaden måste vara registrerade först. Utrangering kostnadsför kvarvarande bokfört värde.

Motbokningar görs i omvänd händelseordning, via tillgången eller Bokföring. Senare gällande avskrivning/avyttring måste motbokas först. Källverifikation för anskaffning kan inte motbokas medan en aktiv/avyttrad tillgång använder den; försäljningsunderlag kan inte motbokas medan en gällande avyttring använder det. Motbokning uppdaterar registret och dess historik i samma transaktion som rättelseverifikationen. Ersättningsbokning får inte föregå senare motbokningsdatum, vilket håller registervärden och bokföringsdatum i ordning.

Registerrapporten beräknar belopp per bokföringsdatum för tillgångar som nu är aktiva eller avyttrade. En motbokad händelse påverkar rapporten fram till sitt motbokningsdatum. En kopplad anskaffning inkluderas tidigast på anskaffningsdatumet och källverifikationens bokföringsdatum. Rapporten är inte en fryst historisk version av vilka registerrader som fanns vid ett tidigare tillfälle: senare registreringar, metadataändringar och annulleringar påverkar urvalet. Värden före angivet ingående avskrivningsdatum markeras som otillgängliga. Stäm av mot huvudboken och spara periodens PDF för att bevara ett historiskt registerutdrag. CSV skyddar textfält mot kalkylbladsformler. PDF använder ordinarie utskriftshistorik med kind=asset_report och lagrar en oföränderlig kopia.

Modulen stödjer inte skattemässiga överavskrivningar, nedskrivningar, uppskrivningar, komponentavskrivning, automatisk K2/K3-prövning, valutor utöver SEK eller automatisk avstämning av manuella bokföringsposter och leverantörskrediter mot tillgångsregistret. Företaget måste bedöma redovisningsprincip, nyttjandeperiod, startmånad och underlag.

## Kravarbete för Bokslut & skatt

[Kravunderlaget](docs/BOKSLUT_KRAV.md) och [källförteckningen](docs/BOKSLUT_KALLOR.md) beskriver gemensamma krav, separata AB-/EF-spår, identifierade luckor och acceptansprov inför nästa modul. Lansering är planerad efter 2026-12-29; aktuell kanal och regelversion måste verifieras före lansering. Användarens tidigare och senare K2-/årsbokslutsfiler har granskats i relevanta delar; se [BFN-analysen](docs/BFN_UPPLADDADE_REGLER.md). Bokföring och Gränsvärden har också granskats i utvalda delar; Fusion har endast omfattningsbedömts. Se [kompletteringen](docs/BFN_BOKFORING_GRANSVARDEN.md). Övriga valda regelspår samt fullständig detaljgranskning och senare publiceringskontroll återstår. Direktåtkomsten till BFN är fortfarande blockerad. Dokumenten innebär ingen ny boksluts-/skattefunktion eller verifiering av fullständig regelefterlevnad.

[K1-underlaget för enskild firma](docs/BFN_K1_ENSKILD_FIRMA.md) beskriver utvalda krav från den uppladdade vägledningen uppdaterad 2025-03-24. Detta är en käll- och kravkomplettering, inte implementerat K1-stöd.

## Bokslutsberedning 0.16 / schema 9

`src/closing.cjs` lagrar ärenden (`closing_cases`), versionsbundna arbetsunderlag (`closing_versions`) och händelser (`closing_events`) per företagsdatabas. Versioner och bokslutshistorik skyddas mot uppdatering/radering med SQL-triggers. Även `ledger_events` får sådant skydd. Dessa skydd förhindrar inte ändring av någon med full kontroll över databasfilen.

Avstämningar lagrar kontourval, huvudbokssaldo i heltalsören, jämförelsebelopp, differens, underlagsreferens, kommentar, ansvarig, UTC-tid och källfingeravtryck. Noll differens krävs för avstämd post. Ej tillämpligt kräver motivering; systemet bevisar inte fullständigt kontourval eller att motiveringen är sakligt riktig. Huvudbokssaldot använder ingående balans och bokförda verifikationer för valt år, inklusive original och motbokningar. Detta är ingen automatisk historisk reskontraavstämning.

SHA-256-fingeravtrycket inkluderar programversion och beräknas konservativt över företagsinställningar och affärsdata (inklusive bokföring, register, reskontra och relevanta modultabeller). Även andra års/registerändringar kan därför kräva ny avstämning. Val av operatör, utskriftsförsök och bokslutsärendets egna ändringar ingår inte. Uppdatering/rättelse av ett underlag efter granskning avvisar en gammal begäran och markerar avstämningarna inaktuella.

Bevarad version innehåller företagskopia, år, avsedd regelprofil och manuell tillämpningsbedömning, saldobalans, årets bokförda verifikationer, avstämningar, ansvarig, tid, programversion och källfingeravtryck. Den är arbetsunderlag, inte föreskrivet slutdokument eller verifierad deklaration. Frysning stänger inte räkenskapsåret. Återöppning kräver orsak och rensar aktuella avstämningar; äldre versioner ändras inte. Ändrat regelval i ett pågående ärende loggas och kräver ny granskning.

JSON-export innehåller den valda versionen och ärendehistoriken. Utskrift läser den bevarade versionen, med egen typ `closing_report` i PDF-/utskriftshistoriken. Originalfiler som endast anges med referens kopieras inte. Vanlig säkerhetskopia tar med nya tabeller; schema 4–8 tillåts vid import med motsvarande äldre strukturkontroll, och nya tabeller skapas vid öppning.

Ansvarig person lagras som lokal aktiv profil i `records` med namn och UUID. Samma namn behåller aktivt ID; namnbyte skapar nytt ID. Profilen används av gemensam bokföringskod även när inköp, försäljning, lön eller anläggningar initierar en motbokning. Appens tidigare lösenordslås återinförs inte. Uppgiften är ingen autentisering. Programversionsbyte loggas när databasen öppnas med versionen, och kontoplansändring loggar före-/efteruppgifter och registreringstid. Detta ersätter inte fullständig versionsbunden dokumentation av alla beräkningsregler.

## AI-agent – förberedande beta (0.16.1)

`src/agent.cjs` och `public/agent.js` tillför lokal konfiguration och historik utan agenttransport eller exekveringsmotor. Företagets `records` lagrar `ai_agent_config` med revision, avstängd tillåtelse som standard, anslutningstyp, HTTPS-adress, modell och fem behörighetsval som alla är avstängda från början. `ai_agent_event` lagrar separata historikposter med före-/eftervärden, UTC-tid, eventuell kopia av aktuell lokal operatör och programversion. Ingen särskild användaridentitet krävs för att förbereda inställningarna; okänd ansvarig markeras som ej angiven.

Konfigurationsuppdatering och händelse sparas atomiskt med revisionskontroll. API:t accepterar endast angivna konfigurationsfält och avvisar bland annat API-nyckelfält. HTTPS-adresser med inloggningsuppgifter, frågesträng eller fragment avvisas. Detta är adressvalidering, inte ett anslutnings- eller certifikattest. Endpoint kontaktas aldrig. API-nycklar lagras inte av funktionen; nyckelfält och anslutnings-/uppgiftsknappar är spärrade.

Kontroll av anslutningsstöd registrerar att transport inte är implementerad och returnerar alltid `available:false` och `connected:false`. Ingen företagsinformation överförs och inga bokföringsåtgärder utförs av agentfunktionen. Gränssnittet visar senaste 100 händelser, medan alla behålls i databasen. Ingen raderings-/ändringsfunktion för agenthistoriken exponeras. Schema 9 är oförändrat. Säkerhetskopior och databasbyte omfattar inställningar och historik. Dessa två förberedande register undantas från bokslutets källfingeravtryck eftersom de inte ändrar affärsdata.

Planerade godkännandekrav är produktkrav för den framtida agentmotorn, inte implementerad åtkomstkontroll för en extern agent. Agentidentitet, säkra hemligheter, verklig transport, datadelning, verktygsbehörigheter, godkännandeflöden och körhistorik kräver separat implementation och verifiering innan anslutning eller automatisering kan användas.

## Redovisningsbyrå 0.17

`src/agency.cjs` och `public/agency.js` tillför företagsöversikt och arbetslista. Inaktiva företagsdatabaser öppnas med SQLite `readOnly:true`; inga initierings-/migrationsfunktioner anropas för dem. Aktiv databas läses via befintlig anslutning. Varje företags sammanställning läses i en egen lästransaktion. Detta är avläsningar per företag, inte ett gemensamt transaktionellt koncernbokslut. Ofullständig/otillgänglig databas ger en separat felstatus och ingen ersättningsdatabas skapas. Äldre schema 4–9 kan läsas om förväntade tabeller finns; en senare version avvisas i översikten. Väntande import flaggas.

GET `/api/agency/overview` kräver aktuell lokal sessionstoken. Företagskatalogens validerade ID/sökvägar används; användaren kan inte ange en godtycklig fil. Symboliska länkar för databasfilen accepteras inte. Översikten returnerar företagsidentitet, år, verifikationsantal/senaste datum, periodlås, bokslutsstatus och aggregerade uppgiftsantal, inte andra företags personallistor eller verifikationsrader. En bevarad bokslutsversions källfingeravtryck jämförs med aktuell källa med samma funktion som Bokslut & skatt. Aktuellt programversionsbyte kan därför markera äldre avstämningar som inaktuella. Status ersätter inte kontroll av fullständig bokföring eller myndighetskvittens.

`records.kind=agency_task` lagrar UUID, revision, titel, ansvarig, område, prioritet, valfritt datum/år, beskrivning, referens, status och tidsuppgifter i aktiv företagsdatabas. `agency_event` lagrar separata historikposter med före-/efteruppgifter, orsak, UTC-tid, eventuell självdeklarerad operatör och programversion. Uppdatering/statusbyte och historik sparas atomiskt med revisionskontroll. Tillåtna statusövergångar är Att göra → Pågår/Klar/Avbruten; Pågår → Att göra/Klar/Avbruten; Klar/Avbruten → Att göra. Statusbyte kräver kommentar. Avslutade uppgifter måste öppnas igen innan redigering. Inga raderings-/historikredigeringsfunktioner exponeras.

Försenad avser manuellt datum före dagens kalenderdatum i Europe/Stockholm och status Att göra/Pågår. Frister beräknas inte automatiskt ur lagregler. Klar är arbetsstatus, inte bokföringspost, betalning, underskrift eller inlämning. Årskoppling valideras mot aktiv databas. Uppgiftsansvarig är ett namnfält, inte en verifierad användaridentitet. Historikens operatör är separat och kan vara okänd.

Schema 9 är oförändrat. Arbetslistor och hela historiken följer företagets export/import. Listvy och JSON-historikexport omfattar senaste 100 händelser; CSV omfattar filtrerade uppgifter och skyddar celler mot formeltolkning. Dessa administrativa uppgifter undantas från bokslutets källfingeravtryck. Företagsbyte från byråvyn återanvänder befintlig aktivering, sessionsbyte och utskrifts-/importskydd. Ingen molnserver, klientportal, extern kommunikation eller fleranvändarattest tillförs.

## Licens & version 0.17.1

`public/version.js` visar verklig paketversion från `/api/state.application`, tillsammans med utgåva, målplattform och lokal supportinformation. Servern lämnar även `process.platform`, `process.arch` och databasens `PRAGMA user_version`. Ingen installationsdag, licensägare, giltighetstid eller senast lyckad uppdateringskontroll konstrueras. Versionen i sidofält/sidfot använder samma paketversion.

Licensgränssnittet är en förhandsvisning med spärrat nyckelfält och spärrade aktiverings-/villkorsknappar. Ingen licens lagras eller valideras. Uppdateringsknappen ändrar endast lokal meddelandetext: ingen nätverksförfrågan görs och Inte kontrollerat ändras inte till en påstått utförd kontroll. GitHub-länken öppnar manuellt versionssidan i webbläsaren via befintlig hantering av HTTPS-länkar.

Supporttexten innehåller endast produktnamn, version, utgåva, körmiljö, arkitektur, schema och lokalt driftläge. Urklippsåtkomst sker på uttryckligt knapptryck; vid fel markeras den skrivskyddade texten för manuell kopiering. Inga företagsuppgifter, personuppgifter, filsökvägar, nycklar eller sessionstoken ingår. Inga nya databasposter eller tabeller införs; schema 9 är oförändrat. Verklig licensvalidering, autentiserad uppdateringskälla, signaturkontroll och uppdateringsinstallation kräver framtida implementation.

## Underlagsarkiv 0.18 / schema 10

`src/archive.cjs` och `public/archive.js` tillför importerade original, separat från utskriftshistorikens genererade PDF-kopior. `archive_documents` innehåller UUID, UTC-importtid, originalfilnamn, MIME-typ, unik SHA-256, storlek och BLOB. SQL-triggers hindrar uppdatering/radering. `archive_metadata` håller revisionsstyrd titel och anteckning. `archive_links` håller måltyp/ID, eventuellt avstämningsområde, aktivstatus, revision och kopia av målets etikett/revision vid koppling. `archive_events` bevarar historik med eventuell lokal operatör och programversion och skyddas mot ändring/radering. Inga raderingsfunktioner exponeras för original eller historik. SQL-skydden ersätter inte skydd mot någon med full kontroll över databasfilen.

Import tillåter PDF/JPEG/PNG på högst 10 MiB. Filändelse, grundläggande filsignatur/-struktur, bilddimensioner och storleksgräns kontrolleras; filerna omkodas inte. Det är inte full formatvalidering, OCR eller antivirus. SHA-256 förhindrar dubbla original; en återimport återanvänder original och ursprunglig titel i stället för att skriva över. Import och eventuell koppling sker atomiskt. En ogiltig eller inaktuell målpost rullar tillbaka importen. Mål kan vara bokförd verifikation, befintlig leverantörsfaktura, tillgång eller område i pågående bokslutsärende. Målets revision verifieras i transaktionen. Kopplingen ändrar inte bokförda verifikationer.

En felaktig koppling avaktiveras med orsak och lokalt angiven ansvarig. Tidigare mål/etikett bevaras; målidentitet får inte skrivas om och länkrader får inte raderas. Titlar/anteckningar har revisionskontroll och före-/efterhistorik. Original kan ha flera aktiva kopplingar. Alla läs-/fil-/skrivförfrågningar kräver aktuell sessionstoken. Företagsbyte laddar rätt arkiv och avvisar gamla skrivsessioner. Asynkron filinläsning/nedladdning kontrollerar också att klientens företagssession inte bytts.

`src/desktop-archive.cjs` öppnar en validerad arkivpost efter kontroll av huvudfönstrets ursprung och aktuell token. En lokal temporär kopia får UUID-baserat namn och fast PDF/JPG/PNG-ändelse, och öppnas med `shell.openPath`. Ingen användarangiven sökväg eller exekverbar fil används. Temporärkataloger städas vid avslut så långt OS-filspärrar tillåter. Originalet i databasen påverkas inte av redigering i standardprogrammet. I webbläsaren hämtas originalet via autentiserad lokal begäran och Blob-nedladdning. Originalets hash kontrolleras före utlämning. Kopior öppnade i externa program ligger utanför appens sessions- och utskriftskontroll.

Bokslutets källfingeravtryck inkluderar originalens identitet/checksumma/metadata och kopplingshistorikens aktuella rader, utan att läsa hela BLOB:ar vid varje avstämning. Därmed kan även en orelaterad arkivändring kräva ny granskning. Bevarade bokslutsversioner innehåller `archiveManifest` med då aktiva kopplingar och originalens ID, filnamn, typ, storlek och hash. Originalbytes finns i samma företagsdatabas och säkerhetskopia, inte i JSON-underlaget. En fryst version ändras inte vid senare avaktivering av länkar.

Schema 10 tillför nya `archive_`-tabeller/index/triggers. Kompletta schema 4–9-säkerhetskopior valideras mot motsvarande äldre struktur och migreras vid öppning. Schema 10-import verifierar också originalens filformat, längd och SHA-256. Importgränsen höjs till 256 MiB med begränsad JSON-förfrågan. Alla register/original/historik följer SQLite-säkerhetskopian, men externa filer som endast nämns med sökväg gör det inte. Arkivet är ingen fullständig arkivplan eller garanti för bokföringslagens alla bevarandekrav.

## SIE 4 i 0.19

`src/sie-format.cjs` och `src/sie-codec.cjs` hanterar ett begränsat SIE 4-flöde med PC8/CP437, strikt belopps-/datum-/postvalidering och CRC. `src/sie.cjs` hanterar förhandsgranskning, kontroll av företag/tomt målår, fingeravtryck, idempotent bekräftelse, originalfil och historik. `accounting.importSie` används inom importens gemensamma SQLite-transaktion och följer ordinarie bokföringsvalidering och årsskydd. Konton/IB/bokningar/importhistorik rullas tillbaka tillsammans vid fel.

Varje bokförd post lagrar lokal ansvarig och ny registreringstid, separat från ursprungliga SIE-identiteter och signaturer i `importSource`. `records.kind=sie_import` innehåller filnamn, base64-original, SHA-256, mappning och historik. Original hämtas med aktuell sessionstoken och följer säkerhetskopian. Import av enbart IB låser också företagets organisationsnummer via befintlig identitetskontroll. Schema 10 är oförändrat. Omfattning, källa, belopps-/filgränser och kända undantag finns i [SIE-underlaget](docs/SIE_STOD.md). Detta är inte certifiering eller ett fullständigt register-/arkivutbyte.

## Bankavstämning (0.20.0)

`src/bank-file.cjs` validerar CSV och `src/bank.cjs` kopplar kontoutdrag till befintliga bokföringsrader. `bank_statement`, `bank_event` och `bank_snapshot` ligger i befintliga `records` (schema 10). Originalfil med SHA-256, importinställningar, matchningar, orsaker och bevarade avstämningar följer säkerhetskopian. Återläsning kontrollerar originalets hash och omtolkade rader. Företagsidentiteten skyddas även efter bankimport.

Import och matchning ändrar inte huvudbok eller reskontra. Periodöverlapp och dubbel användning av bokföringsrader stoppas. Slutförande kräver hanterade rader och överensstämmande ingående/utgående saldon. Ändrade underlag eller programversion markeras för ny granskning; äldre snapshots behålls. Ansvarig är lokalt angiven, inte autentiserad. Se [Bankavstämning](docs/BANKAVSTAMNING.md) för format, arbetsgång och begränsningar.


## Automatisk säkerhetskopiering (0.21.0)

`src/auto-backup.cjs` hanterar kopior per företagsdatabas. Lokala inställningar/status i `automatic-backup.json` ingår inte i databasexport/import. Aktivering kräver val av katalog och godkännande av okrypterade kopior. Schemat kontrolleras vid start och varje minut för det aktiva företaget; normalt avslut och företagsbyte kan också ta kopia. Inaktiva företag kopieras vid nästa öppning om deras dagliga kopia då är försenad.

Snapshot med `VACUUM INTO` inkluderar committad WAL-data. Temporär fil synkas och valideras före slutligt namn och rotation. SHA-256 registreras; senaste kopian kan kontrolleras igen. Rotation omfattar endast företagets egna automatiska filnamn i dess aktuella undermapp och påverkar inte säkerhetskopior före import. Gräns 256 MiB följer återställningsflödet. Ingen SQL-migrering behövs. Kontroll av uppladdad säkerhetskopia använder samma validering som import, utan att skapa förberedd import eller ersätta arbetsdata. Se [Säkerhetskopiering](docs/SAKERHETSKOPIERING.md) för drift, begränsningar och återställning.


## Offerter, kundorder och leveranser (0.22.0)

`src/trade.cjs` sparar offerter, kundorder, leveranser, fakturaunderlag, nummerserier och händelser i befintliga `records` (`trade_*`), separat per företagsdatabas. Schema 10 är oförändrat. Utfärdad offert och bekräftad order låses genom applikationens tillståndskontroller; de är inte bokföringsverifikationer. Löpande OF/KO/UL/FU-serier förbrukas atomiskt och återanvänds inte vid avbrott. Ansvarig är lokalt angiven, inte autentiserad.

Kundaccept kopplar en offert till en bekräftad order en gång. Registrerad leverans för lagerförd artikel skapar `inventory_movements` med `source_kind=trade_delivery` i samma transaktion. Återtagning skapar motsatt rörelse (`trade_delivery_reverse`) och bevarar original. Negativa saldon och tidigare inventeringar kontrolleras av lagermodulen. Ingen reservation eller automatisk lagerbokföring görs.

Valda hela leveranser knyts till ett fakturaunderlag och ett utkast. Ett öppet utkast per order förhindrar senare underlag innan utfärdande eller återtagning. Kumulativ proportionering av ursprungsradens belopp och moms i heltalsören gör att delfakturorna summerar till ordern. `sales.cjs` kontrollerar de kopplade beloppen vid utfärdande; rader/kund skyddas också vid utkastredigering. Datum, förfallodatum och anteckning kan ändras. `tradeSource` följer med till den låsta kundfakturan. Bokföring skapas först genom vanligt utfärdande, inte vid offert, order, leverans eller överföring.

FU-återtagning före utfärdande tar bort utkastet och frigör leveranser atomiskt med orsak. Utfärdad faktura, kredit och bokföringsmotbokning frigör inte orderantal automatiskt. Dokumenten och händelserna följer säkerhetskopian. Utskriftshistoriken stöder `sales_quote`, `customer_order` och `delivery_note`. Se [Offerter och kundorder](docs/OFFERTER_KUNDORDER.md) för arbetsgång och begränsningar.


## Valuta i försäljningen (0.23.0)

`src/currency.cjs` stöder SEK/EUR/USD med kurs i miljondelar av SEK, manuellt kursdatum och källa. `domain.invoice` skapar dokumentvalutans belopp och separat `sek`-underlag. Valet ändrar inte momsbehandling eller bokföringsvaluta. Befintliga SEK-data behåller tidigare betydelse; inga SQL-tabeller eller schemaversioner ändras.

Utfärdande låser `currency`, `fx` och `sek`. `sales.cjs` bokför från SEK-raderna. Delbetalningar sparar reglerat valutabelopp, faktiskt bankbelopp i SEK och reglerat historiskt bokföringsvärde. Skillnaden balanseras normalt på 3960/7960. Motbokning återtar exakt ursprunglig betalningsverifikation och dess reskontrapåverkan. Krediter proportionerar både originalets valuta- och SEK-rader; kvittning bevarar respektive dokuments bokföringsvärde och balanserar eventuell andelsavrundning.

Orderflödet skyddar kommersiell valuta och priser, men fakturans kurs kan granskas separat i utkastet. Utskrifter visar dokumentvaluta och moms/kurs i SEK. Kundreskontrans sammanräkningar och analys använder sparade SEK-värden och kvarvarande bokföringsvärde. Ingen automatisk omvärdering till dags-/bokslutskurs görs. Bankavstämning förblir i SEK; bokförd valutabetalning matchas via sin SEK-bankrad. Säkerhetskopior inkluderar alla sparade kurs-/betalningsvärden. Se [Valuta](docs/VALUTA.md) för beräkningsregler och kvarstående begränsningar.


## Betalningspåminnelser (0.24.0)

`src/reminders.cjs` sparar frysta BP-underlag, separata tillägg, spärrar och händelser i befintliga `records` (`reminder_*`), utan schemaändring. En aktiv bokförd, förfallen kundfaktura med saldo krävs; spärr eller oreglerad kredit stoppar nya underlag. Skrivfri förhandsvisning innehåller en kontrollsumma för saldo, kontaktuppgifter, tillägg och ansvarig. Bevarande revaliderar underlaget atomiskt. Gammal databassession och fel revision avvisas.

Påminnelser skickas manuellt. Bevarat underlag, utskrift och registrerat utskick är separata tillstånd. Ett skickat underlag skrivs inte om. Senare ändrat fakturasaldo, kontaktuppgifter, spärr eller medfört tillägg ger ändringsvarning. Efterhandsregistrering av verkligt utskick efter ändring kräver bekräftelse/orsak. Oskickad påminnelse kan avbrytas med bevarad historik.

Ränta/avgift ändrar inte bokföring, moms eller fakturans kapitalreskontra. Separat hantering kräver manuell referens. Avgift begränsas till en per faktura och högst 60 SEK efter uttrycklig granskning. Ränta beräknas endast på kvarstående SEK-kapital efter senaste saldoändring/tidigare ränteperiod, med faktisk dagräkning/365 och granskade satser. Tidigare ränta på betalda belopp rekonstrueras inte. Källor och begränsningar finns i [Påminnelser](docs/PAMINNELSER.md). Inkassokrav och automatisk förseningsersättning ingår inte.

`payment_reminder` tillkommer som utskriftstyp. Frysta underlag, tillägg, spärrar, händelser och PDF-kopior följer säkerhetskopian. Sammanräknad kundreskontra/analys omfattar fortfarande fakturakapitalet och dess bokföringsvärde; det separata tilläggsregistret utgör inte bokförd reskontra.
