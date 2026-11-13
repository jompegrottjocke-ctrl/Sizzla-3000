# Automatisk säkerhetskopiering och kontroll

Version 0.21.0, Windows 11. Öppna **Säkerhet & säkerhetskopiering** i den aktiva företagsdatabasen.

## Aktivera per företag

Automatisk kopiering är avstängd från början. Välj katalog med **Välj katalog…** i skrivbordsappen, eller skriv en fullständig sökväg. Välj dagligen, vid avslut/företagsbyte eller båda. Välj hur många kopior som ska bevaras: 2–100, normalt 10. Godkänn att kopiorna sparas okrypterade och spara inställningarna. **Säkerhetskopiera nu** skapar en första kopia direkt med de sparade inställningarna.

Kopian är en komplett `.sqlite` för det aktiva företaget, inklusive originalfiler i Dokument och bevarade utskrifter. Den är inte lösenordskrypterad. Skydda målkatalogen med operativsystemets behörigheter och lämplig diskkryptering. Manuell lösenordskrypterad export till `.sizzla` finns kvar. Lösenord sparas inte för automatisk kopiering.

Varje företagsdatabas får en egen `Sizzla-<id>`-undermapp i vald katalog. Kopieringsinställningar och senaste status ligger i `automatic-backup.json` bredvid respektive arbetsdatabas, utanför själva databasen. De följer inte med export/import; en återläst databas på en ny installation får inte automatiskt den gamla installationens sökvägar. Databaslistan och övriga företagsdatabaser ingår inte heller i en företagskopia.

Välj gärna en annan fysisk disk och ordna även oberoende kopior. En kopia på samma disk skyddar inte mot diskhaveri. Om målkatalogen försvinner återskapar den automatiska körningen inte denna; anslut disken och kontrollera sökvägen.

## När körs kopieringen?

Dagligen betyder 24 timmar efter senaste lyckade kopiering, även om den skapades med knappen. Kontroll sker när företaget öppnas och varje minut medan programmet körs. Ett inaktivt företag kopieras inte i bakgrunden. En försenad daglig kopia tas när företaget öppnas igen. Programmet behöver inte vara igång vid en viss klocktid.

Valet vid avslut tar kopia vid normalt programavslut och när man byter från företaget. Det körs inte vid strömavbrott eller tvångsavslut. Kopieringen kan göra avslut eller företagsbyte långsammare för stora databaser. Förberedd databasimport pausar automatisk kopiering tills importen tillämpats vid omstart eller avbrutits. De befintliga säkerhetskopiorna före import/omstart roteras inte av denna funktion.

## Status, kontroll och återställning

Panelen visar senaste försök, senaste lyckade kopia, fil och katalog. Status uppdateras i bakgrunden var 30:e sekund när sidan finns öppen samt när fönstret blir synligt; **Uppdatera status** hämtar direkt. Fel ger även en knapp högst upp i appen. Misslyckad kopiering vid avslut visar ett meddelande i skrivbordsappen. Felstatus sparas lokalt om disken tillåter det.

**Kontrollera senaste kopian** kontrollerar dess SHA-256 mot den registrerade kopian och granskar databasen. **Kontrollera säkerhetskopia** kan i stället läsa en valfri `.sqlite` eller lösenordskrypterad `.sizzla`. Dessa kontroller ändrar inte arbetsdatabasen och förbereder ingen import. De kontrollerar integritet, struktur, främmande nycklar, JSON-data och befintliga kontroller för dokument och bankoriginal. De garanterar inte att bokföringen är sakligt korrekt och ersätter inte en provåterställning.

Återställning sker uttryckligen genom **Importera databas**, med bekräftelse och omstart. Gör gärna en provåterställning i en separat testinstallation och granska uppgifterna. Storleksgränsen är 256 MiB; automatisk kopiering stoppar över denna gräns så att en skapad kopia kan användas av återställningsflödet.

## Teknisk arbetsgång och rotation

`src/auto-backup.cjs` använder samma `VACUUM INTO`-snapshot som manuell export. Därmed ingår committade WAL-sidor; den levande huvudfilen kopieras inte direkt. Kopian skrivs till en unik temporär fil, synkas och valideras innan den får sitt slutliga namn. SHA-256 och tidpunkt registreras lokalt. Därefter rensas äldre filer som matchar just företagets automatiska filnamn i dess aktuella undermapp. Den nyskapade filen behålls alltid. Andra filer, manuella exporter, andra företags kopior och kopior i tidigare valda kataloger rensas inte.

Om ny kopia misslyckas sker ingen rotation. Misslyckad rensning ger varning medan den nya lyckade kopian finns kvar. Skadad inställningsfil stoppar schemat och ger felstatus, utan att befintliga kopior raderas. Katalogväljaren i Electron kontrollerar ursprung, huvudfönster och aktuell databassession även efter att dialogen stängts. Status och skrivåtgärder via API kontrollerar också databassessionen.

Databasschema 10 är oförändrat. Kopiorna hör till samma befintliga återställningsformat; inget nytt lösenordslås, ingen molnöverföring och ingen Windows-bakgrundstjänst införs.
