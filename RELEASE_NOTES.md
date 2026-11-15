Sizzla 3000 0.29.8 – mindre inläsningar för Tid & projekt.

- Projektlistan hämtar projekt och summerade timmar utan hela tidsregistret. Budgetutfall och sammanfattningar behåller samma betydelse.
- Tidslistan hämtar hela urvalet för valt projekt och datumintervall. Status, sökning, CSV och utskrift använder hela detta urval oberoende av listsida.
- Fakturaunderlagens listvy hämtar huvuden med aktuella fakturakopplingar. Detaljer, redigerare, fakturering och återtag använder fullständiga underlag där de behövs.
- Befintliga gransknings- och revisionskontroller behålls. Osparad text bevaras när ett projekt hunnit ändras i en annan redigering.
- Projektlistans JSON-svar är cirka 99,8 procent mindre än hela företagsvyn på den stora syntetiska databasen med 150 projekt och 6 000 tidsrader. Detta mäter datamängd, inte utlovad uppstartstid.

Se docs/TID-PROJEKT-DATA.md. Schema 10 och säkerhetskopieformat är oförändrade.

Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
