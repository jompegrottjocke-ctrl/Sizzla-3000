Sizzla 3000 0.30.0 – lagerreservationer och manuell WooCommerce-koppling.

- Bekräftade kundorder reserverar kvarvarande lagerförda antal. Delleverans förbrukar reservationen och avslut frigör resten.
- Lagerlistan, CSV och utskrift visar fysiskt saldo, reserverat, tillgängligt och brist mot reservationer. Verklig inventeringsbrist kan registreras utan att döljas.
- Orderbekräftelser och manuella uttag skyddar andra orderreservationer. Samtidiga bekräftelser kan inte reservera samma sista varor.
- Lager → Webbshop innehåller en manuell WooCommerce-koppling (beta) med SKU-matchning, förhandsgranskning, engångsunderlag och kontroll av ändrade saldon.
- Kopplingen sänker bara det granskade butikssaldot och kräver pausad kassa under överföringen. Den stöder enkla produkter med heltalssaldo, aktiv lagerhantering och inga restorder. Orderimport, påfyllning och automatisk synk ingår inte ännu.
- Nycklar sparas inte i databasen. HTTPS används mot butiken och avbrutna skrivförsök markeras för manuell kontroll utan automatiskt återförsök.

Se docs/WEBSHOP-OCH-RESERVATIONER.md. WooCommerce har testats med simulerade svar, inte mot en riktig butik. Schema 10 och säkerhetskopieformat är oförändrade.

Windows 11 x64 och macOS 15+ (Apple Silicon/Intel). Förhandsversion med osignerade installationsfiler; Mac-appen är inte notarierad hos Apple.
