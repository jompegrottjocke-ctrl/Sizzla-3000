Sizzla 3000 0.6.0 för Windows 11 (x64): utskriftshistorik.

- Dokument innehåller nu Utskriftshistorik med datum, typ, nummer, mottagare, status, sökning, filter och sidindelning. Övriga dokumentfunktioner är fortsatt beta.
- Utskriftsvyerna för fakturautkast, lönebesked, verifikationer, rapporter, inköpsorder och leverantörsfakturor sparar en oföränderlig PDF i databasen före utskriftsdialogen.
- Visa sparad PDF, spara den till fil, skriv ut samma kopia igen eller öppna det aktuella underlaget. Varje nytt försök ger en egen historikrad. Historiklänkar finns vid underlagen.
- Tydliga statusar för väntande dialog, accepterat utskriftsjobb, sparad PDF, avbrutet, misslyckat och okänt resultat efter omstart. Accepterat utskriftsjobb bevisar inte att papper kom ut.
- PDF-kopiorna ingår i säkerhetskopior. Import av kompletta schema 4-kopior från 0.5-serien stöds och uppgraderas till schema 5. Appens befintliga importgräns är 64 MB för hela kopian; varje PDF får vara högst 20 MB.
- Svenska/engelska, mörkt läge samt större och fet text fungerar även i historiken. Programlåset förblir bortkopplat.

**Stäng programmet och säkerhetskopiera datakatalogen före uppdatering.** Databasen uppgraderas till schema 5 och tidigare data bevaras. Kör inte 0.5 eller äldre mot den uppgraderade databasen.

Automatisk PDF-arkivering kräver skrivbordsappen. Utskrifter genom vanliga webbläsare eller PDF-visarens egna kontroller registreras inte. Historiken börjar efter uppdateringen, saknar raderingsfunktion och tillför ingen behörighetsgräns för personuppgifter. Löneutskrifter kan filtreras separat. Fysisk utskrift och skrivardrivrutiner behöver fortsatt kontrolleras på den egna skrivaren.

Ladda ned installationsfilen under Assets.

Inköpsflödet gäller vanliga svenska inköp i SEK enligt fakturametoden. Momsavdrag måste kontrolleras manuellt. Utländsk/omvänd moms, förskott, överbetalningar, bankfiler och automatisk lagerhantering ingår inte. Originalunderlag bevaras separat. Programmet skickar inga order, pengar eller deklarationer automatiskt.

Reskontran visar aktuell status och inkluderar godkända fakturor som ännu inte bokförts. Det är ingen historisk reskontrarapport. Gamla, redan bokförda fakturor ska inte bokföras igen vid migrering. Rättelse av en betalningsregistrering återtar ingen faktisk banköverföring.

Tidigare begränsningar kvarstår: kundfakturor är utkast, och lönehanteringen använder manuellt verifierade skattebelopp. Automatisk skatt, sjuk-/semesterregler, lönerättelser och AGI-inlämningsfil återstår. CSV är inte SIE eller deklarationsfil.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår.
