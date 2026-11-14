# Lokal MCP-anslutning

Version 0.27.0. Under **AI-agent → MCP & anslutningar** kan en betrodd MCP-klient få läsbehörighet till det aktiva företaget. Det är Sizzla som erbjuder en MCP-server. Den externa agentanslutningen på den andra underfliken är fortfarande en förberedelse utan implementerad transport.

## Användning

1. Ange ansvarig operatör i operatörspanelen.
2. Öppna **MCP & anslutningar**, ange ett igenkännbart anslutningsnamn och välj vilka uppgifter klienten får läsa. Spara behörigheterna.
3. Läs informationen om klientens åtkomst och eventuell vidareöverföring till AI-tjänster. Bekräfta och klicka **Aktivera MCP-server**.
4. Kopiera anslutningsnyckeln eller det generiska konfigurationsexemplet till din betrodda klient. Klienten behöver stödja **MCP Streamable HTTP** med en `Authorization: Bearer …`-header. Anpassa inställningsformatet till klienten.
5. Använd **Uppdatera status & historik** för att se nya verktygsanrop. **Stäng av och återkalla nyckel** spärrar anslutningen direkt. **Skapa ny anslutningsnyckel** kräver en ny bekräftelse och spärrar den gamla nyckeln.

Programmet måste vara öppet. Servern är avstängd från början och efter **varje programstart och företagsbyte**. Behörigheter och anslutningsnamn sparas per databas, men aktivering och nyckel sparas inte. Skapa en ny nyckel och uppdatera klientens adress efter nästa start; porten kan ändras. En lyckad databasimport stänger också av MCP omedelbart, innan omstarten som tillämpar importen.

Nyckeln visas bara när den skapas. Den finns endast i programmets minne, inte i databasen, säkerhetskopior eller aktivitetsloggen. Omladdning av appfönstret tappar visningen av nyckeln; skapa då en ny vid behov. Vid nyckelbyte i ett annat fönster döljs den gamla nyckeln när status uppdateras. Ett anslutningsnamn är en egen etikett, inte en verifierad identitet hos en AI-leverantör. Den som har nyckeln kan använda de valda behörigheterna.

## Transport och gränser

Adressen visas i appen och har formen `http://127.0.0.1:<port>/mcp`. Samma lokala HTTP-server som appen används. Inget extra nätverksgränssnitt öppnas. Både bindningen och kontroll av Host begränsar servern till `127.0.0.1`. MCP-endpointen kräver en slumpad 256-bitars nyckel och avvisar alla begäranden med en Origin-header, även från appens egen webbsida. Avsikten är en lokal klientprocess, inte direkt anslutning från en webbplats.

Detta är **lokal HTTP på loopback**, inte TLS-krypterad fjärrkommunikation. Åtkomst från andra datorer, molnanslutning och en publik MCP-server ingår inte. Öppna inte appservern genom en tunnel eller portvidarebefordran. Fjärråtkomst med egen autentisering och TLS behöver utvecklas som en separat funktion.

Transporten använder MCP:s officiella SDK. Den är stateless: ett JSON-RPC-meddelande per POST, JSON-svar och inget permanent MCP-session-ID. GET/SSE-prenumerationer, batchanrop och stdio-transport stöds inte här. En klient får göra initialization via SDK:ns protokollförhandling. HTTP-klienten måste acceptera `application/json` och `text/event-stream`, även om svaren i denna version är JSON. Högst 32 KiB begärandekropp tillåts.

Sizzla väljer ingen modell och kontaktar ingen AI-leverantör. Den anslutna klienten kan däremot skicka lästa uppgifter vidare. Bokföring och kundregister kan innehålla personuppgifter även när personalprofiler inte exponeras. Välj klient och behörigheter utifrån verksamhetens behov. MCP-behörigheterna begränsar MCP-verktygen; de är inte en operativsystemssandbox för lokal programvara som redan körs med användarens konto.

## Verktyg

Alla fyra behörigheter är avstängda från början. Endast verktyg som den aktuella anslutningen får använda annonseras i `tools/list`. Samtliga är märkta som läsande och saknar åtgärder för att skriva affärsuppgifter.

| Behörighet | Verktyg | Uppgifter |
| --- | --- | --- |
| Företag | `sizzla_company` | Företagsnamn, organisationsnummer och bokföringsvaluta SEK. |
| Försäljning | `sizzla_customers` | Kund-ID, namn och organisationsnummer. Kontaktuppgifter och adress utelämnas. |
| Försäljning | `sizzla_invoices` | Utfärdade kundfakturor/krediter, kundnamn, datum, förfallodatum, valuta, belopp, kvarstående saldo, SEK-värden och om aktiv bokföring finns. Utkast utelämnas. |
| Lager | `sizzla_stock` | Artikel-ID, nummer, namn, enhet, om lagerföring är aktiv, saldo och beställningspunkt. |
| Bokföring | `sizzla_vouchers` | Bokförda verifikationer, år-ID, nummer, datum, referens, beskrivning, rader och kopplingar till rättelser. Både original och motbokningar ingår; utkast utelämnas. |

Listverktygen tar valfria `search`, `offset` och `limit`. Söktexten får vara högst 200 tecken. `offset` är 0–100000 och `limit` är 1–100, med standard 25. Resultatet anger `items`, `total`, `offset`, `limit` och `nextOffset`. Listornas ordning är registreringsordning, senast registrerad först; det är inte en periodrapport. Okända argument och ogiltiga gränser avvisas.

Belopp är heltal i valutans minsta enhet: 12500 betyder exempelvis 125,00 SEK/EUR/USD. Lagerkvantiteter är heltal i hundradelar: 250 betyder 2,50 av angiven enhet. Fakturornas `totalSek` och `remainingSek` är sparade bokföringsvärden, inte en ny marknadsvärdering. Nollsaldo för en artikel som inte lagerförs ska inte tolkas som en lagerbrist. Verktygen läser registrerade uppgifter; AI-klienten ansvarar för sin tolkning och ska behandla text i underlag som data, inte instruktioner.

Inga verktyg finns för att skapa utkast, utfärda fakturor, bokföra, betala, köra lön, läsa personalprofiler, lämna deklarationer, aktivera andra företag eller ändra behörigheter. Sådana framtida funktioner behöver egna kontroller och godkännanden. Den externa agentens sparade betabehörigheter ger ingen MCP-åtkomst.

## Historik och lagring

Inställningsändring, aktivering, avstängning och nyckelbyte sparas med ansvarig operatör. Ett autentiserat verktygsanrop registreras som begärt eller nekat. Genomförd läsning registreras separat, med verktygsnamn och antal returnerade poster. En begäran är inte bevis på att läsningen slutförts. Nycklar, söktexter, råa argument och returnerat innehåll loggas inte. Felaktiga nycklar/Origin-begäranden loggas inte som agentåtgärder.

De senaste 100 händelserna visas; äldre händelser finns kvar i databasen. Inställningar och logg ligger i `records` som `mcp_config` och `mcp_event` och ingår i fullständig databasexport/import. MCP-aktivitet ändrar inte bokföringen eller bokslutets källfingeravtryck. Schema 10 är oförändrat.

Företagsbyte spärrar den gamla anslutningen, också om en begäran har börjat läsas men ännu inte behandlats. En ny aktivering behövs även när man byter tillbaka till samma företag. Därmed kan en gammal anslutning inte följa med till ett annat företag.
