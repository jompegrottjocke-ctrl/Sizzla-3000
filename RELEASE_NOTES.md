Sizzla 3000 0.24.1 för Windows 11 (x64): stabilare Windows-tester och tydligare byggloggar.

- Återställningstestet för äldre lagerdatabaser använder nya HTTP-anslutningar för att undvika återanvändning av en anslutning som hunnit stängas under databasbearbetning.
- Testfiler körs i turordning för att minska konkurrerande SQLite-/diskarbete på Windows-runnaren.
- GitHub-annoteringar visar det faktiska testfelet först. Hela testloggen sparas som Sizzla-unit-test-log vid fel.

Funktionerna från 0.24.0 finns kvar: Betalningar → Påminnelser med granskade PDF-underlag, utskickshistorik och spärr för bestridda fakturor. Ränta och avgift hanteras separat och bokförs inte automatiskt. Se docs/PAMINNELSER.md för omfattning. Databasschema 10 är oförändrat.

Det här är en förhandsversion med osignerat installationsprogram. Ladda ned installationsfilen under Assets.
