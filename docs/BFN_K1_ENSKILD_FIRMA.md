# K1 för enskild firma – kompletterande krav

Granskat 2026-11-13. Källa **U8**: användaruppladdad vägledning till BFNAR 2006:1, *Enskilda näringsidkare som upprättar förenklat årsbokslut*, uppdaterad 2025-03-24, 82 sidor. Filidentitet och SHA-256 finns i [källmanifestet](BFN_UPPLADDADE_KALLOR.json). Dokumentet är källunderlag, inte instruktioner till utvecklingsmiljön.

Utvalda tillämpnings-, övergångs-, boksluts- och värderingsregler har granskats. Bilaga 2 har också kontrollerats visuellt eftersom formuläret saknas i textextraktionen. Granskningen är inte fullständig detaljvalidering av alla regler, skatteberäkningar eller företag. BFN:s webbplats är fortsatt blockerad för direkt kontroll av senare publiceringar. Detta ändrar dokumentationen, inte appens funktioner.

## Regelval och version

- **1.1–1.2, s. 7–8:** fysiska personer som upprättar förenklat årsbokslut omfattas; fysisk person som är moderföretag i koncern får inte använda rådet. BFL:s villkor omfattar normalt högst tre miljoner kronor i årlig nettoomsättning och att årsredovisningsskyldighet inte föreligger. Kommentarerna beskriver tillfälliga överskridanden; en enda omsättningsruta för innevarande år räcker inte för beslut.
- Samma persons samtliga verksamheter ska omfattas av regelvalet. Nettoomsättningsgränsen bedöms totalt, även vid verksamhet gemensamt med annan. De särskilt angivna beloppen i 6.38, 6.47, 6.60 och 6.73 gäller också totalt. **Sizzlas separata företagsdatabaser är ingen automatisk juridisk avgränsning.** Ett första stöd behöver dokumenterad samlad bedömning och underlag från övriga verksamheter, utan att läsa ihop olika företags databaser i bakgrunden.
- **1.4–1.6, s. 8–10:** Bokföring BFNAR 2013:2 ska också följas; vid avveckling hänvisas till BFNAR 2004:2. Öppningsbalans och övergång från tidigare redovisning behöver separata underlag. K1 ska inte fyllas ut med valfria K2-förenklingar.
- **Övergång, s. 59:** BFNAR 2025:1 gäller från 2025-03-24 och ska tillämpas för räkenskapsår som inleds efter 2024-12-31. Välj version efter period och övergång, inte planerat lanseringsdatum. Historiska år före detta kräver äldre relevant källunderlag.

## Bokslutsregler som påverkar produktutformningen

