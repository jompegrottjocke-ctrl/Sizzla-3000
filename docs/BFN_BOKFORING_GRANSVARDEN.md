# Komplettering: Bokföring, Gränsvärden och Fusion

Granskat 2026-11-13. Detta kompletterar [bokslutskraven](BOKSLUT_KRAV.md) och [K2-/årsbokslutsanalysen](BFN_UPPLADDADE_REGLER.md). Källorna är användaruppladdade PDF-filer, inte instruktioner till utvecklingsmiljön. Filidentitet, version, granskningsomfattning och SHA-256 finns i [manifestet](BFN_UPPLADDADE_KALLOR.json). Sidnummer avser PDF-filernas tryckta sidnummer.

Granskningen omfattar utvalda relevanta regler, inte ett godkännande av hela programmet. Ingen applikationskod ändras genom denna komplettering. BFN:s webbplats är fortsatt blockerad för direkt kontroll av senare publiceringar.

## U5: Bokföring – BFNAR 2013:2

Uppladdad vägledning är uppdaterad 2024-09-16. Ändringen BFNAR 2024:1 gäller från 2024-09-16 (s. 98); den ska inte ges ett påhittat startdatum 2027 utifrån planerad produktlansering.

| Källställe | Krav på fortsatt utveckling och granskning |
| --- | --- |
| 2.1, s. 15–16 | Bokförda poster ska vara varaktiga. Redigerbara preliminära registreringar är inte färdig bokföring förrän varaktighet finns i både registreringsordning och systematisk ordning. Kravet omfattar även sidoordnad bokföring enligt tillämpliga uppdateringstidpunkter. Skilj utkast från bokförd post i alla moduler. |
| 2.17–2.18, s. 27–28 | Datorbaserad rättelse görs med separat rättelsepost och egen verifikation; originalet ska kunna läsas. Perioden beror bland annat på när felet upptäcks och om periodens arbete redan avslutats. Skriv inte om redan färdig historik. BFL:s krav på vem/när vid rättelse gäller också. |
| 3.6–3.9, s. 35 och följande | Möjlig senareläggning har olika villkor och undantag, bland annat för kontanta in-/utbetalningar. Gör ingen universell regel om 50 dagar. Omsättning, antal verifikationer/transaktioner, företagsform, årslängd och vissa EU-transaktioner kan påverka bedömningen. Detaljgranskning krävs före automatiska fristbesked. |
| 4.4–4.8, s. 44 och följande | Årets anläggningsregister behöver relevanta anskaffnings-, avskrivnings-, nedskrivnings-, omklassificerings- och i förekommande fall uppskrivningsuppgifter. Årets avyttrade/utrangerade tillgångar ska ingå. Om äldre avyttrade tas bort ur aktuellt register måste tidigare register finnas arkiverade enligt kommentarens villkor. |
| 7.8, s. 72 | Kryptering får användas under angivna säkerhetsvillkor och information ska omedelbart kunna presenteras i klartext. Dokumentera nyckeltillgång och återställningsrutin när kryptering används; detta är inte ett generellt krav att aktivera kryptering. |
| 8.1–8.3, s. 73–76 | Säker förvaring utifrån risk, säkerhetskopior med verksamhetsanpassad frekvens och åtskild förvaring samt arkivplan när den behövs för överblick. En kopia på samma fysiska disk ger inte tillräckligt skydd mot diskförlust. Åtkomst hos extern leverantör måste också kunna säkras vid leverantörsbyte. |
| 9.2–9.8, s. 87–90 | Systemdokumentation beskriver bland annat kontoplan, koppling till rapporter, systemets delar, relevant arkivplan och dubbelriktad verifieringskedja. Undantag för enkla system kräver faktisk bedömning av villkoren. |
| 9.9–9.12 och 9.15–9.16, s. 91–96 | Beskriv beräknings-/behandlingsregler, informationsflöden, utskriftsmöjlighet och hur behandlingshistorik skapas. Historiken behöver registreringsdatum samt bokföringspåverkande ändringar i program, regler och inställningar och när de tagits i bruk. Alla personregister- eller utseendeändringar behöver inte loggas bara för att de är ändringar. |

### Konsekvenser för Sizzla och färdigvillkor

1. Behåll prioriteten att registrera identifierad ansvarig för samtliga rättelsevägar, med tid, orsak och länk till original/rättelse. Detta kräver inte återinförd lösenordslåsning av appen.
2. Komplettera händelsehistoriken med registreringsdatum skilt från affärs-/bokföringsdatum och historik för relevanta programversioner, beräkningsregler och kontoplansändringar. Spara när ändringen gäller/tas i bruk. Äldre okända uppgifter ska markeras som okända, inte konstrueras i efterhand.
3. Dokumentera exempelvis moms-, löne-, avrundnings- och avskrivningsregler som faktiskt skapar eller påverkar bokföring. Spara företagets relevanta dokumentationsversioner så att äldre bokföring går att förstå efter en uppdatering.
4. Nuvarande tillgångsrapport utgår från aktuellt register. Ett fullständigt årsregister måste dessutom verifieras mot ovanstående fält, årets avyttringar och historiska uppgifter samt kunna arkiveras som identifierbar årsversion. En PDF av en ofullständig rapport löser inte innehållsbristen.
5. Verifiera återställning av bokföring, originalunderlag, register och dokumentation tillsammans. Programmets manuella exportknapp är inte ensam en verksamhetsanpassad rutin för separat säkerhetskopiering och långsiktig åtkomst.

