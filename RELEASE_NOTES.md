Sizzla 3000 0.34.2 – stabila språk- och temabyten.

- Under sparandet av språk eller tema väntar övriga formuläråtgärder. Det hindrar att en ny dialog öppnas innan språkbytet ritar om sidan och stänger den igen.
- Osparade uppgifter bevaras vid språk- och temabyte, även när sparandet misslyckas. Kontroller återaktiveras efter svar.
- Regressionstest håller kvar inställningssvaret, kontrollerar en samtidig omritning och provar både fel och lyckad sparning.
- Valuta-, arbetsöversikts- och återkommande faktureringstester sätter egna startinställningar, så att ett tidigare avbrott inte lämnar fel språk.
- GitHub behåller felkontext från misslyckade gränssnittstester som en separat artefakt för Windows respektive Mac-arkitektur.

Rättningen av bokslutets operatörssparning från 0.34.1 ingår. Databasschema 10 är oförändrat. MCP finns kvar i ordinarie version; testbygget utan MCP är separat. Denna rättning gäller gränssnitt och tester och är inte en lösning på Chromes nedladdningsvarning.

Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
