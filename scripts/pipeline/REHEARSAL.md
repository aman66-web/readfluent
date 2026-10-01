# Rehearsal of the pilot (no API key)

**This is not the pilot.** The pilot (3 books, the real API, real token counts) needs `ANTHROPIC_API_KEY`, which does not exist in the build environment. To try the prompts and the checks on real model writing anyway, the pipeline ran in `--mode files`: it wrote each request to a file, a Claude Opus session wrote the answer by hand from the system and user text alone (with no model call from the pipeline), and the pipeline's own code read the answers, checked them, asked again where a check failed, and moved on. Only the first five beats of each level were written (`PIPELINE_CHUNKS=1`), so no book was assembled into its nine versions here; that path is covered by the tests, which run a whole book through a pretend model.

## What it showed

- **The beat sheets worked first time** for all three books (50 beats each, bible, titles, blurbs). *Pride and Prejudice* was marked public domain: certain.
- **The originality editor is strict, and useful.** *The Rival at Desk Four* passed on the first look (only trope-level echoes of *The Hating Game*). *One Small Step a Day* was **sent back twice**: its beat sheet walked through almost every chapter of *Atomic Habits* with the names removed (the plateau, the Two-Minute Rule, the guitar stand, the bowl of apples, "join a culture where the behaviour is normal"…). It was rewritten from the editor's notes and passed the third time. The editor also noticed that the title is close to another book, *One Small Step Can Change Your Life: The Kaizen Way*: **a title the owner may want to change.**
- **The pages came out right almost every time.** The last book's pages were written with no access to the checks: 74 of 75 passed first time. The one that did not was a false alarm ("gyms"), which led to the improvements below. In the end all 225 pages (3 books × 3 levels × 25) pass every check. Be careful with that number: the writers of the first two books could read the check code, and some check rules were tuned on this very text. The real run will give an honest first-pass rate.
- **466 word cards** were written for the 466 key words; all pass the checks. Respellings use Latin American sounds (v is written "b", no "th").
- Quality worth reading in the samples below: the A1–A2 pages are very plain (and sometimes leave out a detail to fit one short sentence), the C1–C2 pages read as real prose, and Spanish keeps the same number of sentences in the same order.

## What the rehearsal found in the pipeline, and fixed

