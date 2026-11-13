Sizzla 3000 0.20.0 för Windows 11 (x64): bankimport och avstämning.

- Ny del under Betalningar: Bank & avstämning, på svenska och engelska.
- Importera kontoutdrag i CSV, välj kolumner och kontrollera period, belopp och saldon före import.
- Granska matchningar mot befintlig bokföring och öppna kopplade kund- eller leverantörsfakturor.
- Bevara avstämda versioner, originalfil och historik. Tidigare versioner finns kvar vid ny granskning.
- Dubbletter, överlappande perioder och återanvända bokföringsrader stoppas. Underlag följer företagets säkerhetskopia.
- Rättat Windows-testets fel ”require is not defined”: filen läses nu i Node-testprocessen i stället för inne i Electron-utvärderingen.

Första bankstödet gäller SEK och CSV, högst 5 MiB och 5 000 rader. Importen utför inga bankbetalningar och skapar ingen bokföring. Matchning granskas rad för rad; automatisk uppdelning av samlingsbetalningar ingår inte. Se docs/BANKAVSTAMNING.md för arbetsgång och begränsningar. Databasschema 10 är oförändrat.

Det här är en förhandsversion med osignerat installationsprogram. Ladda ned installationsfilen under Assets.
