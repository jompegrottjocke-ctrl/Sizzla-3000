Sizzla 3000 0.29.7 – mindre inläsningar för Bokföring och rapporter.

- Verifikationslistan hämtar huvuden med belopp, status, revisioner och rättelsekopplingar. Rader hämtas när verifikationen öppnas.
- Rapportfliken hämtar bokförda poster från valt räkenskapsår till valt slutdatum. Tidigare poster behålls för rätt ingående saldo vid periodens start.
- Saldolista, resultat, balans och huvudbok behåller befintliga beräkningar. CSV och utskrift omfattar hela urvalet.
- Redigering, rättelser, lönebokföring, SIE och behandlingshistorik använder fullständiga underlag där de behövs.
- På den stora testdatabasen är verifikationslistans JSON-svar cirka 86 procent mindre än komplett företagsvy. Detta är ett mått på datamängd, inte utlovad uppstartstid.

Se docs/BOKFORING-DATA.md. Databasschema 10 och säkerhetskopieformat är oförändrade.

Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
