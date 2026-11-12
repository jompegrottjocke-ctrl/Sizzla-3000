Sizzla 3000 0.10.0 för Windows 11 (x64): Tid & projekt lämnar beta.

- Projekt med kod, kund eller intern användning, status, standardtimpris/moms, datum och tidsbudget.
- Manuell tidsregistrering med person/anställd, arbetsdatum, decimaltimmar, beskrivning, timpris och debiterbar/ej debiterbar tid. Ingen framtida registrering; högst 24 timmar per registrerad person och dag.
- Granskning och låsning av godkänd tid. Makulering med orsak bevarar registreringen. Projektkod/kund skyddas efter första tidsregistreringen.
- Skapa ett fakturautkast från högst 100 godkända debiterbara tidsrader inom ett projekt. Samma rad kan inte överföras två gånger. Koppling och utkast sparas atomiskt.
- Fakturaunderlagets ursprungliga sammanställning bevaras även om utkastet redigeras. Öppna och granska fakturan i Fakturering för utfärdande/bokföring. Överföring av tid skickar ingen faktura och skapar ingen bokföring.
- Återta ett ej utfärdat fakturautkast med granskning och orsak: utkastet inklusive manuella ändringar raderas och timmarna frigörs, medan underlaget bevaras. Utfärdad tid frigörs inte automatiskt, heller inte vid kredit eller motbokning.
- Datum-/projekt-/statusfilter, textsökning, CSV, tidsrapporter och fakturaunderlag till utskrift/PDF med utskriftshistorik. Svenska/engelska, mörkt läge och textinställningar stöds.

**Exportera varje företagsdatabas före uppdatering och stäng appen.** Databasen uppgraderas till schema 8 när den öppnas. Kompletta kopior från schema 4/5/6/7 stöds; befintliga register, bokföring, lager och PDF-kopior bevaras. Kör inte 0.9 eller äldre mot uppgraderade databaser. Tidsuppgifter ingår i respektive företags säkerhetskopia. Högst 10 företagsdatabaser och en aktiv åt gången gäller fortsatt.

Tid anges i decimaltimmar: 1,50 = 1 timme 30 minuter. Hela tidsrader överförs; dela upp arbete i separata rader före godkännande om det ska faktureras vid olika tillfällen. Ingen timer, automatisk löneöverföring, OB-/övertidsberäkning, avtalskontroll, utlägg, projektkostnad eller vinstberäkning ingår. Tidsbudget är en jämförelse, inte ett hårt stopp.

Befintliga begränsningar kvarstår: vanliga svenska faktura-/inköpsflöden i SEK enligt fakturametoden, inga banköverföringar, ingen automatisk skatt eller AGI-inlämningsfil. Fullständig behandlingshistorik med identifierad operatör och övriga dokumenterade krav inför skarp bokföring återstår; se SYSTEMDOKUMENTATION.md. Säkerhetskopiors importgräns på 64 MB inklusive PDF-kopior gäller fortfarande; externa originalunderlag bevaras separat.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår. Ladda ned installationsfilen under Assets.
