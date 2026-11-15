# Windows-test utan MCP

Det separata Actions-flödet **Windows diagnostic build without MCP** bygger en diagnostisk variant av 0.34.0. Ordinarie release ändras inte. Artefakten heter **Sizzla-3000-Windows-TEST-utan-MCP** och installationsfilen innehåller `no-mcp` i versionsnumret.

Varianten heter **Sizzla 3000 MCP-test**, har eget app-ID och använder en separat datakatalog som standard. Använd enbart syntetisk demo/testdata. Ange inte SIZZLA_DATA_DIR till en riktig företagsdatabas. Testet behöver ingen import av verksamhetsdata.

Byggskriptet skapar en separat källkopia i `.local/no-mcp`. MCP-server, OAuth-server, MCP-gränssnitt och OAuth-webbläsarskript tas bort och ersätts med en otillgänglighetsmarkering. Beroendena MCP SDK och Zod utelämnas. Befintliga MCP/OAuth-rutter ger ingen åtkomst. Appens vanliga lokala HTTP-API behövs fortfarande för Electron och är kvar; detta är alltså ett test utan MCP, inte utan all lokal HTTP.

Kontrollen verifierar frånvaro av filer/bibliotek, avvisade MCP-rutter, vanlig databasstart och agentvyn i Chromium. Den ändrar inga inställningar i Chrome, antivirus eller Windows.

Jämför nedladdning av ordinarie 0.34.0 och testvarianten i samma webbläsare. Anteckna exakt länk, filnamn, tid och varning. Att testfilen tillåts stärker en hypotes men bevisar inte att MCP är orsaken: även hash, nedladdningsadress och filrykte ändras. En godkänd nedladdning är inte ett säkerhetsintyg. Ingen kodsignering eller ändring av säkerhetsskydd ingår.
