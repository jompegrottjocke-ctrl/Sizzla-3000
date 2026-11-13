Sizzla 3000 0.21.0 för Windows 11 (x64): automatisk säkerhetskopiering.

- Ny panel under Säkerhet & säkerhetskopiering, separat för varje företag och avstängd från början.
- Välj katalog, daglig kopiering och/eller kopiering vid avslut och företagsbyte.
- Behåll 2–100 automatiska kopior. Äldre kopior rensas först efter en ny kontrollerad kopia; andra filer lämnas kvar.
- Se senaste lyckade kopia, senaste försök och felstatus. Kopiera direkt eller öppna målkatalogen från panelen.
- Kontrollera senaste kopian eller en valfri .sqlite/.sizzla utan att ersätta arbetsdatabasen eller förbereda import.
- Svenska och engelska, mörkt läge och stor text. Databasschema 10 är oförändrat.

Automatiska kopior sparas okrypterade efter uttryckligt godkännande. Manuell lösenordskrypterad export finns kvar. Schemat gäller aktivt företag medan programmet körs; avslutskopia kräver normalt avslut. Återställningsgränsen är 256 MiB. Kopieringsinställningar är lokala och följer inte med databasexport/import. Se docs/SAKERHETSKOPIERING.md.

Det här är en förhandsversion med osignerat installationsprogram. Ladda ned installationsfilen under Assets.
