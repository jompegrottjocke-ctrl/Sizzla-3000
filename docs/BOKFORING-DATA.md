# Bokföring och rapporter – selektiv inläsning i 0.29.7

Bokföringens verifikationslista, kontoplan och räkenskapsår använder `book-list`. Svaret innehåller konton, räkenskapsår, deklarerad operatör samt verifikationshuvuden med aktuella revisioner, status, rättelsekopplingar och debettotaler i heltalsöre. Konteringsrader och företagskopior utelämnas. Samtliga huvuden finns tillgängliga för sökning och kopplingar mellan rättade verifikationer, även över räkenskapsår. Listans sidindelning begränsar bara vad som visas på skärmen.

När en verifikation öppnas i listan hämtar `book-detail` dess kompletta rader och företagskopia. Andra verifikationer ligger kvar som huvuden. Redigerare och åtgärder som behöver fler moduler övergår till fullständig företagsvy före öppning. Revisionskontroller, låsta perioder, oföränderliga bokförda poster och rättelsehistorik ändras inte.

Rapportfliken använder `book-report` med valt räkenskapsår och period. Endast bokförda verifikationer från det året till och med valt slutdatum hämtas. Poster före startdatum måste följa med för korrekt ingående saldo; de visas inte som periodens omsättning. Utkast och senare poster tas inte med. Räkenskapsårets registrerade ingående balanser bevaras. Saldolista, resultatrapport, balansrapport och huvudbok använder samma beräkningar som tidigare.

Byte av period/räkenskapsår utlöser ny inläsning om aktuellt underlag inte täcker urvalet. Sena svar efter navigering och företagsbyte ignoreras. Fel vid inläsning kan försökas igen. Bakgrundsuppdateringar avvaktar medan ett underlag öppnas eller osparade uppgifter redigeras.

CSV-export använder hela det filtrerade rapportunderlaget, oberoende av listornas sidindelning. Utskriftsfönster använder fullständig företagsvy. Även lönebokföring, SIE och behandlingshistorik behåller fullständiga underlag. Om ett fönster redan har en fullständig företagsvy kan denna användas direkt i rapporten. Schema 10 och säkerhetskopieformatet är oförändrade.

## Verifiering och datamängd

API-tester jämför samtliga verifikationshuvuden och totalsummor mot komplett vy, öppnar en enskild verifikation och jämför saldon för helår, delår och en enda dag vid årsslut. Dessa omfattar registrerade ingående balanser och bokförda rättelser. Okänd verifikation/räkenskapsår, ogiltiga datum och felaktig databasnyckel avvisas. Läsningarna lämnar bokföringen oförändrad.

Gränssnittstester jämför alla fyra rapporternas HTML mot samma urval med komplett databas, samt CSV och utskrift. Befintliga tester omfattar bokföring, rättelser, årslåsning, bokslut, listor med flera sidor, misslyckade/sena nätverkssvar och företagsbyte. Ett äldre test som läste rapportdata direkt efter klick väntar nu på att rapporten faktiskt är klar; tester av fördröjda svar riktas mot den nya listförfrågan.

På den stora syntetiska testdatabasen med 7 900 verifikationer är JSON-svaren:

| Vy | Byte |
| --- | ---: |
| Hela företaget | 36 209 214 |
| Verifikationshuvuden | 4 946 627 |
| Huvuden och en komplett verifikation | 4 947 077 |
| Rapportunderlag för valt år till 2025-12-31 | 3 497 552 |

Listsvaret är cirka 86 procent mindre än komplett företagsvy. Rapportmätningen gäller ett visst testår med 2 829 bokförda verifikationer och rapportperioden 2025-12-31–2025-12-31; tidigare poster ingår för ingående saldo. Resultaten anger datamängd och är inte utlovade starttider för Windows eller macOS.

Reproducera på en temporär kopia med `node scripts/benchmark-accounting.cjs /tmp/nytt-resultat.json`. Skriptet ersätter inte befintliga rapporter. Råresultat och kontrollsumma för testdatabasen finns i [accounting-payload-0.29.7.json](performance/accounting-payload-0.29.7.json).
