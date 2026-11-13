// Blog articles shown at /blog and /blog/<slug>. CommonJS on purpose, like
// rentalPages.js: the Express server reads this file too, for the sitemap.
//
// Body blocks:
//   { type: 'p', text }                    paragraph
//   { type: 'h2', text }                   section heading
//   { type: 'ul', items: [text, ...] }     bullet list
//   { type: 'tip', text }                  highlighted tip box
//   { type: 'cta', category, text }        link to the rental landing page of a
//                                          category id from rentalPages.js
//
// `categories` links the article to rental landing pages: the article shows
// links to them, and those landing pages link back to the article.
module.exports = {
  posts: [
    {
      slug: 'partytent-huren-welke-maat',
      title: 'Partytent huren: welke maat heb je nodig?',
      metaTitle: 'Partytent huren: welke maat heb je nodig? | OmniRent',
      metaDescription:
        'Hoe groot moet je partytent zijn? Reken het uit per aantal gasten, zittend of staand, en lees waar je op let bij ondergrond, wind en levering.',
      excerpt:
        'Te kleine tent, te veel gasten: de meest gemaakte fout bij een tuinfeest. Zo reken je de juiste maat uit.',
      publishedAt: '2026-11-13',
      updatedAt: '2026-11-13',
      readMinutes: 4,
      categories: ['partytent'],
      body: [
        {
          type: 'p',
          text:
            'Een partytent maakt je feest onafhankelijk van het weer. Maar de vraag die bijna iedereen stelt: hoe groot moet die tent eigenlijk zijn? Te klein en je gasten staan buiten in de regen, te groot en je betaalt voor lege ruimte en past ze misschien niet eens in je tuin. Met een paar vuistregels zit je snel goed.',
        },
        { type: 'h2', text: 'Reken per gast: zittend of staand?' },
        {
          type: 'p',
          text:
            'De belangrijkste vraag is of je gasten aan tafel zitten of vooral rondlopen. Een receptie of drink vraagt minder ruimte dan een diner aan tafels.',
        },
        {
          type: 'ul',
          items: [
            'Staande receptie: reken ongeveer 0,5 tot 0,8 m² per gast.',
            'Zittend aan tafels: reken ongeveer 1 tot 1,5 m² per gast.',
            'Met buffet, bar of dansvloer: tel die oppervlakte er apart bij.',
          ],
        },
        {
          type: 'p',
          text:
            'Een voorbeeld: 40 gasten die aan tafel eten hebben zo’n 40 tot 60 m² nodig. Een tent van 6 x 8 meter (48 m²) is dan een goed vertrekpunt. Komt er nog een buffet of een DJ bij, kies dan een maatje groter.',
        },
        {
          type: 'tip',
          text:
            'Twijfel je tussen twee maten? Kies de grotere. Mensen schuiven bij regen allemaal tegelijk naar binnen, en dan is elke vierkante meter welkom.',
        },
        { type: 'h2', text: 'Meet je tuin vóór je huurt' },
        {
          type: 'p',
          text:
            'De tent moet niet alleen passen, je hebt ook ruimte rondom nodig voor scheerlijnen, haringen of gewichten. Reken minstens een meter extra aan elke kant. Kijk ook naar bomen, hagen en de weg naar de plek waar de tent komt: kan het materiaal er makkelijk naartoe?',
        },
        { type: 'h2', text: 'Ondergrond en verankering' },
        {
          type: 'p',
          text:
            'Op gras zet je een tent meestal vast met haringen. Op tegels, beton of grind gaat dat niet en zijn er gewichten nodig. Vraag de verhuurder vooraf hoe de tent verankerd wordt en of de gewichten bij de huur horen.',
        },
        { type: 'h2', text: 'Wind en regen' },
        {
          type: 'p',
          text:
            'Een goed verankerde tent kan tegen een stevige bries, maar bij harde wind of storm is het veiliger om de tent niet te gebruiken. Spreek met de verhuurder af wat er gebeurt als er zwaar weer voorspeld wordt. Zijwanden helpen tegen wind en regen en houden de warmte binnen bij koelere avonden.',
        },
        { type: 'h2', text: 'Wat zit erbij?' },
        {
          type: 'ul',
          items: [
            'Zijwanden (dicht of met ramen)',
            'Gewichten of haringen',
            'Verlichting',
            'Opbouw en afbraak door de verhuurder',
            'Levering of ophalen',
          ],
        },
        {
          type: 'p',
          text:
            'Dat verschilt per verhuurder en per tent. In de advertentie zie je wat erbij hoort. Staat het er niet bij, stel de vraag dan in je aanvraag.',
        },
        {
          type: 'cta',
          category: 'partytent',
          text: 'Bekijk partytenten bij verhuurders in de buurt',
        },
      ],
    },
    {
      slug: 'springkasteel-huren-checklist',
      title: 'Springkasteel huren: checklist voor een veilig kinderfeest',
      metaTitle: 'Springkasteel huren: checklist voor een veilig kinderfeest | OmniRent',
      metaDescription:
        'Springkasteel huren voor een verjaardag of buurtfeest? Deze checklist helpt je kiezen: ruimte, ondergrond, stroom, leeftijd en toezicht.',
      excerpt:
        'Een springkasteel is dé blikvanger op een kinderfeest. Met deze checklist kies je het juiste en verloopt de dag veilig.',
      publishedAt: '2026-11-13',
      updatedAt: '2026-11-13',
      readMinutes: 4,
      categories: ['springkasteel'],
      body: [
        {
          type: 'p',
          text:
            'Een springkasteel zorgt op een verjaardag, communie of buurtfeest voor uren speelplezier. Zodat het ook een veilige en zorgeloze dag wordt, loop je best deze punten af voor je een aanvraag doet.',
        },
        { type: 'h2', text: '1. Meet de ruimte' },
        {
          type: 'p',
          text:
            'In elke advertentie staan de afmetingen van het springkasteel. Reken daar nog ruimte rondom bij: voor de blazer, de stroomkabel en een veilige zone aan de in- en uitgang. Kijk ook naar de hoogte, zeker als je onder bomen of een overkapping wil opstellen.',
        },
        { type: 'h2', text: '2. Vlakke ondergrond' },
        {
          type: 'p',
          text:
            'Een springkasteel staat het best op een vlakke grasmat. Op een harde ondergrond zijn valmatten of een grondzeil nodig. Vraag de verhuurder wat hij voorziet en hoe het springkasteel verankerd wordt.',
        },
        { type: 'h2', text: '3. Stroom in de buurt' },
        {
          type: 'p',
          text:
            'De blazer draait de hele tijd en heeft een stopcontact nodig. Gebruik bij voorkeur een buitenstopcontact of een geschikte verlengkabel, en hou de kabel uit de looproute van de kinderen.',
        },
        { type: 'h2', text: '4. Leeftijd en aantal kinderen' },
        {
          type: 'p',
          text:
            'Elk springkasteel heeft een maximum aantal kinderen tegelijk en een geschikte leeftijdscategorie. Voor peuters bestaan er kleinere modellen met lagere wanden. Laat grote en kleine kinderen bij voorkeur niet tegelijk springen.',
        },
        {
          type: 'tip',
          text:
            'Maak vooraf een paar eenvoudige afspraken met de kinderen: schoenen uit, geen eten of drinken op het springkasteel, en niet over de rand klimmen.',
        },
        { type: 'h2', text: '5. Altijd toezicht' },
        {
          type: 'p',
          text:
            'Laat kinderen nooit zonder volwassene springen. Spreek af wie toezicht houdt, ook als het feest al even bezig is.',
        },
        { type: 'h2', text: '6. Wat bij regen of wind?' },
        {
          type: 'p',
          text:
            'Bij harde wind of regen leg je het springkasteel beter stil. Bespreek vooraf met de verhuurder wat de afspraken zijn als het weer slecht wordt, zodat je niet voor verrassingen staat.',
        },
        { type: 'h2', text: '7. Levering, opbouw en afbraak' },
        {
          type: 'p',
          text:
            'Sommige verhuurders leveren en bouwen op, bij andere haal je het springkasteel zelf op. Een springkasteel is zwaar en groot: check of het in je auto past en of je hulp hebt om het te dragen.',
        },
        {
          type: 'cta',
          category: 'springkasteel',
          text: 'Bekijk springkastelen bij verhuurders in de buurt',
        },
      ],
    },
    {
      slug: 'tuinfeest-organiseren-checklist-feestmateriaal',
      title: 'Tuinfeest organiseren: checklist voor je feestmateriaal',
      metaTitle: 'Tuinfeest organiseren: checklist feestmateriaal | OmniRent',
      metaDescription:
        'Een tuinfeest organiseren? Met deze checklist vergeet je niets: tent, tafels en stoelen, bar en koeling, geluid, licht en verwarming.',
      excerpt:
        'Van tent tot verlengkabel: alles wat je nodig hebt voor een geslaagd tuinfeest, in één lijst.',
      publishedAt: '2026-11-13',
      updatedAt: '2026-11-13',
      readMinutes: 5,
      categories: ['feestmateriaal', 'partytent', 'barcatering', 'geluidsinstallatie'],
      body: [
        {
          type: 'p',
          text:
            'Een tuinfeest is gezellig, maar er komt meer bij kijken dan je denkt. Veel materiaal heb je maar één keer per jaar nodig, en dan is huren vaak handiger dan kopen. Met deze checklist zie je in één oogopslag wat je nodig hebt.',
        },
        { type: 'h2', text: 'Begin met je datum en gasten' },
        {
          type: 'p',
          text:
            'Hoeveel mensen komen er, en eten ze aan tafel of is het een receptie? Dat bepaalt bijna alles: de maat van de tent, het aantal tafels en stoelen en hoeveel drank er gekoeld moet worden. Populaire weekends zijn snel volgeboekt, dus vraag je materiaal ruim op tijd aan.',
        },
        { type: 'h2', text: 'Beschutting' },
        {
          type: 'ul',
          items: [
            'Partytent of stretchtent, afgestemd op het aantal gasten',
            'Zijwanden voor wind en regen',
            'Parasols voor zonnige dagen',
          ],
        },
        { type: 'cta', category: 'partytent', text: 'Partytenten bekijken' },
        { type: 'h2', text: 'Zitten en staan' },
        {
          type: 'ul',
          items: [
            'Tafels (en eventueel tafelkleden)',
            'Stoelen of bankstellen',
            'Statafels voor de receptie',
          ],
        },
        { type: 'h2', text: 'Eten en drinken' },
        {
          type: 'ul',
          items: [
            'BBQ of ander kookmateriaal',
            'Bar of tapinstallatie',
            'Koelkast, koelcel of diepvries',
            'Glazen, borden en bestek',
          ],
        },
        { type: 'cta', category: 'barcatering', text: 'Bar- en cateringmateriaal bekijken' },
        { type: 'h2', text: 'Sfeer' },
        {
          type: 'ul',
          items: [
            'Geluidsinstallatie of speaker met micro',
            'Feestverlichting en lichtsnoeren',
            'Decoratie',
            'Terrasverwarming voor koelere avonden',
          ],
        },
        {
          type: 'cta',
          category: 'geluidsinstallatie',
          text: 'Geluid en licht bekijken',
        },
        { type: 'h2', text: 'Vergeet de praktische kant niet' },
        {
          type: 'ul',
          items: [
            'Verlengkabels en stekkerdozen (geschikt voor buiten)',
            'Genoeg stopcontacten voor koeling, geluid en licht',
            'Vuilniszakken en afvalbakken',
            'Een plan B als het regent',
          ],
        },
        {
          type: 'tip',
          text:
            'Huur zoveel mogelijk bij één verhuurder. Dan haal je alles in één keer op of wordt het samen geleverd, en heb je maar één aanspreekpunt.',
        },
        { type: 'h2', text: 'Ophalen of laten leveren?' },
        {
          type: 'p',
          text:
            'Kleine spullen haal je makkelijk zelf op. Voor een tent, een koelcel of veel tafels en stoelen is levering vaak de moeite waard. In elke advertentie zie je of ophalen, levering of allebei mogelijk is.',
        },
        {
          type: 'cta',
          category: 'feestmateriaal',
          text: 'Bekijk al het feestmateriaal in de buurt',
        },
      ],
    },
  ],
};
