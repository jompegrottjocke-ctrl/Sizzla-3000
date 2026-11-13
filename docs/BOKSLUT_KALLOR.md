# Källor och öppna kontroller för Bokslut & skatt

Kontrolldatum: **2026-11-13**, svensk lokal kalenderdag. Avser [kravunderlaget](BOKSLUT_KRAV.md) för Sizzla 3000, kodgrund 0.15.1 / 3147922. Lanseringen ska enligt användaren ske efter 2026-12-29.

”Kontrollerad” betyder att angivna passager har lästs i den officiella källan. Det betyder inte att hela lagen, samtliga övergångsregler eller alla företagsspecifika undantag har granskats. Konsoliderade lagtexter kan innehålla bestämmelser med olika giltighetstider. De ska kontrolleras mot företagets period och på nytt före lanseringen.

## Kontrollerade lagkällor

### L1. Bokföringslagen (1999:1078), BFL

[Officiell lagtext hos Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)

Kontrollerade relevanta avsnitt:

- 3 kap. 1–3 §§: räkenskapsår, kalenderår, undantag och första/omlagda år, högst arton månader vid förlängning enligt bestämmelsen.
- 4 kap. 1–2 §§: bokföringsskyldighetens innehåll och god redovisningssed.
- 4 kap. 6 §: redovisningsvaluta; SEK är huvudregel och euro tillåts för vissa företagsformer. Sizzla stödjer i dag SEK, vilket måste anges som omfattningsgräns.
- 5 kap. 1–4 §§: grund-/huvudbokföring, tidpunkt, bokslutstransaktioner och sidoordnad bokföring.
- 5 kap. 5 §: rättelse av bokföringspost. Relevant ordalydelse: ”skall det anges när rättelsen har skett och vem som har gjort den”. Bestämmelsen anger också att sambandet till rättelseposten ska kunna upptäckas utan svårighet.
- 5 kap. 6–10 §§: verifikationer och deras innehåll, identifiering, hänvisning, undantag och rättelse.
- 5 kap. 11 §: systemdokumentation och behandlingshistorik.
- 6 kap. 1 och 3–8 §§: årsredovisningsskyldighet, årsbokslut/förenklat årsbokslut, upplysningar, undertecknande, färdigställande och specifikationer.
- 7 kap. 1–3 a och 6 §§: bevarande, förvaring, utlandsundantag och överföring.

Viktiga preciseringar:

1. Två olika regler har beloppsgränsen normalt högst tre miljoner kronor: möjligheten till senare bokföring till betalning enligt 5 kap. 2 § och möjligheten till förenklat årsbokslut enligt 6 kap. 3 §. Övriga villkor är inte identiska.
2. Bevarande gäller ”fram till och med det sjunde året efter utgången av det kalenderår då räkenskapsåret avslutades” (7 kap. 2 §). Det är inte en generell sjuårsperiod räknad från fakturadatum.
3. Reglerna om överföring i 7 kap. 6 § tillåter inte förstöring av original utan att överföringens villkor är uppfyllda. Villkor för ändrad form/förvaring måste bedömas, inte ersättas av ett allmänt ”digital kopia finns”.
4. BFL är utgångspunkt; god redovisningssed konkretiseras också genom tillämpliga BFN-regler.

### L2. Årsredovisningslagen (1995:1554), ÅRL

[Officiell lagtext hos Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)

Kontrollerade relevanta avsnitt:

- 2 kap. 1–4 §§: innehåll, överskådlighet, rättvisande bild, väsentlighet och grundläggande principer. Kassaflödesanalys krävs enligt 2 kap. 1 § för större företag och bostadsrättsföreningar.
- 2 kap. 5–7 §§: form, svenska, valuta och undertecknande. Enligt 2 kap. 7 § skriver samtliga styrelseledamöter och utsedd VD under för AB. Föreskrivet elektroniskt undertecknande ska inte likställas med ett vanligt godkännandeklick.
- 3 kap. 5 §: jämförelsetal och tillämpliga undantag.
- 4 kap. 4–5 §§: avskrivning och nedskrivning; att Sizzla räknar linjär avskrivning betyder inte att alla värderingskrav är täckta.
- 8 kap. 1–3 §§: registreringsmyndighet, överlämnande till revisor och ingivande. I tillämpliga revisionsfall är tidsfristen till revisor en egen kontroll.
- 8 kap. 6 §: sjumånadersgränsen för förseningsavgift och särskilda situationer.

En månad efter fastställelse enligt 8 kap. 3 § är en separat skyldighet. Sjumånadersgränsen är inte en generell ersättning för den fristen. Fastställelseintyget ska även ange stämmans beslut om vinst/förlust enligt bestämmelsen.

### L3. Aktiebolagslagen (2005:551), ABL

[Officiell lagtext hos Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/aktiebolagslag-2005551_sfs-2005-551/)

