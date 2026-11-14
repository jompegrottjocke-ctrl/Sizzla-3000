# DEMO Sizzla Handel AB

Demodatabas för Sizzla 3000 0.28.1 (schema 10), skapad 2026-11-14.

**Bara påhittade övningsuppgifter.** Bolag, affärer och kontoutdrag är simulerade. Organisationsnumret 999999-9999 är avsiktligt ogiltigt. Personalens syntetiska samordningsnummer har kontrollsiffror men är inte verifierade identiteter. E-postdomäner slutar på .invalid. Verkliga bankkonton och telefonnummer är inte angivna. Använd inte uppgifterna för verkliga betalningar, deklarationer, AGI eller kundutskick. Löneskatt och avgifter är förenklade manuella övningsbelopp, inte skattetabeller.

## Importera i en separat demodatabas

1. Använd Sizzla 3000 **0.28.1 eller senare** med stöd för schema 10.
2. Gå till **Databaser → Skapa databas**, ange **DEMO** och aktivera den nya databasen.
3. Kontrollera att DEMO är aktivt. Import ersätter innehållet i den aktiva databasen.
4. Gå till **Säkerhet & säkerhetskopiering → Importera databas**.
5. Välj **Sizzla-3000-Demo-0.28.1.sqlite**, lämna lösenordet tomt och bekräfta importen.
6. Starta om programmet. Företagsnamnet ska vara **DEMO Sizzla Handel AB**.

Exportfilen är okrypterad för att vara enkel att prova. Den innehåller bara demonstrationer. En verifierad provimport i en separat företagsdatabas har genomförts före publicering.

## Börja här

- **Översikt:** öppna förfallna fakturor, order att leverera/fakturera, lager och bankavstämningar. Listorna visar riktiga kopplingar mellan demoposterna.
- **Personal:** 12 anställda, varav en arkiverad. Två profiler har initialbilder. Visa alla för att hitta Vilgot Vide. Det finns månads-/timlön, deltid och frånvaro.
- **Personal → Lönekörningar:** november 2025 och januari/september 2026 är markerade utbetalda och bokförda i övningen. Oktober 2026 är godkänd och upplupen men inte utbetald. November 2026 är utkast. Augusti har ett makulerat övningsutkast.
- **Personal → AGI-underlag:** välj **2026-01** eller **2026-09** för kontrollunderlag från utbetald lön. Det är inte en färdig inlämningsfil. Frånvaro ger inte automatiska löneavdrag.
- **Fakturering:** KF15 visar EUR och kursdifferens, KF17 visar USD med kvarstående saldo. Det finns även full-/delbetalning, kredit, kvittning och återbetalning.
- **Betalningar → Påminnelser:** KF20 har en simulerad påminnelse med övningsavgift/ränta. KF21 är spärrad efter en påhittad invändning. Skickmarkeringen är en demonstration; inget meddelande har skickats. Tilläggsregistret är separat från fakturans bokföring.
- **Offerter & kundorder:** en offert är accepterad, en är öppen och en är avböjd. Kundordern har både fakturerad leverans, leverans att fakturera och kvar att leverera. En felaktig leverans har återtagits med historik.
- **Återkommande fakturering:** månadsavtal med utfärdade perioder, paus/återupptagning och överhoppad period. Kvartalsavtal i EUR har ett utkast att granska och ett återtaget äldre utkast.
- **Inköp:** full leverans, delleverans, makulerad order, godkända/bokförda fakturor, en ej granskad faktura, delbetalning, kredit och återbetalning.
- **Lager:** 31 artiklar totalt, varav 24 lagerförda. Inleveranser, kundutleveranser, återtagningar och en inventeringsavvikelse finns. En CSV-importerad inventering är bokförd i lagermodulen och ett annat inventeringsutkast väntar. Kvantitetsrörelser ger inte automatisk lagervärdering i huvudboken.
- **Tid & projekt:** avslutat kundprojekt, aktivt supportprojekt och internt projekt. Godkänd tid, tidsutkast och makulerad tid. Ett fakturaunderlag har återtagits och skapats om innan fakturan utfärdades.
- **Anläggningar:** arbetsstation med tio månaders avskrivningar och en testmaskin som skrivits av i sex månader och sedan utrangerats. Underlag och verifikationer är länkade.
- **Bokföring:** 108 bokförda verifikationer, en motbokning med ersättningsverifikation och ett separat verifikationsutkast. Januari 2026 är låst.
- **Bank & avstämning:** 2025 och januari 2026 är avstämda mot **simulerade** utdrag. September 2026 är pågående. Utjämnade original/motbokningar är hanterade separat, inte påhittade bankbetalningar.
- **Bokslut:** 2025 är avslutat med resultatöverföring och ingående balanser till 2026. Det finns ett fryst bokslutsarbetsunderlag för 2025 och ett påbörjat för 2026. Underlaget är inte en årsredovisning eller deklaration.
- **Analys:** jämför 2025 och 2026, granska kunder, artiklar, konton och aktuell reskontra. Databasen innehåller valda exempel, inte varje tänkbar återkommande månadspost.
- **Dokumentarkiv:** fem simulerade PDF-underlag, varav ett avsiktligt okopplat. Övriga länkar till fakturor, verifikationer, tillgångar och rätt bokslutsår.
- **Utskriftshistorik:** 8 riktiga sparade PDF-snapshots från programmets utskriftsfunktion, bland annat faktura, kredit, lönebesked, lager, tid, analys, bokslut och påminnelse. PDF-filerna finns även i paketet.
- **Byrå:** exempel på öppna, pågående, färdiga och avbrutna arbetsuppgifter.
- **AI-agent → MCP:** lokal läsåtkomst har funktionstestats och sedan stängts av. Alla behörigheter är avstängda i leveransen. Inga nycklar finns i exporten. Extern AI-agent, molnserver, koncern och ej implementerade integrations-/licensfunktioner kan inte demonstreras som färdiga funktioner.

## Kontrollerat före leverans

Alla bokförda verifikationer balanserar. Kund- och leverantörsreskontra stämmer med 1510 respektive 2440. Lagersaldon och kvarstående fakturasaldon är inte negativa. 2025 års frysta arbetsunderlag och två färdiga bankavstämningar finns kvar. Exporten har verifierats och importerats i en ny företagsdatabas, inklusive arkiv och PDF-historik. Samtliga 23 huvudflikar och 44 underfliksvyer har öppnats efter import utan JavaScript-fel.

Frysta bokslutsversioner bevaras även om du ändrar data. Programmets konservativa kontroll kan därefter markera att källunderlaget ändrats, även vid senare programversion.

Se **DEMO-kontrollresultat.json** för antal och kontrollresultat. Belopp där anges i heltalsören. **SHA256SUMS.txt** innehåller kontrollsummor. **DEMO-Bokforing-2025.se** och **DEMO-Bokforing-2026.se** är extra SIE-exporter av demobokföringen; de behövs inte för importen av hela databasen.
