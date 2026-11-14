# Betalningspåminnelser och granskade tillägg

Version 0.24.0. Öppna **Betalningar → Påminnelser**. Här finns förfallna kundfakturor, frysta påminnelseunderlag, PDF-/utskriftshistorik och separat uppföljning av ränta och påminnelseavgift.

Detta är vanliga betalningspåminnelser, inte inkassokrav. Programmet skickar inga dokument eller rättsliga åtgärder. Inkassoavgift, förseningsersättning på 450 kr, indrivning och automatisk bokföring av tillägg ingår inte.

## Arbetsgång

1. Välj lokal ansvarig i panelen. Namnet registreras med händelser, men är ingen autentiserad inloggning.
2. Kontrollera fakturans verkliga saldo, eventuella krediter och mottagarens adress. Fakturan måste vara förfallen och ha aktiv bokföring. En oreglerad kredit stoppar påminnelsen tills den kvittats eller utretts.
3. **Skapa påminnelse**. Avgift är 0 och ränta är avstängd från början. Ange betalningsreferens och önskad betalningsdag, högst 90 dagar framåt. Den önskade dagen ersätter inte fakturans ursprungliga förfallodag.
4. Granska förhandsvisningen. Den visar ursprungsbelopp, betalningar, kvittningar, kvarstående kapital och eventuella tillägg. Granska och bevara underlaget. Ändrade saldon/uppgifter mellan granskning och bevarande avvisas.
5. Spara PDF och skicka själv. Registrera sedan verkligt utskicksdatum, sätt och referens med **Registrera manuellt utskick**. Att bevara eller skriva ut betyder inte att dokumentet skickats.
6. Ett oskickat underlag kan avbrytas med orsak. Underlaget bevaras och dess föreslagna tillägg markeras avbrutna. Ett skickat underlag skrivs inte om eller raderas.

En faktura kan bara ha ett oskickat underlag åt gången. En bestridd faktura kan spärras med orsak. Spärren hindrar nya påminnelser men ändrar inte bokföring eller tidigare dokument. Häv spärr först efter utredning. Både spärr och hävning loggas.

## Avgift

För SEK-fakturor kan en ny avgift på högst 60 kr väljas. Användaren måste uttryckligen bekräfta tidigare avtal senast när skulden uppkom, att åtgärden/avgiften är skäligen motiverad och att motsvarande ersättning inte redan krävts utanför registret. Avtalsreferens krävs. Detta är ingen automatisk juridisk bedömning.

Endast en avgift per faktura kan registreras här. En tidigare obetald avgift förs vidare som samma tillägg på en ny påminnelse, i stället för att skapas igen. Avgift som efterskänkts eller betalats skapas inte på nytt. En avbruten oskickad påminnelses föreslagna avgift hindrar däremot inte ett korrekt ersättningsunderlag.

Reglerna om hur påminnelseavgift samverkar med exempelvis förseningsersättning behöver kontrolleras även mot åtgärder utanför programmet. Denna version lägger inte på sådan ersättning.

## Ränta – avgränsat beräkningsunderlag

Endast SEK-fakturor har ränteberäkning. Bekräfta att förfallodagen var bestämd i förväg och att ränterätten är kontrollerad. Ange avtals-/grundreferens och antingen avtalad årsränta eller kontrollerad referensränta plus åtta procentenheter. Andra startgrunder, såsom reglerna om 30 dagar efter ett krav enligt räntelagens 4 §, avgörs inte automatiskt.

Programmet hämtar inga referensräntor. Vid referensränta byggs perioder vid varje halvårsskifte. Satser och källor måste fyllas i och granskas för respektive period; samma halvår får inte ha olika referenssatser i ett underlag. Vid avtalad ränta visar gränssnittet en vald årsränta för perioden. Teknisk gräns för tillämpad årsränta är 0–100 procent, inte ett påstående om att varje sådan ränta är tillåten i ett avtal.

Beräkningen använder **dagens kvarstående kapital**, från tidigast senaste registrerade betalnings-/kvittnings-/kredit-/rättelsedatum eller slutet på en redan registrerad ränteperiod. Start kan flyttas fram. Tidigare perioders ränta på då betalda belopp räknas inte fram här. Denna avgränsning undviker att historiska saldon eller kreditgrunder gissas; ett fullständigt historiskt räntekrav behöver hanteras separat och stämmas av mot redan registrerade krav.