Kontrollerat: 7 kap. 10 §. Relevant ordalydelse: ”Inom sex månader från utgången av varje räkenskapsår” ska ordinarie bolagsstämma hållas för årsredovisningen m.m. Övriga stämmoregler och särskilda fall måste prövas när det konkreta dokument-/fristflödet byggs.

### L4. Inkomstskattelagen (1999:1229), IL

[Officiell lagtext hos Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/inkomstskattelag-19991229_sfs-1999-1229/)

Särskilt kontrollerat: 65 kap. 10 § anger 20,6 procent för juridiska personers statliga inkomstskatt. Övergångsbestämmelser anger bland annat 21,4 procent för beskattningsår som börjar efter 2018-12-31 men före 2021-01-01.

Detta verifierar ett exempel på procentsats och periodberoende, inte ett komplett beräkningsunderlag. Regler i bland annat 14 kap. om resultat, 18 kap. om inventarier, 30 kap. om periodiseringsfonder, 33–34 kap. om räntefördelning/expansionsfond och 40 kap. om tidigare underskott måste detaljgranskas för valda fall före implementation. Avgränsningar, andra skatter, avräkningar och specialfall behöver uttryckligt stöd eller besked om extern hantering.

## Kontrollerade Skatteverkssidor

### S1. Deklarera enskild näringsverksamhet

[Officiell sida](https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraenskildnaringsverksamhet.4.133ff59513d6f9ee2ebf00.html)

Kontrollerat: NE-bilaga lämnas tillsammans med inkomstdeklarationen; årsbokslut ska göras. Sidan beskriver också tidigare egenavgiftsavdrag/avstämning och möjligheten till förenklat årsbokslut. Exakta rutor, tillämpliga år och undantag behöver läsas i årsaktuella instruktioner innan mappning implementeras.

### S2. Deklarera åt ett aktiebolag eller en ekonomisk förening

[Officiell sida](https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraatettaktiebolagellerenekonomiskforening.4.46ae6b26141980f1e2d1261.html)

Kontrollerat: deklaration efter varje räkenskapsår och olika frister beroende på räkenskapsårets slut. Den kontrollerade sidan meddelar uttryckligen: **”Tjänsten Inkomstdeklaration 2 avvecklas 29 december 2026.”**

Användarens lansering sker efter detta datum. Den äldre tjänsten ska därför inte utgöra lanseringens planerade integrationskanal. Uppgiften är en publicerad förändring vid kontrolltillfället; framtida kanaler, frister och specifikationer ska verifieras igen före lanseringen.

### S3. Så här lämnar du in och fyller i inkomstdeklarationen för AB

[Officiell instruktion](https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraatettaktiebolagellerenekonomiskforening/saharlamnarduinochfylleriinkomstdeklarationen.4.262c54c219391f2e96322d7.html)

Kontrollerat:

- Sidan beskriver e-tjänsten **Inkomstdeklaration 2, 3 och 4**, med hela deklarationen inklusive **INK2R** och **INK2S** samt tillämpliga bilagor.
- Sidan beskriver **Filöverföring** av SRU-filer från deklarationsprogram.
- Överföringskvitto och underskrift är separata moment. I beskrivet filöverföringsflöde sker underskrift via Mina sidor, följd av kvittens för den underskrivna deklarationen.
- Sidan beskriver också den äldre tjänsten med första sidan och separat hantering av andra delar. Den ska inte förväxlas med tjänsten ”Inkomstdeklaration 2, 3 och 4”.

Slutsats: den äldre tjänstens avveckling är inte ett belägg för att blanketten INK2, INK2R eller INK2S upphör. En tekniskt verifierad inlämningsfil/integration är ännu inte implementerad eller godkänd i Sizzla.

### S4. Filöverföring

