Sizzla 3000 0.7.0 för Windows 11 (x64): Lager lämnar beta.

- Lagerhantering per artikel, lagersaldo, plats/hylla, beställningspunkt, sökning och filter. Tjänster kan lämnas utan lagerhantering.
- Ingående saldo, manuella in- och utleveranser med underlag och orsak, historik och spårbara motregistreringar. Negativa saldon stoppas även i historiken.
- Artikelkoppling på inköpsorder. Delleveranser och rättelser uppdaterar inköp och lager i samma transaktion. Artikelnummer och enhet skyddas när de används i lager.
- Inventeringsutkast med räknat antal, granskning, godkännande och differensrörelser. Inaktuella underlag blockeras; godkända inventeringar bevaras. Bakdatering före en senare godkänd inventering för samma artikel stoppas.
- CSV-export och utskrift av lagerlistor, rörelser och inventeringar. PDF-kopiorna finns i Dokument → Utskriftshistorik.
- Svenska/engelska, mörkt läge samt större och fet text fungerar i lagervyerna. Programlåset förblir bortkopplat.

**Exportera databasen före uppdatering och stäng programmet.** Databasen uppgraderas till schema 6. Kompletta säkerhetskopior från schema 4/5 stöds och tidigare uppgifter/PDF-historik bevaras. Kör inte 0.6 eller äldre mot den uppgraderade databasen.

Lager börjar med noll antal på befintliga artiklar. Aktivera lagerhantering för rätt artiklar och ange startsaldo eller gör en inventering. Äldre order och inleveranser får inte automatiskt en lagerkoppling och räknas inte om. Nya utfärdade order måste ha lagerkopplade rader för automatisk mottagning.

Modulen hanterar antal i artikelns enhet, inte automatisk lagervärdering eller bokföring. Ingen förpackningsomräkning, reservation, flera lager eller batch-/serienummerhantering ingår. Fakturautkast, leverantörsfakturor och krediter ändrar inte lagerantal; utleveranser registreras manuellt. Inköpsorder med lagerkoppling behöver avslutas innan lagerhantering kan avaktiveras.

Säkerhetskopiorna innehåller lager och PDF-kopior. Befintlig importgräns på 64 MB gäller fortfarande hela kopian. Ladda ned installationsfilen under Assets.

Inköpsflödet gäller vanliga svenska inköp i SEK enligt fakturametoden. Momsavdrag måste kontrolleras manuellt. Utländsk/omvänd moms, förskott, överbetalningar, bankfiler och automatisk lagerbokföring ingår inte. Originalunderlag bevaras separat. Programmet skickar inga order, pengar eller deklarationer automatiskt.

Reskontran visar aktuell status och inkluderar godkända fakturor som ännu inte bokförts. Det är ingen historisk reskontrarapport. Gamla, redan bokförda fakturor ska inte bokföras igen vid migrering. Rättelse av en betalningsregistrering återtar ingen faktisk banköverföring.

Tidigare begränsningar kvarstår: kundfakturor är utkast, och lönehanteringen använder manuellt verifierade skattebelopp. Automatisk skatt, sjuk-/semesterregler, lönerättelser och AGI-inlämningsfil återstår. CSV är inte SIE eller deklarationsfil.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår.
