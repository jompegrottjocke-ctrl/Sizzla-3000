Sizzla 3000 0.8.0 för Windows 11 (x64): Fakturering och Betalningar.

- Utfärda och bokför kundfakturor med gemensam löpande nummerserie för fakturor och krediter. Startnummer väljs före första utfärdandet. Utfärdade uppgifter är låsta.
- Granskning av kund, företag, moms och konton. Fakturautskrift, momsspecifikation och oföränderliga PDF-kopior via utskriftshistoriken.
- Delbetalningar, kreditfakturor från originalets rader, kvittning mot ursprungsfakturan och registrering av faktiskt genomförda återbetalningar.
- Betalningar samlar kund- och leverantörsreskontra, betalningshistorik och kundhändelser. Sökning, filter och CSV-export.
- Registrering och bokföring sparas tillsammans. Spårbara motbokningar uppdaterar reskontran även från Bokföring. Återbokföring av ett oförändrat utfärdat underlag behåller fakturanumret.
- Svenska/engelska, mörkt läge och läsbarhetsinställningar stöds.

**Exportera hela databasen före uppdatering och stäng programmet.** Databasen uppgraderas till schema 7. Kompletta schema 4/5/6-kopior stöds; tidigare data, lager och PDF-kopior bevaras. Kör inte 0.7 eller äldre mot den uppgraderade databasen. Befintliga utkast utfärdas inte automatiskt.

Börja med fullständiga företags-/kundadresser, företagets momsregistreringsnummer vid momspliktig försäljning samt ett öppet räkenskapsår. Kontrollera tidigare fakturanummer innan första utfärdandet. Utfärdande skickar inte fakturan; spara PDF och leverera den själv.

Försäljning och inköp gäller vanliga svenska flöden i SEK enligt fakturametoden. Andra valutor, kontantmetod, utländsk/omvänd moms, förskott, överbetalningar, bankfiler och automatisk fakturaleverans ingår inte. Kvittning av kundkredit gäller dess egen ursprungsfaktura. Programmet genomför inga banköverföringar; en motbokning rättar bara registreringen.

Reskontrorna visar aktuell status, inte historiska saldon per valfritt datum. Leverantörsvyn inkluderar godkända ännu ej bokförda underlag. Kundfakturor vars bokning motbokats ligger kvar som utfärdade och markeras utan aktiv bokföring. Bokför inte redan bokförda äldre fakturor igen.

Kundfakturor och krediter uppdaterar inte lagerantal. Utleveranser registreras manuellt. Ingen automatisk lagervärdering/bokföring ingår. Säkerhetskopiornas befintliga importgräns på 64 MB gäller inklusive PDF-kopior. Originalunderlag utanför databasen måste bevaras separat.

Systemets uppbyggnad och kända luckor beskrivs i SYSTEMDOKUMENTATION.md. Historiken saknar identifierad användare vid rättelser och är inte en fullständig behandlingshistorik. Fullständigt stöd för skarp bokföring är ännu inte färdigt. Lönehanteringen kräver manuellt verifierade skattebelopp; automatisk skatt, sjuk-/semesterregler, lönerättelser och AGI-inlämningsfil återstår.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår. Ladda ned installationsfilen under Assets.
