# Stor syntetisk testdatabas

SYNTETISK TESTDATA – inga verkliga affärer, betalningar eller skatteunderlag.

Skapa och aktivera ett NYTT företag under Inställningar → Databaser. Importera Sizzla-3000-Stor-Testdatabas-0.29.1.sqlite under Säkerhet & säkerhetskopiering och starta om programmet. Import ersätter den aktiva databasen: använd aldrig ett riktigt företag. Inget lösenord behövs. Windows och macOS använder samma format.

Innehåll:
- customers: 1000
- articles: 3000
- suppliers: 200
- employees: 60
- projects: 150
- timeEntries: 6000
- customerInvoices: 3000
- customerCredits: 0
- customerPayments: 2400
- supplierInvoices: 600
- vouchers: 7900
- stockItems: 300
- stockMovements: 300

Tre öppna räkenskapsår 2024–2026. Försäljning och inköp i SEK med fulla, partiella och obetalda fakturor. Tidsrader är utkast eller godkända. Artikelkoppling på en direktfaktura medför ingen automatisk lagerleverans; testlagret innehåller separata ingående mängder. Detta är ett volymtest, inte en fullständig boksluts- eller löneövning. Den mindre inbyggda demon visar fler arbetsflöden.

Inga externa anslutningar, riktiga identiteter, telefonnummer eller bankuppgifter. Bokförda poster är testunderlag; använd inga filer för deklaration eller betalning.

Kontroller: balanserade verifikationer, reskontra mot huvudbok per år, icke-negativt lager, vanlig säkerhetskopiering/import och exakt jämförelse av affärsdata efter omstart. Prestandamätningar och optimering är nästa steg och ingår inte i kontrollresultatet.

SHA256 (Sizzla-3000-Stor-Testdatabas-0.29.1.sqlite): bbe9330c4cbc1d6f60c7450da312d82971a6c8e283eaefcc1b976eb6135c9e8d
