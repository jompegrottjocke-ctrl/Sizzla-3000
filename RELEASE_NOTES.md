Sizzla 3000 0.34.0 – MCP-autentisering och klientkontroll.

- Valbar manuell Bearer-nyckel, lokal OAuth Authorization Code + PKCE S256 eller båda.
- Aktivering i 15 minuter, 1 timme (standard) eller 8 timmar. OAuth kräver uttryckligt godkännande av klient och behörigheter i Sizzla.
- Klientlista med behörigheter, senaste aktivitet, verklig källadress och självdeklarerat klientprogram. Kasta ut en klient utan att återkalla andra OAuth-klienter.
- Byte av enbart manuell nyckel kan behålla OAuth-klienter. Global återställning, avstängning, företagsbyte och omstart återkallar allt.
- Hemliga autentiseringsuppgifter och klientaktivitet finns endast i minnet. Verktygen är fortsatt endast läsande.

MCP är endast tillgängligt lokalt på 127.0.0.1. Ingen publik server, TLS-brygga eller direkt anslutning från ChatGPT i molnet ingår. Namn verifierar inte en persons identitet; program som delar manuell nyckel kan inte särskiljas. Se docs/MCP.md.

Schema 10 och säkerhetskopieformat är oförändrade. Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