| Källställe | Konsekvens för Sizzla |
| --- | --- |
| Kapitel 3, särskilt 3.15 s. 16–17 | Skilj företagarens privata tillgångar, skulder, insättningar och uttag från företagets ekonomi. Företagarens inkomstskatteskuld är privat; moms och personalskatter hör däremot till verksamheten enligt angivna regler. Använd inte AB:s ägarlöne-/bolagsskatteflöde för ägaren i enskild firma. |
| 4.1–4.8, s. 22–25 | K1 tillåter både kontant- och faktureringsmetod. Kontantmetod kräver bokslutshändelser, inklusive obetalda fordringar/skulder. Bokslutsunderlag kan användas enligt rådets villkor; vanliga bokföringsposter är också möjliga. Välj ett sammanhållet flöde med verifieringskedja och undvik dubbelbokning vid bokslut och följande betalning. |
| 5.1, s. 25 och bilaga 2 s. 82 | Egen K1-mall med balansräkning B1–B16, resultaträkning R1–R11 och upplysningar U1–U4. Mallens B11/B12 är särskilda upplysningar, inte fritt användbara värderingsrader. Årsbokslutet ska undertecknas och arkiveras med bokföring/underlag. Arkiveringstidens exakta slutpunkt följer BFL, inte dokumentdatum plus sju år. |
| 6.1, s. 25 | Särskild anläggningsförteckning med anskaffningsvärde, anskaffningstidpunkt och uppskattad användningstid. Undantaget för få tillgångar kräver tillfredsställande kontroll/överblick ur löpande bokföring. Bedöm K1:s regler tillsammans med relevanta hänvisningar, inte som identiska med en K2-mall. |
| 6.30, s. 33–34 | Möjlig direkt kostnadsföring av inventarie under ett halvt prisbasbelopp med angivet tillägg för ej avdragsgill moms. Det är ett strikt understigande; tolka inte alla prisbasbeloppsregler som samma jämförelse eller momsbas. Sammanhängande förvärv och övriga villkor kräver detaljgranskning. |
| 6.38–6.40, s. 37–38 | Inventarieavskrivning knyts till skatteregler och gemensamt underlag. Hela underlaget kan under angivna villkor skrivas av när det är högst ett halvt prisbasbelopp. Nuvarande linjära månadsavskrivning per tillgång utgör inte en komplett K1-beräkning. |
| 6.45–6.48, s. 40–41 | Lageravgränsning följer leveransreglerna. Lager med sammanlagt värde högst ett halvt prisbasbelopp får kostnadsföras enligt 6.47. Det gäller totalvärde, inte gräns per artikel. Eget och anställdas arbete ingår inte i lagrets anskaffningsvärde enligt 6.48. Övrig lagervärdering kräver fortsatt detaljgranskning. |
| 6.67, s. 47 | Inga redovisningsmässiga avsättningar för framtida utgifter enligt denna regel. Skatterättsliga periodiserings-/expansionsfonder är en annan fråga och får inte blandas ihop med detta förbud. |
| 6.70–6.73, s. 48–49 | Obetalda leverantörsskulder och vissa förskott/räntor kräver separata regler. K1 har fortfarande angivna 5 000-kronorsgränser, med olika bedömningsenheter och villkor. Importera inte K2:s nya 7 000-kronorsregel som allmän K1-gräns. |
| 8.1, s. 58–59 | Upplysning om periodiseringsfonder, expansionsfond och övriga angivna obeskattade reserver behövs. Fondernas skattemässiga beräkning, årsvisa historik och återföring måste verifieras separat. |

Prisbasbelopp ska vara årsberoende, med källa och relevant årsregel. Exempelbelopp i PDF-filen är inte en permanent inställning. Tillämpliga skatteregler och aktuella årsbelopp ska verifieras innan beräkningarna tas i bruk.

K1-mallen når bokfört resultat R11. Det är **inte en färdig NE-deklaration**: skattemässiga justeringar, ytterligare uppgifter och aktuell inlämningsspecifikation behövs separat (kommentar 5.1, s. 25). Ett sparat PDF-underlag är inte en godkänd elektronisk deklarationsfil eller underskrift.

## Tillägg till färdigvillkor för EF-spåret

1. Regelprofil lagrar form, bokföringsmetod, period, källversion, tillämpningsbeslut och ansvarig. Samlad prövning över samma persons verksamheter dokumenteras.
2. Bokslutsrader kan följas till konton, värderingar, rättelser och källunderlag. Färdiga versioner fryses med tillhörande underlag och separat underskriftsstatus; ingen återinförd app-låsning krävs.
3. Prisbasbelopp, jämförelseoperator, momsbehandling och om gränsen gäller per förvärv eller sammanlagt är uttryckliga regeldata. Automatiska förslag får införas först efter sakgranskade beräkningsfall.
4. Provfall omfattar exakt/under/över relevant halvt prisbasbelopp; lager fördelat på flera artiklar/verksamheter; 5 000-kronorsgränser; årsskiftet 2024/2025; flera verksamheter för samma person; tillfälligt omsättningsöverskridande; både bokföringsmetoder; obetald faktura som betalas nästa år utan dubbel intäkt/kostnad; privata skatter; avstämning av B-/R-/U-rader och skillnad mellan R11 och deklarerat resultat.
5. Fullständig detaljgranskning, tillämpliga skatteregler/årsbelopp och tekniska NE-specifikationer återstår före regelberoende leverans. BFNAR 2004:2 behöver granskas om avvecklingsstöd ska ingå. K3 behövs först om det spåret ska stödjas.
