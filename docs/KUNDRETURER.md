# Kundreturer – 0.35.0

Kundreturer finns under **Fakturering → Kundorder → Öppna order**. Välj **Registrera kundretur** vid den ursprungliga leveransen. En retur kan registreras för bekräftade eller avslutade order som har en aktiv leverans av lagerförda artiklar.

## Registrera mottagna varor

1. Välj leverans. Ange verkligt mottagningsdatum, en unik returreferens för leveransen och orsak.
2. Ange de antal som faktiskt återkommit till lager. Nollrader utelämnas. Högst två decimaler tillåts och tjänster/ej lagerförda rader kan inte väljas.
3. Granska och bekräfta. KR-nummer tilldelas och lagret fylls på i samma databastransaktion. Ansvarig operatör sparas; detta är en lokal ansvarsuppgift, inte verifierad inloggning.

Antalet får inte överstiga levererat antal minus tidigare aktiva returer för samma leveransrad. Referensen kan inte återanvändas för samma leverans, även om en tidigare registrering har rättats; använd ett nytt rättelseunderlag. Revisionskontroll för leverans och order stoppar dubbelklick och samtidiga anrop från samma granskade läge. Kopplade lagerrörelser har dessutom unika källreferenser.

Retur skapar ingen faktura, kredit, kvittning, betalning eller verifikation. Prisavdrag utan fysisk retur ska hanteras med kreditfaktura utan kundretur. Registrera inte samtidigt en manuell lagerinleverans för samma varor. Programmet kan inte identifiera att en äldre fristående manuell rörelse avser samma fysiska retur; granska äldre underlag innan den nya funktionen används.

Orderns ursprungliga levererade och fakturerade antal ändras inte. Returen frigör inte antal för ny fakturering eller återsändning och återskapar inte reservationer. En eventuell ersättningsleverans behöver hanteras som en ny order.

## Koppla kreditunderlag

Skapa kredit genom det vanliga kundfakturaflödet om affären kräver det. Använd sedan **Koppla / ändra kredit** på returposten. Ange orsak och bekräfta.

Krediten måste vara bokförd och avse en originalfaktura som skapats från samma kundorder och innehåller returens ursprungliga leverans. Kreditens ursprungliga fakturarader måste täcka returantalet. Flera returer kan kopplas till en kredit, men deras sammanlagda antal per rad får inte överstiga kreditens antal. Kopplingen är en underlagsreferens; den ändrar varken lagersaldo, fakturabelopp, kvittning eller bokföring.

En felaktig koppling kan ändras eller tas bort med dokumenterad orsak. Föregående koppling och ansvarig bevaras i historiken. **Ingen kreditkoppling** betyder bara att returen saknar den referensen; det är ingen bedömning av om kunden har rätt till kredit. En senare motbokning av den finansiella krediten tar inte bort returens historiska referens. Granska fakturans aktuella bokföringsstatus separat.

## Rätta felregistrering

**Rätta returregistrering** används när registreringen blev fel, inte för att registrera en verklig utleverans. Ange datum, orsak och granska. Koppla först bort eventuell kreditreferens. En motsatt lagerrörelse skapas och originalet bevaras.

Rättelsen nekas om den skulle skapa negativt historiskt saldo, ta andra orders reserverade lager eller bryta en senare inventering. Datum får inte ligga före ursprunglig leverans/retur eller i framtiden. En ursprunglig leverans kan inte återtas medan den har aktiva kundreturer; dessa måste hanteras först. Det vanliga skyddet för fakturerade leveranser finns kvar.

## Historik, lagring och gränser

Ordervyn visar KR-nummer, datum, returreferens, rader, ansvarig, orsak, rättelser och kreditkoppling. Lagerhistoriken visar **Kundretur** respektive **Rättelse av kundretur** med länk tillbaka till ordern. Båda språken stöds.

`trade_return` och tillhörande `trade_event`/nummerserie ligger i befintliga `records`. Returens ursprungsuppgifter skyddas mot ändring/radering med databasregler. Rättelsestatus och aktuell kreditreferens är separata uppdateringar med bevarad händelsehistorik. Lagerrörelser använder `source_kind=trade_return` respektive `trade_return_reverse`. Schema 10 behålls; inga befintliga leveranser, krediter eller manuella lagerposter räknas om retroaktivt. Äldre säkerhetskopior utan returer och utan de två nya returreglerna tillåts och får reglerna vid öppning samt en tom returlista. En kopia med returposter men utan reglerna avvisas. Övrig schemakontroll är oförändrad. Export/import och företagsbyte omfattar returposter och historik.

Första versionen hanterar mottagning tillbaka till befintligt lager. Ingen separat karantän, skadat gods, automatisk lagerkostnadsbokföring, returetikett eller uppdatering av WooCommerce/Shopify ingår. Webbshopsorder kan ha lokala fysiska returer men externa återbetalningar och lagersynk måste hanteras separat. Leverantörsreturer hanteras sedan 0.37.0 via det separata [leverantörsreturflödet](LEVERANTORSRETURER.md).

## Verifiering

Automatiska tester täcker delreturer, överretur, tjänster, ogiltiga datum/antal, dubbelregistrering, samtidiga anrop, oförändrad finansiell data vid kreditkoppling, kreditkapacitet, annan faktura, avslutad order, företagsisolering, rättelse, reservationer, inventeringsgräns och återställning. Företagsflödeskontrollen använder nu en leveranskopplad kundretur och kreditreferens. Ett gränssnittstest går genom registrering, koppling, bortkoppling och rättelse samt engelsk vy och lagerlänk. Tester ersätter inte granskning av verkliga returunderlag.
