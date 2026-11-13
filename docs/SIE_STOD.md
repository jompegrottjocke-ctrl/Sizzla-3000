# SIE 4 – källor, omfattning och kontroll

Infört i Sizzla 3000 0.19.0, schema 10. Granskat 2026-11-13.

## Källor

- **SIE File Format, Version 4B, 30 September 2008**, SIE-Gruppen, 39 sidor. Officiell webbplats: <https://sie.se/>. Direktåtkomst till sie.se nekades av miljöns nätverkspolicy; ingen kontroll av senare publiceringar eller godkännandestatus har kunnat göras där.
- En kopia av specifikationen lästes från [solidfox/sie-parser](https://github.com/solidfox/sie-parser/blob/83e2b4fa4f4756ac6f151da5f31b7f3ceec4ddf0/SIE4%20spec/SIE_filformat_ver_4B_ENGLISH.pdf), commit `83e2b4fa4f4756ac6f151da5f31b7f3ceec4ddf0`. PDF-SHA-256: `e3ceda54c4675a1f4970f426249dc0606acb142b82c316c2748ac7094653840f`. Kopian har inte återpublicerats i detta repo och är inte bevis för att den är den senast publicerade versionen.
- Relevanta avsnitt: filstruktur/tecken/belopp på s. 8–9, obligatoriska poster på s. 10–11, CRC på s. 18–19, PC8 på s. 24, KTYP på s. 27, transaktioner och rättelser på s. 33–36, VER på s. 37.
- Oberoende kontroll: checksummealgoritmen gav `3130188017`, samma som i den publicerade exempelfilen `Norstedts%20Revision%20SIE%201.SE` i [idstam/jsisie](https://github.com/idstam/jsisie/tree/master/sie_test_files). Detta verifierar CRC mot en extern fil; det innebär inte stöd för SIE 1-import.
- En genererad SIE 4-fil lästes också med solidfox-parsern: svenska tecken, två konton, två transaktionsrader, debet/kredit 100,01 och motsvarande UB/RES kunde läsas. Det är en begränsad interoperabilitetskontroll, inte full semantisk validering eller certifiering. Kontotyper styrs av specifikationens T/S/K/I och Sizzlas egen modell; inte av parserbibliotekets interna klassnamn.

## Produktomfattning

SIE 4 med PC8/CP437 och SEK. Export sker för valt år med kontodeklarationer, explicit KTYP, IB/UB/RES, alla bokförda verifikationer och frivillig CRC-kontrollsumma. Direkt föregående års jämförelsebalanser tas med när det året finns i databasen. Nollbeloppssaldon får utelämnas enligt specifikationen. Utkast ingår inte. Export av konto-/företags-/verifikationstexter med tecken som inte finns i CP437 stoppas; tecken byts inte tyst ut.

Importen är avsedd för kontrollerad överföring till ett **tomt, öppet målår**. Den sammanfogar inte filer med befintliga poster. Aktuellt organisationsnummer måste finnas i filen och stämma med företaget. Eventuellt deklarerat aktuellt år ska stämma exakt med målåret; verifikationerna måste ligga inom året. Målåret ska sakna IB, periodlås, utkast och bokförda poster och får inte ha låst IB. Lokalt angiven ansvarig krävs. Efter granskning anges organisationsnumret igen och import/bokföring godkänns uttryckligen.

Befintliga kontonamn skrivs inte över; namnkonflikter visas före import. Saknade deklarerade konton kan läggas till. Okända/inaktiva konton och KTYP som inte överensstämmer med den kontoklassning Sizzla stöder ger stopp. Kontonummer är fyra siffror i klass 1–8. Belopp är heltalsören med högst två decimaler och högst 100 miljarder öre per fält; kontroll sker även mot osäkra heltal vid summering. Högst 5 MiB, 100 000 filrader och 5 000 verifikationer stöds.

Bokföring, IB och nya konton sparas i en transaktion. Alla verifikationer måste balansera. Angivna aktuella UB/RES kontrolleras mot beräknade saldon. Frivillig CRC verifieras när den finns. En SHA-256 identifierar originalfilen. Filhash, tomt målår och idempotent bekräftelse hindrar normal dubbelimport. Ändrade affärsdata eller annan ansvarig efter förhandsgranskningen kräver ny granskning. Förhandsgranskningar är lokala, begränsade och löper ut efter tio minuter.

Importen tilldelar nya lokala A-nummer. Ursprunglig serie/nummer, registreringsdatum/signatur och raders signaturer bevaras i `importSource` och hela originalfilen. Extern signatur behandlas inte som en verifierad Sizzla-operatör. Filen ändras inte till FLAGGA 1 på användarens dator; den lokala dubblettkontrollen använder filhash och målårets tillstånd. Den ursprungliga filen kan hämtas från importhistoriken eller en importerad verifikationsvy.

## Begränsningar

- Ingen SIE-certifiering, SIE-logotyp eller fullständigt stöd för alla giltiga SIE-filer påstås.
- SIE 1–3, SIE 5/XML, objektdimensioner/-saldon, period-/budgetposter, kvantiteter, avvikande rad-/verifikationsdatum och RTRANS/BTRANS stoppas. Dessa bokföringspåverkande uppgifter ska inte tappas genom tyst förenkling.
- Identifierade administrativa poster som PROSA, FTYP, FNR, BKOD, ADRESS, TAXAR, OMFATTN, KPTYP och SRU importeras inte till separata register. Etiketterna redovisas vid granskning och innehållet finns i originalfilen. Tidigare års saldon skapar inte nya målår.
- Importen skapar inte kunder, reskontra, löner, lagerposter, tillgångar eller dokumentkopplingar. Bokföringskonton med kund-/leverantörssaldon behöver separat reskontraöverföring och avstämning. Ingen betalning eller myndighetsinlämning sker.
- Rättelser görs med nya motbokningar enligt ordinarie bokföring. Importerade låsta poster kan inte raderas; ta säkerhetskopia före import.
- Export/import är utbyte av bokföring, inte en fullständig programbackup. Använd ordinarie säkerhetskopiering för hela företagsdatabasen.

## Verifikation och bevarande

Automatiska prov täcker CP437, svenska tecken och citat, CRC och ändrade bytes, belopps-/datum-/balansfel, konton och öppningsbalanser, företag/år, dubbletter, oförändrad databas efter förhandsgranskning, ändrat underlag, återförsök, transaktionsrollback, export, källfilshämtning, företagsbyte och återställning.

`records.kind=sie_import` bevarar originalfilens bytes som base64, filnamn/hash, ansvarig/tid, målår, programversion och mappning från ursprungliga identiteter till lokala verifikationer. Gränssnittet visar senaste 50 importomgångarna. Alla omgångar finns i databasen och dess backup. `ledger_events` dokumenterar konton/IB/importerade bokningar och kopplingen till importomgången. Inga nya SQL-tabeller införs; schema 10 är oförändrat.
