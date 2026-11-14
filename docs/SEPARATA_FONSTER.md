# Huvudflikar i separata fönster

Version 0.28.0. I skrivbordsappen finns **Öppna i eget fönster** vid varje huvudfliks rubrik. Det öppnar modulen i ett vanligt Windows-fönster som kan flyttas till en annan skärm, storleksändras och användas parallellt med huvudfönstret.

## Användning

- Öppna exempelvis Bokföring i huvudfönstret och välj **Öppna i eget fönster**. Fortsätt sedan med Fakturering i huvudfönstret.
- Extrafönstret visar det aktiva företaget, dess inställningar och samma sparade uppgifter. Företagsnamnet syns i fönsterrubriken och överst i vyn. Sidomenyn döljs för att lämna plats åt modulen.
- Knappen **Visa huvudfönstret** fokuserar huvudfönstret. Om det har stängts medan andra modulfönster finns kvar öppnas ett nytt huvudfönster.
- Ett befintligt extrafönster som visar den efterfrågade modulen återanvänds och fokuseras vid ny öppning.
- Stänger du ett extrafönster finns fliken kvar i huvudfönstret. Osparade formulär ger en fråga där du kan fortsätta redigera eller kasta ändringarna.

Fönstren har egna urval och redigeringsformulär. Ett nytt modulfönster öppnar huvudfliken med dess startvy; ett öppet formulär eller en pågående redigering kopieras inte. Källänkar kan öppna relaterade moduler i samma extrafönster. Detta steg använder knappar och vanliga fönster, utan draglossning/dockning av flikar.

Funktionen gäller skrivbordsappen. Webbläsarvyn får ingen separat fönsterknapp. Utskriftsförhandsgranskning fortsätter i egna utskriftsfönster och fungerar även från ett modulfönster.

## Uppdateringar och samtidig redigering

En lyckad åtgärd i ett appfönster meddelar de andra fönstren i samma företagsdatabassession. En fri vy utan redigering, osparade formulär eller öppna dialoger uppdateras automatiskt. Befintliga urval i modulens minne behålls. Sökning eller inmatning som har fokus avbryts inte av en automatisk omrendering.

Om ett fönster arbetar med ett formulär eller en dialog visas i stället **Uppgifter har ändrats i ett annat fönster**. Spara eller stäng redigeringen och använd **Uppdatera vyn** när du är klar. Ett vanligt formulär med osparade ändringar kan kräva uttryckligt godkännande innan en manuell uppdatering kastar ändringarna. Språk, tema, textstorlek och fruit-mode läses från samma företagsinställningar; även dessa uppdateras när vyn kan uppdateras säkert.

Kunder, artiklar, fakturautkast och företagsuppgifter får en beräknad versionsmarkering i gränssnittet. Sparar två fönster samma post kontrolleras den version som redigeraren öppnade. Den äldre redigeringen avvisas med ett konfliktmeddelande i stället för att skriva över den nyare. Formuläret behålls så att text kan kopieras innan posten öppnas på nytt. De övriga affärsmodulerna använder sina befintliga revisions-/granskningskontroller. Det sker ingen automatisk sammanslagning av ändringar.

## Företagsbyte

Företagsbyte görs i huvudfönstret. Vid försök från ett extrafönster hänvisar programmet dit.

Innan byte kontrolleras alla öppna modulfönster och huvudfönstret. Osparade uppgifter, en öppen redigerare eller en pågående skrivåtgärd blockerar byte. Spara eller stäng redigeringen och försök igen. Fönstrens formulär pausas tillfälligt under själva kontrollen och bytet, så att ingen ny inmatning kan tillkomma mellan kontroll och stängning. Vid misslyckat byte låses gränssnitten upp och tidigare företag finns kvar.

Vid lyckat byte stängs extrafönstren och utskriftsfönstren. Huvudfönstret läser in det valda företaget via det vanliga bytesflödet. Andra klienters gamla databassessioner spärras som tidigare. Pågående utskrifts-/PDF-åtgärder blockerar fortfarande byte. Lokala MCP-nycklar återkallas som tidigare.

## Teknik och lagring

`src/desktop-windows.cjs` kontrollerar fönsteröppning och byte. IPC kräver ett registrerat appfönster på rätt lokala ursprung, huvudram och aktuell sessionstoken. Modulnamn begränsas till `public/window-pages.js`. Extrafönster använder samma isolerade preload, sandbox och avstängda Node-integration som huvudfönstret.

`public/windows.js` och `public/windows.css` visar knappar, företagskontext, uppdateringsmeddelanden och hanterar byte. Uppdateringar skickas över en BroadcastChannel för samma databassession. Gamla svar från överlappande datainläsningar får inte ersätta ett senare initierat svar. Automatisk uppdatering ändrar inte affärsuppgifter. Öppna fönster och deras placering återställs inte automatiskt vid nästa start.

Versionsmarkeringen `recordVersion` beräknas från sparade uppgifter och lagras inte i affärsposten. Redigerarna skickar den med sparandet. Äldre interna API-anrop utan markeringen behåller tidigare beteende; detta är ingen ny offentlig skriv-API för externa klienter. Modulernas övriga validering och spärrar gäller fortfarande.

Schema 10 och säkerhetskopieringsformat är oförändrade. När sista appfönstret stängts avslutas programmet och den befintliga automatiska kopieringen vid avslut kan köras. Att avbryta en stängning med osparade ändringar avslutar inte databastjänsten.
