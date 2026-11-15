# Lokal MCP-anslutning

Version 0.34.0. Under **AI-agent → MCP & anslutningar** kan en betrodd MCP-klient få läsbehörighet till det aktiva företaget. Det är Sizzla som erbjuder en MCP-server. Den externa agentanslutningen på den andra underfliken är fortfarande en förberedelse utan implementerad transport.

## Användning

1. Ange ansvarig operatör i operatörspanelen.
2. Öppna **MCP & anslutningar**, ange ett igenkännbart anslutningsnamn och välj vilka uppgifter klienten får läsa. Spara behörigheterna.
3. Läs informationen om klientens åtkomst och eventuell vidareöverföring till AI-tjänster. Bekräfta och klicka **Aktivera MCP-server**.
4. Vid manuell Bearer-autentisering: kopiera anslutningsnyckeln eller det generiska konfigurationsexemplet till din betrodda klient. Klienten behöver stödja **MCP Streamable HTTP** med en `Authorization: Bearer …`-header. Anpassa inställningsformatet till klienten.
5. Använd **Uppdatera status & historik** för att se nya verktygsanrop. **Stäng av och återkalla nyckel** spärrar anslutningen direkt. **Skapa ny anslutningsnyckel** kräver en ny bekräftelse och spärrar den gamla nyckeln.

Programmet måste vara öppet. Servern är avstängd från början och efter **varje programstart och företagsbyte**. Behörigheter och anslutningsnamn sparas per databas, men aktivering och nyckel sparas inte. Skapa en ny nyckel och uppdatera klientens adress efter nästa start; porten kan ändras. En lyckad databasimport stänger också av MCP omedelbart, innan omstarten som tillämpar importen.

Nyckeln visas bara när den skapas. Den finns endast i programmets minne, inte i databasen, säkerhetskopior eller aktivitetsloggen. Omladdning av appfönstret tappar visningen av nyckeln; skapa då en ny vid behov. Vid nyckelbyte i ett annat fönster döljs den gamla nyckeln när status uppdateras. Ett anslutningsnamn är en egen etikett, inte en verifierad identitet hos en AI-leverantör. Den som har nyckeln kan använda de valda behörigheterna.

## Autentisering och klientkontroll i 0.34.0

Välj manuell Bearer-nyckel, OAuth eller båda. Aktiveringen varar 15 minuter, 1 timme (standard) eller 8 timmar. Sparade behörighetsändringar, global återställning, avstängning, omstart, företagsbyte och lyckad databasimport återkallar all åtkomst. När utgången har konstaterats återaktiveras inte gamla uppgifter om datorns klocka ställs tillbaka.

OAuth använder Authorization Code med obligatorisk PKCE S256, resursbindning och separata behörigheter per klient. En kompatibel lokal MCP-klient hittar metadata via `WWW-Authenticate` och OAuth discovery, registrerar sig och öppnar webbläsaren. Öppna **Uppdatera status & historik** i Sizzla, kontrollera klientnamn, callback-adress och begärda behörigheter, och godkänn eller neka uttryckligen. En begäran väntar högst fem minuter. En engångskod gäller högst en minut; en åtkomsttoken högst en timme och aldrig längre än aktiveringen. Det finns inga refresh tokens, klientlösenord, OpenID-inloggning eller client-credentials-flöden.

Endast publika lokala klienter stöds. Callback måste vara en registrerad exakt `http://127.0.0.1:<port>/...`-adress, med uttrycklig port skild från Sizzlas port, utan användaruppgifter, frågesträng eller fragment. DNS-namnet localhost och IPv6-callback stöds inte. Högst fem callback-adresser per registrering, 50 klientregistreringar, 20 väntande begäranden och 50 aktiva tokens tillåts per aktivering. Registrering ger inte i sig åtkomst.

Under **Klienter & senaste aktivitet** visas klientnamn, behörigheter, senaste autentiserade anrop, klientprogram, källadress och senaste TCP-port. Adressen hämtas från den verkliga anslutningen; vidarebefordrade IP-headerfält ignoreras. Servern är lokal, så adressen blir normalt 127.0.0.1. HTTP-anrop är tillfälliga: listan visar beviljad åtkomst och aktivitet, inte en permanent uppkoppling. Namn och klientprogram är självdeklarerade och verifierar inte en person, process eller AI-leverantör.

**Kasta ut / återkalla åtkomst** spärrar alla tokens och väntande koder för vald OAuth-klient, utan att påverka andra klienter. För en manuell nyckel spärras samtliga program som delar nyckeln; de kan inte särskiljas. **Ny manuell nyckel (behåll OAuth-klienter)** ersätter endast Bearer-nyckeln. Global återställning och avstängning återkallar även OAuth-klienterna. Redan lästa uppgifter kan inte tas tillbaka.

Aktivitet och källadresser hålls bara i minnet. OAuth-godkännanden, nekanden, utfärdanden och återkallanden loggas med klient-ID och behörigheter. Ansvarig operatör är den angivna operatören vid godkännandet, inte en verifierad inloggad person hos klienten; begäranden utan godkännande tillskrivs ingen person. Hemliga nycklar, koder, verifierare, pollningsbiljetter och OAuth-state sparas inte i databasen eller historiken. Den lokala appens befintliga tillitsmodell gäller fortfarande: detta skyddar inte mot program som redan har samma operativsystemskontos fil- och API-åtkomst.

Verifierat med officiella MCP SDK-klienter, verklig lokal webbläsarcallback, engångskoder, tokenutgång, selektiv återkallelse och företagsisolering. Ingen anslutning från ChatGPT i molnet har testats eller möjliggjorts; en separat autentiserad HTTPS-brygga behövs för fjärråtkomst.

## Transport och gränser

Adressen visas i appen och har formen `http://127.0.0.1:<port>/mcp`. Samma lokala HTTP-server som appen används. Inget extra nätverksgränssnitt öppnas. Både bindningen och kontroll av Host begränsar servern till `127.0.0.1`. MCP-endpointen kräver en giltig manuell nyckel eller OAuth-token och avvisar alla begäranden med en Origin-header, även från appens egen webbsida. Avsikten är en lokal klientprocess, inte direkt anslutning från en webbplats.

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
