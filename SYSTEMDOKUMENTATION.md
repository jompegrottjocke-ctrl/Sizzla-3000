# Sizzla 3000 – systemöversikt och kvarstående krav

Version 0.15.1, databasschema 8. Uppdaterad 2026-11-13.

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

Historiken är **inte en fullständig behandlingshistorik**. Ingen identifierad operatör sparas vid rättelser och ingen inloggning finns. Det saknas också en sammanhållen användarvy/export av alla historikdetaljer och all registerändring. Lokala SQL-skydd skyddar inte mot någon med full kontroll över databasfilen. Dessa begränsningar måste åtgärdas och verifieras innan stöd för full efterlevnad kan beskrivas som färdigt.

## Bevarande och återställning

Exportera varje företagsdatabas regelbundet, även före uppdatering. Export/import gäller bara aktiv databas. Databaslistan ingår inte i databasexporten; en manuell kopia av hela arbetsplatsen kräver stängd app och hela den ursprungliga datakatalogen med listan och alla underkataloger. Exporten omfattar register, bokföring, historik, inställningar och sparade PDF-kopior. Refererade originalfakturor, bankunderlag och andra filer utanför databasen ingår inte och måste bevaras separat med tydliga referenser. CSV är ett urval, inte en fullständig säkerhetskopia eller SIE-fil.

Krypterad export använder AES-256-GCM och scrypt. Själva arbetsdatabasen är inte applikationskrypterad. Skydda dator och kopior med åtkomstskydd och lämpligt diskskydd. Programlås ingår inte. Import av komplett kopia ersätter hela databasen vid nästa start; räddningskopior bevaras lokalt. Importgränsen är 64 MB inklusive PDF-kopior.

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