Intervallet inkluderar startdagen och exkluderar påminnelsedagen. Underlaget visar faktisk dagräkning/365, kapital, perioder, tillämpade satser och källa. Summan beräknas med BigInt och avrundas en gång till ören:

`ränta i ören = avrunda(summa(kapital i ören × ränta i hundradels procent × dagar) / 3 650 000)`

Inga avgifter eller tidigare räntor läggs till räntekapitalet. Perioder får inte ha luckor eller överlapp. Redan registrerade ränteperioder kan inte krävas igen, även om tillägget senare betalats eller efterskänkts. Föreslagen ränta på en avbruten oskickad påminnelse frigörs.

## Tillägg och bokföring hålls åtskilda

Påminnelseavgift och ränta är separata registrerade kravunderlag. De skapar **inte** ny verifikation, moms, betalning eller ändrat fakturasaldo. Bokför och reglera sådana belopp separat enligt företagets rutiner. Använd inte fakturans vanliga betalningsfunktion för överbetalning av dessa tillägg; den funktionen reglerar fakturans kapital.

Tillägg börjar som föreslagna och blir öppna när användaren registrerat manuellt utskick. Ett öppet tillägg kan markeras **Betalt separat** eller **Efterskänkt** med datum och referens till separat hantering. Det är en manuell uppgift, inte bevis på bankbetalning eller bokföring. Registret visar även öppna tillägg när ursprungsfakturan har slutbetalats. Resterande tillägg kan följas upp och hanteras här, men någon ny fristående tilläggsfaktura eller automatisk påminnelse på bara tilläggen skapas inte.

Nya påminnelser för en fortfarande obetald faktura tar med tidigare öppna tillägg en gång med hänvisning till sitt ursprungsunderlag. Ett redan bevarat underlag ändras inte om fakturan eller dess medförda tillägg senare regleras. Då visas ändringsvarning. För ett faktiskt tidigare utskick som registreras i efterhand krävs uttrycklig bekräftelse och orsak när uppgifterna förändrats; detta bevarar vad som verkligen skickades utan att låtsas att det gamla saldot är aktuellt.

EUR-/USD-fakturor kan påminnas i fakturans egen valuta, med sparad betalningsinstruktion. Nya avgifts- och ränteberäkningar i annan valuta ingår inte här.

## Lagring och utskrift

`src/reminders.cjs` använder befintliga `records` med `reminder_letter`, `reminder_extra`, `reminder_hold` och `reminder_event`. Schema 10 är oförändrat. Underlag får BP-nummer och en bevarad kopia av fakturareferens, saldo, avsändare, mottagare, tillägg och beräkningsunderlag, samt ansvarig, programversion och tidpunkt. Skrivförfrågningar kontrollerar aktiv företagsdatabassession och revisioner. Förhandsvisning är skrivfri; bevarande och tillståndsändringar sparas atomiskt.

Händelsevyn använder de senaste 200 händelserna totalt; samtliga sparas i databasen. Originalunderlag och historik följer manuell export/import och automatisk säkerhetskopiering. PDF använder dokumenttypen `payment_reminder` i befintlig utskriftshistorik. Tidigare sparade PDF-kopior ändras inte. Automatisk PDF-arkivering kräver skrivbordsappen; webbläsarläge har utskriftsförhandsvisning.

## Kontrollerade lagkällor

Lästa från Riksdagens konsoliderade lagtext 2026-11-14:

- [Räntelag (1975:635)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/rantelag-1975635_sfs-1975-635/), särskilt 3 § om i förväg bestämd förfallodag, 4 § om andra startgrunder, 6 § om referensränta plus åtta procentenheter och 9 § om referensränta.
- [Lag (1981:739) om ersättning för inkassokostnader m.m.](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1981739-om-ersattning-for-inkassokostnader_sfs-1981-739/), särskilt 2 § om tidigare avtal, 4 § om skälighet och belopp samt 4 a–5 §§ om förseningsersättning och samverkan mellan ersättningar.

Systemet gör inte en fullständig bedömning av exempelvis invändningar, konsumentvillkor, preskription, avtalens giltighet eller inkassoregler. Dessa frågor behöver granskas för den faktiska fordran.
