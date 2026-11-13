# Sizzla 3000 – systemöversikt och kvarstående krav

Version 0.11.1, databasschema 8. Uppdaterad 2026-11-13.

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