1. The page requests did not include the explanation of the five page slots (`p50`, `c1`, `c2`, `x1`, `x2`). Found by a page writer. Fixed; a test now checks it.
2. The "leftover instruction" check flagged the ordinary Spanish word *todo*. Fixed (only capital TODO counts).
3. *vale* was on the Spain-only list but is fine in Latin America ("no vale la pena"). Removed.
4. A book's own names (Bennet, Hollis, Bennets, Hollis's) were counted as rare words. Fixed: the bible's names are exempt, with plurals and possessives.
5. Compound numbers ("thirty-four") and inflected forms ("gyms") were counted as rare words. Fixed: they count as their easy parts and base words. (One writer had cut a page's content to get round the first of these, which is the worst way for a check to behave.)
6. A stopped run started its originality attempts at 1 again. Fixed: attempts are counted on disk.

## What the rehearsal does not prove

- That the API calls are shaped correctly (the SDK types check, and the same code is covered by tests with a pretend model, but no request has been sent).
- Real token counts, how much the model's thinking adds to output, whether the cache hits, and how the Batches API behaves.
- The first-pass rate on pages (see above).


## Beat sheets and originality

- **Pride and Prejudice** (classic): 50 beats; public domain: certain
- **The Rival at Desk Four** (original): 50 beats; public domain: certain
  - editor check 1 (beats): **pass**, 6 findings (0 high or medium)
  - editor check 2 (text): **pass**, 3 findings (0 high or medium)
- **One Small Step a Day** (original): 50 beats; public domain: certain
  - editor check 1 (beats): **rewrite**, 14 findings (5 high or medium)
  - editor check 2 (beats): **rewrite**, 14 findings (5 high or medium)
  - editor check 3 (beats): **pass**, 9 findings (0 high or medium)
  - editor check 4 (text): **pass**, 5 findings (0 high or medium)

## Pages

| Book | Level | Pages written | Still flagged |
| --- | --- | --- | --- |
| pride-and-prejudice | A1–A2 | 25 | 0 |
| pride-and-prejudice | B1–B2 | 25 | 0 |
| pride-and-prejudice | C1–C2 | 25 | 0 |
| the-rival-at-desk-four | A1–A2 | 25 | 0 |
| the-rival-at-desk-four | B1–B2 | 25 | 0 |
| the-rival-at-desk-four | C1–C2 | 25 | 0 |
| one-small-step-a-day | A1–A2 | 25 | 0 |
| one-small-step-a-day | B1–B2 | 25 | 0 |
| one-small-step-a-day | C1–C2 | 25 | 0 |

## Word cards

466 cards in dictionary/es.json; 0 fail a check.

## Sample pages

### Pride and Prejudice

**A1–A2**

- beat 1 c1
  - EN: Mrs Bennet has five daughters, and rich young Mr Bingley is coming to Netherfield.
  - ES: La señora Bennet tiene cinco hijas, y el rico y joven señor Bingley viene a Netherfield.
  - keys: hijas = daughters, rico = rich, joven = young
- beat 3 p50
  - EN: Mr Darcy says Elizabeth is not pretty enough, and she thinks he is proud.
  - ES: El señor Darcy dice que Elizabeth no es lo bastante bonita, y ella piensa que es orgulloso.
  - keys: dice = says, bonita = pretty, orgulloso = proud
- beat 3 x1
  - EN: There are more ladies than gentlemen, so she must sit for two dances.
  - ES: Hay más damas que caballeros, así que ella debe sentarse durante dos bailes.
  - keys: damas = ladies, caballeros = gentlemen, sentarse = sit

**B1–B2**

- beat 1 c1
  - EN: Everyone agrees that a single man with a good fortune must be looking for a wife. So when rich young Mr Bingley rents Netherfield Park, Mrs Bennet can think of nothing else.
  - ES: Todos están de acuerdo en que un hombre soltero con una buena fortuna debe estar buscando esposa. Por eso, cuando el rico y joven señor Bingley alquila Netherfield Park, la señora Bennet no puede pensar en otra cosa.
  - keys: soltero = single, fortuna = fortune, alquila = rents
- beat 3 p50
  - EN: Elizabeth is sitting close enough to hear when Bingley urges his friend Darcy to dance with her. Darcy coldly calls her only tolerable, and although Elizabeth laughs about it, she decides he is the proudest man alive.
  - ES: Elizabeth está sentada lo bastante cerca para oír cuando Bingley le insiste a su amigo Darcy en que baile con ella. Darcy la llama fríamente apenas pasable, y aunque Elizabeth se ríe del asunto, decide que es el hombre más orgulloso del mundo.
  - keys: oír = hear, insiste = urges, orgulloso = proudest
- beat 3 x1
  - EN: Elizabeth is sitting so close that she can hear every word between the two friends. She keeps her eyes politely on the dancers, although she is listening carefully.
  - ES: Elizabeth está sentada tan cerca que puede oír cada palabra entre los dos amigos. Mantiene los ojos educadamente en los que bailan, aunque está escuchando con atención.
  - keys: cerca = close, palabra = word, escuchando = listening

**C1–C2**

- beat 1 c1
  - EN: It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. Whatever the gentleman himself may feel, the neighbouring families regard him, from the moment he arrives, as the rightful property of one of their daughters. So when news reaches Longbourn that Netherfield Park has been let to a rich young man named Bingley, Mrs Bennet can scarcely contain her excitement.
  - ES: Es una verdad universalmente reconocida que un hombre soltero en posesión de una buena fortuna necesita una esposa. Sienta lo que sienta el propio caballero, las familias vecinas lo consideran, desde el momento en que llega, propiedad legítima de alguna de sus hijas. Por eso, cuando llega a Longbourn la noticia de que Netherfield Park ha sido alquilado por un joven rico llamado Bingley, la señora Bennet apenas puede contener su entusiasmo.
  - keys: soltero = single, propiedad = property, contener = contain
- beat 3 p50
  - EN: Because gentlemen are scarce, Elizabeth is obliged to sit out two dances, and from her chair she overhears Bingley urging Darcy to ask her. Darcy, glancing at her coldly, declares her “tolerable, but not handsome enough to tempt me,” a remark made well within her hearing. Elizabeth turns the insult into a lively story for her friends, yet privately she concludes that he is the proudest, most disagreeable man in the world.
  - ES: Como escasean los caballeros, Elizabeth se ve obligada a quedarse sentada durante dos bailes, y desde su silla oye a Bingley insistirle a Darcy en que la saque a bailar. Darcy, mirándola con frialdad, la declara “tolerable, pero no lo bastante hermosa para tentarme”, un comentario hecho muy al alcance de su oído. Elizabeth convierte el insulto en una historia animada para sus amigas, pero en privado concluye que es el hombre más orgulloso y desagradable del mundo.
  - keys: escasean = scarce, tolerable = tolerable, desagradable = disagreeable
- beat 3 x1
  - EN: Elizabeth, who has no intention of pretending she cannot hear, keeps her eyes on the dancers and waits with some amusement for the reply. Darcy turns, catches her eye for an instant and then withdraws his own, with the air of a man inspecting goods he has no wish to buy. The music swells, the couples sweep past, and for a moment the question hangs in the warm air between the two friends.
  - ES: Elizabeth, que no tiene intención de fingir que no oye, mantiene los ojos en los que bailan y espera la respuesta con cierta diversión. Darcy se vuelve, le sostiene la mirada un instante y luego aparta la suya, con el aire de quien examina una mercancía que no desea comprar. La música crece, las parejas pasan girando y, por un momento, la pregunta queda suspendida en el aire cálido entre los dos amigos.
  - keys: fingir = pretending, mercancía = goods, parejas = couples

### The Rival at Desk Four

**A1–A2**

- beat 1 c1
  - EN: Every working day for five years, Nora Finch arrived first at the weather office.
  - ES: Cada día de trabajo, durante cinco años, Nora Finch llegó primero a la oficina meteorológica.
  - keys: trabajo = working, años = years, llegó = arrived
- beat 3 p50
  - EN: Leo Marsh arrived late and wet, opened the big window, and Nora closed it.
  - ES: Leo Marsh llegó tarde y mojado, abrió la ventana grande, y Nora la cerró.
  - keys: tarde = late, abrió = opened, cerró = closed
- beat 3 x1
  - EN: His dark hair was wet, and his old blue jumper had a hole.
  - ES: Tenía el pelo oscuro mojado, y su viejo suéter azul tenía un agujero.
  - keys: pelo = hair, suéter = jumper, agujero = hole

**B1–B2**

- beat 1 c1
  - EN: It was six in the morning and still dark when Nora Finch unlocked the door of the Gullhaven Weather Office. She had arrived first every working day for five years, and she liked the quiet before anyone else came in.
  - ES: Eran las seis de la mañana y todavía estaba oscuro cuando Nora Finch abrió con llave la puerta de la Oficina Meteorológica de Gullhaven. Había llegado primero cada día de trabajo durante cinco años, y le gustaba el silencio antes de que llegaran los demás.
  - keys: oscuro = dark, puerta = door, silencio = quiet
- beat 3 p50
  - EN: Leo Marsh arrived late, soaked by the rain and carrying a paper bag of green apples. Before he had even sat down, he opened the big window, and Nora got up and closed it.
  - ES: Leo Marsh llegó tarde, empapado por la lluvia y con una bolsa de papel llena de manzanas verdes. Antes de sentarse siquiera, abrió la ventana grande, y Nora se levantó y la cerró.
  - keys: empapado = soaked, manzanas = apples, cerró = closed
- beat 3 x1
  - EN: Nora's forecast for the morning had said dry, and he pointed this out with a cheerful smile. To Nora, that smile was even more annoying than the rain itself.
  - ES: El pronóstico de Nora para la mañana había anunciado tiempo seco, y él se lo hizo notar con una sonrisa alegre. Para Nora, esa sonrisa era todavía más molesta que la lluvia.
  - keys: pronóstico = forecast, sonrisa = smile, molesta = annoying

**C1–C2**

- beat 1 c1
  - EN: At six in the morning the harbour was still dark, its lights trembling on the black water, and the gulls were already pacing the roof above Nora Finch's head. She climbed to the top floor of the old harbour master's building and let herself into the Gullhaven Weather Office, as she had done every working day for five years. In all that time nobody had ever arrived before her, a record she guarded with the same quiet pride she brought to her forecasts.
  - ES: A las seis de la mañana el puerto seguía a oscuras, con sus luces temblando sobre el agua negra, y las gaviotas ya recorrían el techo sobre la cabeza de Nora Finch. Subió hasta el último piso del viejo edificio del capitán de puerto y entró en la Oficina Meteorológica de Gullhaven, como había hecho cada día de trabajo durante cinco años. En todos esos años nadie había llegado antes que ella, un récord que cuidaba con el mismo orgullo silencioso que ponía en sus pronósticos.
  - keys: temblando = trembling, piso = floor, orgullo = pride
- beat 3 p50
  - EN: Leo Marsh arrived at half past eight, late and dripping, with rain in his untidy dark hair and a paper bag of green apples clutched to his chest. Before he had so much as sat down, he crossed to the big window and flung it open to the wet morning air. Nora rose from desk three without a word, walked the length of the room and closed it again, and so the first battle began.
  - ES: Leo Marsh llegó a las ocho y media, tarde y chorreando agua, con lluvia en el pelo oscuro y despeinado y una bolsa de papel con manzanas verdes apretada contra el pecho. Antes siquiera de sentarse, cruzó hasta el ventanal y lo abrió de par en par al aire húmedo de la mañana. Nora se levantó del escritorio tres sin decir palabra, recorrió toda la sala y volvió a cerrarlo, y así empezó la primera batalla.
  - keys: despeinado = untidy, húmedo = wet, batalla = battle
- beat 3 x1
  - EN: Glancing at the rain streaming down the window, he remarked pleasantly that Nora's forecast for the morning had said dry. He did not say it unkindly, which somehow made it far worse, and Nora felt the remark land like a pebble dropped into still water. She replied, with great dignity, that the rain was a local shower and would clear within the hour.
  - ES: Mirando la lluvia que corría por la ventana, comentó amablemente que el pronóstico de Nora para la mañana había anunciado tiempo seco. No lo dijo con mala intención, lo cual de algún modo lo empeoraba mucho, y Nora sintió que el comentario caía como una piedrita lanzada en agua quieta. Ella respondió, con gran dignidad, que la lluvia era un chubasco local y que despejaría antes de una hora.
  - keys: pronóstico = forecast, piedrita = pebble, dignidad = dignity

### One Small Step a Day

**A1–A2**

- beat 1 c1
  - EN: One autumn morning, a brown path crosses the wet grass in the park.
  - ES: Una mañana de otoño, un camino marrón cruza el pasto mojado del parque.
  - keys: otoño = autumn, cruza = crosses, mojado = wet
- beat 3 p50
  - EN: Big promises need a strong mood, and one bad day seems to ruin everything.
  - ES: Las grandes promesas necesitan mucho ánimo, y un mal día parece arruinar todo.
  - keys: promesas = promises, ánimo = mood, día = day
- beat 3 x1
  - EN: On Monday you feel strong, but on Thursday you are tired and it rains.
  - ES: El lunes te sientes fuerte, pero el jueves estás cansado y llueve.
  - keys: fuerte = strong, cansado = tired, llueve = rains

**B1–B2**

- beat 1 c1
  - EN: On an autumn morning the grass in the town park is wet, and the willow has dropped its leaves. A brown path cuts across it, straight to Mrs Bell's bakery, where the smell of warm bread drifts out.
  - ES: Una mañana de otoño, el pasto del parque del pueblo está mojado y el sauce ha dejado caer sus hojas. Un sendero marrón lo cruza directo hacia la panadería de la señora Bell, de donde sale olor a pan caliente.
  - keys: sauce = willow, hojas = leaves, olor = smell
- beat 3 p50
  - EN: Big promises often depend on a strong mood, but moods change from one day to the next. They are also all or nothing, so a single bad day seems to ruin the whole plan.
  - ES: Las grandes promesas suelen depender de un buen estado de ánimo, pero el ánimo cambia de un día a otro. Además son de todo o nada, así que un solo mal día parece arruinar todo el plan.
  - keys: depender = depend, cambia = change, arruinar = ruin
- beat 3 x1
  - EN: On Monday you feel full of energy, ready to change everything at once. By Thursday you are tired, it is raining, and the promise feels like a stranger's idea.
  - ES: El lunes te sientes lleno de energía, listo para cambiarlo todo de una vez. Para el jueves estás cansado, está lloviendo y la promesa parece la idea de un desconocido.
  - keys: energía = energy, cansado = tired, lloviendo = raining

**C1–C2**

- beat 1 c1
  - EN: On an autumn morning the grass of the town park is still wet, and the willow by the pond has scattered its narrow yellow leaves across it. Through the middle of it runs a brown path, worn bare and slightly sunken, heading straight for Mrs Bell's bakery on the corner. From the bakery's open door the smell of warm bread drifts out over the grass, which may explain the path better than any argument could.
  - ES: Una mañana de otoño, el pasto del parque del pueblo sigue mojado, y el sauce junto al estanque ha esparcido sobre él sus hojas amarillas y estrechas. Por el medio lo atraviesa un sendero marrón, gastado hasta la tierra y un poco hundido, que va derecho a la panadería de la señora Bell, en la esquina. Por la puerta abierta de la panadería, el olor a pan caliente se extiende sobre el pasto, y quizás explique el sendero mejor que cualquier argumento.
  - keys: sauce = willow, esparcido = scattered, hundido = sunken
- beat 3 p50
  - EN: Big promises tend to depend on a strong mood, and moods, unlike calendars, change from one day to the next without asking our permission. They are also all or nothing, so that a single bad day can seem to ruin everything that came before it. There is a slower and kinder way to change, and the three lives at the heart of this book will show what it looks like.
  - ES: Las grandes promesas suelen depender de un estado de ánimo fuerte, y el ánimo, a diferencia del calendario, cambia de un día a otro sin pedirnos permiso. Además son de todo o nada, de modo que un solo mal día parece capaz de arruinar todo lo que vino antes. Existe una manera de cambiar más lenta y más amable, y las tres vidas que están en el centro de este libro mostrarán cómo es.
  - keys: permiso = permission, arruinar = ruin, amable = kinder
- beat 3 x1
  - EN: On Monday you wake early, full of energy, and the new plan feels not only possible but faintly obvious, as if you should have started years ago. By Thursday you are tired, it is raining against the window, and the alarm sounds less like a call to adventure than an accusation. The promise that seemed so urgently your own on Monday now feels like a stranger's idea, something you agreed to in a moment of weakness.
  - ES: El lunes te despiertas temprano, lleno de energía, y el nuevo plan no solo parece posible, sino casi evidente, como si hubieras tenido que empezar hace años. Para el jueves estás cansado, la lluvia golpea la ventana y el despertador suena menos como una llamada a la aventura que como una acusación. La promesa que el lunes parecía tan urgentemente tuya ahora parece la idea de un desconocido, algo que aceptaste en un momento de debilidad.
  - keys: energía = energy, acusación = accusation, debilidad = weakness

## Cost (estimated from sizes; not API token counts)

| Step | Requests | Input tokens | Output tokens | Cost |
| --- | --- | --- | --- | --- |
| beats | 6 | 7,136 | 80,404 | $1.637 |
| originality | 8 | 64,964 | 15,136 | $0.563 |
| pages | 12 | 68,664 | 59,036 | $1.455 |
| dictionary | 9 | 66,823 | 22,551 | $0.718 |

Model claude-opus-5-5. One book is 30 page requests, 1 beat sheet (about 1.7 with rewrites for an original), about 3 editor checks and a share of the word cards.
Average page request here: $0.121. Projected per book with no thinking overhead: **$4.853** standard, **$2.426** with the Batches API; for 200 books **$970.51** standard, **$485.26** batch.
If thinking doubles the output tokens (the model thinks before it writes, billed as output): $1746.92 standard, $873.46 batch. The real pilot replaces this guess with measured numbers.