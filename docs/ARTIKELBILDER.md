# Valfri artikelbild – 0.36.0

Öppna **Artiklar & tjänster → Ny artikel** eller **Öppna** på en befintlig artikel. **Välj eller byt bild** visar en förhandsvisning. Bilden sparas först tillsammans med artikeln när du väljer **Spara**. **Avbryt** lämnar den tidigare sparade bilden kvar. **Ta bort bild** följt av Spara tar bort bilden. Artiklar utan bild fungerar som tidigare.

JPEG, PNG och WebP stöds som uppladdning, högst 10 MB. Bilden läses lokalt i appen, förminskas till högst 384 × 384 bildpunkter med bevarade proportioner och kodas om till JPEG. Genomskinlig bakgrund blir vit. Den sparade bilden får vara högst 150 KiB; originalfilen sparas inte. Uppladdning och sparformat kontrolleras på servern. SVG, externa bildadresser och andra filformat accepteras inte.

Miniatyrer visas i artikelregistret och Lager → Lagersaldo. Klick öppnar en större visning. Svenska, engelska och stor text stöds. Bilden läggs inte automatiskt på fakturor, orderdokument eller utskrifter och skickas inte till en webbshop eller MCP-klient.

## Lagring och samtidiga ändringar

Bilden ligger i samma företagsdatabas som artikeln, i en separat `records`-post med typen `article_photo` och artikelns ID. Posten innehåller JPEG-data och en versionsmarkering. Ingen extern bildkatalog eller molnlagring används. Fullständig export/import, automatiska säkerhetskopior och återställning omfattar bilderna. Äldre databaser kräver inga bildposter eller ändrat databasschema.

Artikel- och lagerlistor innehåller bara bildstatus och version. Bilddata hämtas separat först när den visas, så att alla bilder inte följer med varje registerfråga. Bildadressen är bunden till aktiv databassession och aktuell bildversion. Cachelagring är avstängd och en gammal företagsadress ger ingen bild från ett nytt företag.

Bildändring och artikeluppgifter sparas atomiskt. En gammal bildversion kan inte skriva över en senare ändring. Vanlig artikeluppdatering eller CSV/Excel-import som saknar bildfält lämnar bilden kvar. Bilder importeras inte från CSV/Excel-filer.

Bilder ändrar inte lagerantal, reservationer eller bokföringsposter och kopieras inte in i fakturaunderlag. En ren bildändring påverkar inte bokslutets källfingeravtryck. Bildposter valideras också vid databasimport. Funktionen är bildhantering, inte ett originalarkiv för bokföringsunderlag.

## Verifiering

Automatiska tester omfattar giltig/ogiltig bild, storleksgränser, konflikt, separata bildanrop, företagsisolering, bevarande vid vanlig uppdatering och artikelimport, export/återställning och oförändrad bokföring/bokslutsfingeravtryck. Gränssnittstestet provar förminskning, förhandsvisning, byte, avbryt, borttagning, lagerbild, engelska och 200 % text med synlig Spara-knapp.
