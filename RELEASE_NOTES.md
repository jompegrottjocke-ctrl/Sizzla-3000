Sizzla 3000 0.5.0 för Windows 11 (x64): säkerhetskopiering och läsbarhet.

- Ny flik **Säkerhet & säkerhetskopiering** på svenska och engelska.
- Export av hela databasen medan appen är öppen; lösenordskryptering är förvalt. Okrypterad SQLite-export kan också väljas.
- Import av krypterad eller okrypterad komplett kopia, med integritetskontroll och uttryckligt val att ersätta data vid nästa programstart. Importen kan avbrytas före omstart.
- Räddningskopior av tidigare data sparas i databasens katalog före bytet. Dessa kopior är okrypterade.
- Knapp för att öppna rätt datakatalog i Utforskaren.
- Programlås med lösenord, Ctrl + L och valbar automatisk låsning efter 5, 15 eller 30 minuter. Låset är **avstängt som standard**. När det är aktiverat låser det också vid Windowslåsning/viloläge och kräver lösenord vid start.
- Textstorlek 100–200 % och valbar fet text för hela appen, med sparade inställningar och anpassad layout.

Ladda ned installationsprogrammet under **Assets**.

**Stäng programmet och säkerhetskopiera hela datakatalogen före uppdateringen från en äldre version.** Tidigare uppgifter bevaras. Databasen är fortfarande schema 4, med en ny separat tabell för låsinställningar.

Krypterade säkerhetskopior kräver sitt lösenord. Programlåset krypterar inte den lokala databasen. Originaldokument utanför databasen ingår inte i exporten. Import ersätter hela databasen inklusive inställningar och programlåsets lösenord; importera bara betrodda egna kopior från samma databasstruktur (högst 64 MB). Ingen sammanslagning eller delimport ingår. Osparade ändringar försvinner vid låsning.

Inköpsflödet gäller vanliga svenska inköp i SEK enligt fakturametoden. Momsavdrag måste kontrolleras manuellt. Utländsk/omvänd moms, förskott, överbetalningar, bankfiler och automatisk lagerhantering ingår inte. Originalunderlag bevaras separat. Programmet skickar inga order, pengar eller deklarationer automatiskt.

Reskontran visar aktuell status och inkluderar godkända fakturor som ännu inte bokförts. Det är ingen historisk reskontrarapport. Gamla, redan bokförda fakturor ska inte bokföras igen vid migrering. Rättelse av en betalningsregistrering återtar ingen faktisk banköverföring.

Tidigare begränsningar kvarstår: kundfakturor är utkast, och lönehanteringen använder manuellt verifierade skattebelopp. Automatisk skatt, sjuk-/semesterregler, lönerättelser och AGI-inlämningsfil återstår. CSV är inte SIE eller deklarationsfil.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår.
