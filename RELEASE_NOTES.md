Sizzla 3000 0.9.0 för Windows 11 (x64): Flera företagsdatabaser.

- Ny flik Inställningar → Databaser: skapa och namnge företagsdatabaser samt välj Aktivera. Högst 10 företagsdatabaser, inklusive den första. Antalet visas i fliken. Bara en databas är aktiv åt gången; valet finns kvar efter omstart.
- Den befintliga databasen bevaras som Företag 1 på samma plats. Nya företag får egna tomma register, bokföring, löner, lager, fakturanummerserier och PDF-historik.
- Företagsnamn och databasetikett syns i sidomenyn. Etiketten kan ändras utan att den bokförda företagsidentiteten ändras.
- Osparade formulärändringar ger en fråga innan vyn lämnas. Byte läser in vyerna på nytt och blockerar skrivning från gamla fönster eller anrop som började före bytet.
- Byte väntar på pågående utskrifts-/PDF-åtgärder. Gamla utskriftsfönster stängs vid byte i skrivbordsappen.
- Export/import och öppna katalog gäller aktiv databas. Säkerhetskopior får databasnamnet i filnamnet. En förberedd import måste slutföras genom omstart eller avbrytas före byte.
- Svenska/engelska, mörkt läge och textinställningar stöds.

**Exportera hela den befintliga databasen före uppdatering.** Databasformatet är fortsatt schema 7. Varje företag säkerhetskopieras separat. Databaslistan ingår inte i en enskild export. För en manuell säkerhetskopia av alla företag: stäng programmet och kopiera hela den ursprungliga datakatalogen inklusive databases.json och underkataloger. Externa originalunderlag måste kopieras separat.

Första databasen ligger kvar i den ursprungliga datakatalogen. Nya företag ligger i databases/<id>/. Använd inte 0.8 eller äldre för att hantera en arbetsplats med flera databaser. Radering, sammanslagning, gemensam nätverkslagring och samtidig användning från flera programinstanser ingår inte.

Vill du lägga till ett företag från en kopia: skapa och aktivera en ny databas, importera kopian där och starta om. Import ersätter bara det aktiva företagets databas, inte listan eller andra företag. Importgränsen på 64 MB inklusive PDF-kopior gäller fortfarande.

Befintliga begränsningar kvarstår: vanliga svenska faktura-/inköpsflöden i SEK enligt fakturametoden, inga banköverföringar, ingen automatisk skatt eller AGI-inlämningsfil. Fullständig behandlingshistorik med identifierad operatör och övriga dokumenterade krav inför skarp bokföring återstår; se SYSTEMDOKUMENTATION.md.

Det här är en förhandsversion med osignerat installationsprogram. Fullständig manuell verifiering på Windows 11 återstår. Ladda ned installationsfilen under Assets.
