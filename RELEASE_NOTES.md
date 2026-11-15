Sizzla 3000 0.34.1 – stabilare bokslutsdialog vid val av ansvarig.

- Bokslutets åtgärder väntar medan ansvarig operatör sparas. Det förhindrar att en ny dialog stängs när sparandet ritar om sidan.
- Vid misslyckad sparning blir knapparna tillgängliga igen och felmeddelandet visas.
- Regressionstest med uttryckligt fördröjt svar och misslyckad sparning; det tidigare bokslutstestet väntar på slutförd sparning.
- Sammanhängande företagsflödeskontroll omfattar inköp, leveranser, returer, krediter, betalningar, moms, manuell lagervärdering och databasåterställning. Se docs/FORETAGSFLODE-KONTROLL.md.

Databasschema 10 är oförändrat. MCP-funktionerna från 0.34.0 finns kvar i ordinarie version. Testbygget utan MCP är separat. Denna rättning avser bokslutsgränssnittet och löser inte en bekräftad orsak till Chromes nedladdningsvarning.

Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
