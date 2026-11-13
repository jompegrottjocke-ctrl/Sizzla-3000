# Bankimport och avstämning

Version 0.20.0. Öppna **Betalningar → Bank & avstämning**. Funktionen jämför ett sparat kontoutdrag med befintlig bokföring. Den ansluter inte till banken, skickar inte betalningar och skapar inte verifikationer.

## Importera

1. Välj ansvarig och kontrollera företagets namn och organisationsnummer.
2. Välj en CSV-fil i UTF-8 eller Windows-1252, högst 5 MiB och 5 000 rader. Första raden ska innehålla kolumnrubriker. Semikolon, komma och tabulator stöds som avgränsare.
3. Välj räkenskapsår, aktivt likvidkonto i klass 19 och hela utdragets period, även dagar utan transaktioner. Ange bankens verkliga ingående och utgående saldo.
4. Koppla kolumner för datum, belopp med tecken och beskrivning. Saldo efter transaktion och referens är valfria. Välj datumformat, decimaltecken och radordning. Uttag ska ha negativt belopp; belopp får ha högst två decimaler.
5. Granska förhandsvisningen och rätta alla fel. Bekräfta företagets organisationsnummer och granskningen för att spara.

Stödet gäller SEK. En generell CSV kan inte automatiskt bevisa vilket företag eller bankkonto den tillhör; kontrollera detta mot banken. Blandade valutor, separata debet-/kreditkolumner och andra bankformat som CAMT och MT940 stöds inte i detta steg. Datum ska ligga i perioden och följa vald ordning. Angivna radsaldon och slutsaldot kontrolleras mot transaktionerna. Samma fil och överlappande perioder på samma konto stoppas för utdrag som inte har avbrutits.

## Matcha och stäm av

Förslagen gäller bokföringsrader med exakt samma belopp. Datum används för sortering, inte som bevis för att transaktionen är rätt. Granska varje koppling. En bokföringsrad får bara användas en gång. Matchningen är en avstämningsuppgift och påverkar inte bokföring eller reskontra.

Bokförda kund- och leverantörsbetalningar kan visa länk till fakturan. Obetalda fakturor med samma återstående belopp visas som möjliga underlag: registrera först betalningen i det vanliga fakturaflödet med rätt konto och datum och uppdatera sedan avstämningen. Delbetalningar, nettobelopp och samlingsbetalningar behöver hanteras manuellt i de vanliga vyerna; ingen automatisk uppdelning görs här.

Nollrader är information. En verklig originalverifikation och dess motbokning kan hanteras som ett internt par, med kommentar, när de tar ut varandra utan motsvarande bankrörelse. Detta ändrar inte verifikationerna.

En avstämd version kan bevaras först när alla beloppsrader och bokföringsrader är hanterade samt både ingående och utgående saldo överensstämmer. Ändrad bokföring, företagsinformation eller programversion kan kräva ny granskning. Tidigare bevarade versioner skrivs inte över. Återupptagen granskning, borttagen matchning och avbrutet utdrag kräver orsak. Ett avstämt utdrag måste öppnas för ny granskning innan det kan avbrytas. Avbrutet utdrag och historik finns kvar; perioden frigörs för en korrekt ersättningsimport.

## Lagring och gränser

Originalfil, SHA-256, importinställningar och rader sparas i företagets databas. Originalet kan hämtas och en bevarad avstämning exporteras som JSON. Underlagen följer databasens säkerhetskopia. Vid återläsning kontrolleras originalfilens hash och att filen ger samma importerade rader.

`bank_statement`, `bank_event` och `bank_snapshot` lagras i befintliga `records`; databasschema 10 är oförändrat. Händelser sparar ansvarig, tidpunkt och åtgärd. Vyn visar de senaste 100 händelserna, medan äldre historik bevaras i databasen. Ansvarig är en lokalt angiven uppgift, inte en autentiserad identitet. Gamla skrivförfrågningar efter databasbyte och samtidiga ändringar av samma utdrag avvisas.

Ta säkerhetskopia och följ företagets rutiner för avstämning och underlagsförvaring. Funktionen är inte en bankbekräftelse eller en garanti om fullständig regelefterlevnad.