[Officiell sida](https://www.skatteverket.se/foretag/inkomstdeklaration/filoverforing.4.46ae6b26141980f1e2d5e.html)

Sidan har hämtats som kanalreferens. Detaljerad teknisk granskning av aktuella filspecifikationer, fältkoder, teckenkodning, periodversioner, testförfarande och kvittens/signering återstår. Enbart denna sida är inte en formatvalidering av framtida Sizzla-export.

## BFN: uppladdat underlag och återstående källkontroll

[BFN:s webbplats](https://www.bfn.se/redovisningsregler/) kunde inte hämtas direkt (proxy 403). Användaren har därefter tillhandahållit sju olika PDF-filer: tidigare och senare konsolideringar av K2 respektive Årsbokslut samt Bokföring, Gränsvärden och Fusion. Versions- och tillämpningsregler samt utvalda bokslutspunkter har nu kontrollerats i dessa filer. Se [analysen med sidreferenser](BFN_UPPLADDADE_REGLER.md) och [filmanifestet med SHA-256](BFN_UPPLADDADE_KALLOR.json). Följande avgränsningar kvarstår:

| Dokumentfamilj att verifiera | Vad som ska kontrolleras |
| --- | --- |
| K1: BFNAR 2006:1, enskilda näringsidkare med förenklat årsbokslut | Gällande version, tillämpningsområde, värdering, förenklingar, dokumentuppställning och övergång. |
| Årsbokslut: BFNAR 2017:3 | Två uppladdade versioner granskade i relevanta delar, inklusive BFNAR 2026:1. Kvar: fullständig detaljgranskning och bekräftelse av eventuella senare ändringar. |
| K2: BFNAR 2016:10 | Två uppladdade versioner granskade i relevanta delar, inklusive BFNAR 2025:2 och punkterna 1.1–1.1C. Kvar: fullständig produktbedömning, detaljgranskning och bekräftelse av eventuella senare ändringar. |
| K3: BFNAR 2012:1 | Tillämplighet, övergång, dokument- och värderingskrav. Frånvaro av eget K3-stöd ska identifieras i produktflödet. |
| Bokföring: BFNAR 2013:2 | Utvalda krav granskade i U5; fortsatt detaljgranskning krävs inför implementation. |
| Gränsvärden: BFNAR 2006:11 | U6: storleksklassificering och beräkningsmetoder. Öppen fråga om kompensationsledighet. |
| Fusion: BFNAR 2020:5 | U7: endast omfattning och grundläggande övergång har granskats; inget planerat fusionsstöd i nästa steg. |

För dokument som inte har tillhandahållits identifierar numren ovan fortfarande källor att verifiera. PDF-granskningen av K2/Årsbokslut avser utvalda tillämpnings-, övergångs- och bokslutspunkter, inte alla regler eller alla företag. Ett allmänt BAS-konto eller en linjär beräkning i Sizzla är inte bevis för korrekt normtillämpning.

## Tekniska iakttagelser i Sizzla 0.15.1

- [accounting.cjs](../src/accounting.cjs): `ledger_events` lagrar tid, objekt, åtgärd och data men ingen aktör. `reversePosted` kopplar original och motbokning; SQL-triggers skyddar bokförda verifikationer mot ändring/radering av kärninnehållet.
- Samma modul: manuella verifikationer lagrar datum, beskrivning, referens, rader och företagssnapshot; motpart är inte ett separat generellt fält. Årslåsning, resultatomföring och IB-överföring finns, men ingen samlad juridiskt verifierad bokslutsprocess.
- [assets.cjs](../src/assets.cjs): linjär månadsavskrivning, källkopplingar och motbokningar finns. Registerrapporten är uttryckligen begränsad till nu registrerade aktiva/avyttrade tillgångar, och äldre värden före ingående avskrivningsdatum kan saknas. Den får därför inte ensam utgöra historisk avstämningsbevisning för alla perioder.
- [security.cjs](../src/security.cjs): databasexport/återställning och backup före import finns. Detta visar inte att samtliga mottagna originalunderlag finns i exporten eller att en återställningsprocess uppfyller samtliga krav på bevarande och behandlingshistorik.
- [SYSTEMDOKUMENTATION.md](../SYSTEMDOKUMENTATION.md) anger redan att underlaget inte är en försäkran om fullständig efterlevnad.

## Nästa källkontroll

1. Komplettera med K1/K3 för valda spår; detaljgranska Bokföring och Gränsvärden enligt [kompletteringen](BFN_BOKFORING_GRANSVARDEN.md); fortsätt detaljgranskningen av de uppladdade K2-/årsbokslutsversionerna. Direktåtkomst eller nya uppladdningar behövs för förnyad publiceringskontroll.
2. Färdigställ årsaktuella regelkort för skattefallen och deklarationsrutorna; komplettera vid behov med tillämpliga lagar och myndighetsinstruktioner.
3. Kontrollera valda inlämningsformat och Bolagsverkets eventuella digitala tekniska krav inför integration. Underskrift och fastställelseintyg måste hanteras enligt valt pappers-/elektroniskt flöde.
4. Före lansering efter 2026-12-29: kontrollera källorna på nytt. Inga framtida format eller ännu inte granskade regelversioner är godkända genom denna dokumentkontroll.

Nätverksförslaget i [NETWORK_ACCESS_PROPOSAL.json](NETWORK_ACCESS_PROPOSAL.json) bevarar de åtta egna domäner som fanns vid läsningen av inställningarna och lägger till `bfn.se` samt `www.bfn.se`. Plattformens paket-/GitHub-preset ska bevaras. Förslaget är **inte sparat eller tillämpat i miljöinställningarna**; utkastet kunde inte redigeras. Läs alltid aktuella inställningar på nytt innan förslaget används så att senare tillagda domäner inte skrivs över.
