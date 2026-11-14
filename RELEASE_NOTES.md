Sizzla 3000 0.27.0 för Windows 11 (x64): lokal MCP-anslutning.

- AI-agent har underfliken MCP & anslutningar med en fungerande lokal MCP-server för betrodda klienter.
- Välj läsbehörigheter för företagsuppgifter, kundnamn/fakturor, artiklar/lager och bokförda verifikationer.
- Aktivera med uttrycklig bekräftelse. Slumpad anslutningsnyckel, kopierbart konfigurationsexempel, nyckelbyte och avstängning.
- Servern är avstängd vid varje programstart och företagsbyte. Nycklar lagras inte i databasen eller säkerhetskopior.
- Aktivitetslogg visar begärda, nekade och utförda läsningar utan att spara nycklar, söktexter eller svarsinnehåll.
- Fruit-mode är rättat: 23 unika frukter på huvudflikarna, inga frukter på underflikarna.

MCP stöder lokal Streamable HTTP på 127.0.0.1 med Bearer-nyckel. Detta är lokal HTTP, inte TLS-krypterad fjärråtkomst. Den anslutna klienten kan föra data vidare till sin AI-tjänst. Inga verktyg för utkast, bokföring, betalningar eller lön finns. Extern AI-agent och molnserver återstår. Schema 10 är oförändrat. Se docs/MCP.md.

Det här är en förhandsversion med osignerat installationsprogram. Ladda ned installationsfilen under Assets.
