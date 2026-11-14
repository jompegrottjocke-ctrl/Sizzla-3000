# Formulärgranskning 2026-11-14

Version 0.28.1. Granskningen fokuserade på att nå inmatningsfält, fylla i uppgifter, spara och behålla korrekta granskningsmarkeringar. Separata testdatabaser användes.

## Hittade och rättade fel

| Fel | Följd | Rättning |
| --- | --- | --- |
| Flera redigeringsdialoger skalade sin maximala bredd/höjd med textförstoringen utan att ta hänsyn till den fysiska fönsterstorleken. | Vid 200 % kunde bland annat kund-, artikel-, leverantörs-, projekt-, bokförings- och lagerdialoger bli bredare/högre än fönstret. Fält och Spara hamnade utanför bilden. | Alla redigeringsdialoger får skalningsanpassade gränser, fast rubrik/åtgärdsrad och en separat rullbar innehållsdel. |
| Klistrad åtgärdsrad kunde täcka de sista fälten i längre formulär även vid normal textstorlek. | Bland annat projektbudget/anteckning, leverantörsanteckning och delar av inköpsrader gick inte att klicka på där de visades. | Åtgärdsraden ligger utanför den rullbara innehållsdelen. Fälten kan rullas fram utan att täckas av knapparna. |
| Företagets tekniska versionsmarkering låg i samma objekt som de affärsuppgifter lönekörningen jämförde. | Ett oförändrat företag kunde tolkas som ändrat när ett sparat löneutkast öppnades. Skatte-/avgiftsgranskningen nollställdes då i onödan. | Versionsmarkeringen ligger separat som `companyVersion`. Versionskontrollen vid sparande av företagsuppgifter finns kvar. |
| Alla inmatningar i lönekörningsformuläret återställde granskningsmarkeringar, även den allmänna anteckningen. | En anteckningsändring kunde kräva onödig ny skatte-/avgiftsgranskning. | Enbart ändrad allmän anteckning behåller markeringarna. Belopp, löneunderlag, anställd eller företagsuppgifter som ändrats kräver fortfarande ny granskning. |

## Kontroller

En layoutgenomgång öppnade 16 formulärtyper med samtliga fem textstorlekar (100, 125, 150, 175 och 200 %) på både svenska och engelska: **160 kombinationer**. Fönsterstorleken var 1024 × 700, nära skrivbordsappens minsta storlek. Kontroll gjordes av dialogens läge samt att synliga aktiva fält och sparknappar kunde rullas fram och träffas med pekaren. Efter rättningen passerade samtliga kombinationer utan JavaScript-fel.

Formulärtyper: kund, artikel, fakturautkast, anställd, projekt, leverantör, inköpsorder, leverantörsfaktura, räkenskapsår, konto, verifikationsutkast, lagerinställningar, inventering, anläggningstillgång, offert och återkommande fakturamall.

Nya bestående gränssnittstester i `tests/ui/x-form-audit.spec.cjs` fyller i och sparar kund, artikel med streckkod, leverantör med noll betalningsdagar, projektbudget/anteckning, räkenskapsår, verifikationsutkast, lagerplats, inköpsorder och leverantörsfaktura vid 200 % textstorlek. De klickar på fälten, kontrollerar att sparknappen är inom bilden och verifierar sparade uppgifter. Kunduppgifterna kontrolleras även efter omladdning.

Lönetestet öppnar ett granskat utkast, sparar enbart en ändrad anteckning och öppnar igen. Markeringarna ska finnas kvar. Ändrat lönebelopp respektive ändrade företagsuppgifter ska däremot återställa dem. Inga löner betalas eller bokförs av detta test.

Det befintliga tidstestet har också fått ett uttryckligt projektval så att det fungerar när databasen innehåller flera projekt. Omladdningstestet väntar på att appen är inläst innan det kontrollerar uppgifterna.

Hela enhets-/gränssnittssviten och Electron-testet körs dessutom. Electron omfattar bland annat start, inmatning, native-funktioner, utskrift/PDF, separata fönster, samtidiga ändringar och företagsbyte. Windowsbygget kör samma ordinarie testflöden i GitHub Actions.

Detta är en riktad granskning med syntetiska uppgifter, inte ett bevis på att alla möjliga formulärkombinationer eller verksamhetsregler är felfria. Avsiktligt avstängda betafunktioner har inte behandlats som sparfel. Ingen ändring av databasschema, sparade affärsuppgifter eller backupformat behövs för rättningarna.
