Sizzla 3000 0.37.0 – leverantörsreturer mot inleverans.

- Inköp → Inköpsorder → Öppna: registrera faktiskt tillbakaskickade lagerförda varor mot ursprunglig inleverans.
- Returantal, dubbletter, revisioner, tillgängligt lager, reservationer och inventeringsgränser kontrolleras. LR-post, lager och nummerserie sparas atomiskt.
- Koppla bokförd leverantörskredit från samma inköpsorder och leverantör. Artikelantal på kredit och originalfaktura kan inte återanvändas över flera kopplingar.
- Felregistrering rättas med motsatt lagerrörelse och bevarat original. Ordervyn, inköpshistoriken och lagerhistoriken visar samband och ansvarig.
- Artikelkoppling på orderfaktura och leverantörskredit bevaras vid sparande i gränssnittet.
- Svenska, engelska och stor text stöds. Säkerhetskopiering och företagsbyte omfattar returposter och historik.

Fysisk retur och kredit är separata händelser. Retur/kreditkoppling skapar ingen kredit, betalning eller verifikation och ändrar inte ursprungligt mottaget antal. Lagervärdering och verkliga bankhändelser behöver hanteras separat. Se docs/LEVERANTORSRETURER.md.

Databasschema 10 är oförändrat. Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