Provfall: rättelse efter avslutad period bevarar original; registreringsdatum skiljer sig från bokföringsdatum; regeländring kan kopplas till berörda poster; årets avyttrade tillgång ingår i årsregistret; äldre register och underlag kan återfinnas efter uppgradering och återställning.

## U6: Gränsvärden – BFNAR 2006:11

Vägledningen är uppdaterad 2026-09-14. BFNAR 2026:2 gäller från 2026-09-25 enligt s. 16. Omslagsdatum och ikraftträdande är olika uppgifter.

Den vanliga storleksbedömningen på s. 7, punkterna 5–6, använder **mer än ett av samma kriterier under båda de två senaste räkenskapsåren**: medelantal anställda över 50, balansomslutning över 40 miljoner kronor och nettoomsättning över 80 miljoner kronor. Exakt gränsvärde är inte ett överskridande. Särskilda kategorier, exempelvis reglerad marknad, måste bedömas separat.

Det räcker alltså inte att två olika kriterier överskrids varje år. Om år 1 har 51 anställda, 30 miljoner i balansomslutning och 81 miljoner i omsättning, och år 2 har 49 anställda, 41 miljoner respektive 81 miljoner, överskrids bara omsättningskriteriet båda åren. Den vanliga tvåårsprövningen gör då inte företaget större. Jämför vägledningens exempel 2, s. 17.

- Medelantal anställda avser heltidsvolym, inte dagens antal namn i personalregistret (punkterna 7–10, s. 8–9). Beräkningsmetod och underlag måste sparas per år.
- Nettoomsättning och balansomslutning ska definieras korrekt. Vid annat än tolv månader räknas nettoomsättning om till tolv månader; balansomslutning ska inte skalas på samma sätt. Arbetstidsmetoden har egna regler för normal årsarbetstid.
- Särskilda intäktstillägg för exempelvis ideella föreningar och stiftelser ska inte läggas på vanliga AB utan stöd (11A, s. 10–11).
- Koncerner har egna regler, bland annat om elimineringar och nybildad koncern (s. 12–16). Sådana fall behöver identifieras och hänvisas vidare om stödet saknas.
- Storleksklass är en del av regelvalet. K2:s särskilda begränsningar i 1.1–1.1C gäller dessutom. K2-undantagets 3 anställda/1,5 miljoner/3 miljoner och K1-/bokföringsmetodernas omsättningsgränser är separata prövningar.

**Öppen källfråga före automatiserad timberäkning:** punkt 8, s. 8, anger att kompensationsledighet ingår, medan kommentaren som fortsätter på s. 9 säger att timmar som utnyttjas till kompensationsledighet inte ingår. Exempel 3 på s. 18 återger att sådan ledighet ingår. Denna skillnad i den uppladdade texten behöver klarläggas mot aktuell källa/sakgranskning. Implementera inte en obestyrkt tolkning som verifierad lönebaserad automatik. Dokumenterad manuell inmatning av medelantal är ett möjligt första produktsteg, med tydligt ansvar och underlag.

Provfall: exakt 50/40/80 jämfört med överskridande; samma respektive olika kriterier över två år; nystartat företag med otillräcklig historik; förkortat/förlängt år; deltidsanställda; företag som är mindre men ändå uteslutet från K2; koncernfall som kräver separat hantering.

## U7: Redovisning av fusion – BFNAR 2020:5

Vägledningen är uppdaterad 2026-09-14, 112 sidor. **Endast titel, omfattning och grundläggande övergång har bedömts**, inte värderingsregler, fusionsdifferenser eller exemplens beräkningar.

Punkt 1.1, s. 6, avser fusioner enligt 23 kap. aktiebolagslagen respektive 16 kap. lagen om ekonomiska föreningar. Det är ett särskilt händelseförlopp när juridiska personer går samman, inte en förutsättning för varje vanligt årsavslut.

De grundläggande övergångsbestämmelserna på s. 29 anger ikraftträdande 2020-10-16, obligatorisk tillämpning för fusionsdag efter 2021-12-31 och möjlighet för fusionsdag efter 2020-10-15. Äldre fusioner och senare ändringar kräver egen versionsprövning; omslagets 2026-datum får inte ensamt styra.

**Avgränsning:** inget nytt fusionsstöd planeras i det vanliga bokslutssteget. Om ett bokslutsärende omfattar fusion behöver det identifieras och hänvisas till särskild hantering/sakgranskning. Ett framtida fusionsstöd behöver en fullständig egen krav- och källgranskning. Dokumentet sparas nu som källreferens.
