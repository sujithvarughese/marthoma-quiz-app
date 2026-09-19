import type { Round } from "@/lib/types";

/**
 * QUESTION DATA — edit this file to add your real questions.
 *
 * Each round has 8 questions (the Picture Round has 5), all worth the same 10
 * points. On the board they appear as numbered cards; a team picks a card to
 * answer it. A wrong answer can be passed to another team for 5 points. Once
 * a card is chosen it locks.
 *
 * To add real content, just replace the `question` and `answer` strings below
 * (and `imageUrl` for the Picture Round). Keep `used: false`.
 *
 * Fields per question:
 *   id        — unique within the round (leave as-is or rename)
 *   question  — the prompt read aloud
 *   answer    — revealed to the host
 *   imageUrl  — Picture Round only. Put images in /public and use "/name.jpg",
 *               or paste a full https:// URL.
 *   used      — always start as false
 *
 * Note: `used` flags and scores are saved per-event in the browser, but the
 * question text always comes from this file — edits here take effect on reload.
 */

export const rounds: Round[] = [
  {
    id: "current-affairs",
    order: 1,
    name: "Current Affairs",
    description: "2020–2026 • World Affairs, U.S., India & Major Global Events",
    questions: [
      {
        id: "ca-1",
        question:
            "What name was given to the COVID-19 variant identified in late 2021 that rapidly spread worldwide and became dominant?",
        answer: "Omicron",
        funFact:
            "The World Health Organization designated Omicron a Variant of Concern in November 2021.",
        used: false,
      },
      {
        id: "ca-2",
        question:
            "Which two traditionally non-aligned European countries joined NATO following Russia's invasion of Ukraine, becoming its 31st and 32nd members?",
        answer: "Finland and Sweden",
        funFact:
            "Finland joined NATO in 2023 as its 31st member, followed by Sweden in 2024 as its 32nd member.",
        used: false,
      },
      {
        id: "ca-3",
        question:
            "At the 2023 G20 Summit in New Delhi, which organization was admitted as a permanent member of the G20?",
        answer: "The African Union",
        funFact:
            "The African Union became a permanent G20 member at the 2023 New Delhi Summit. South Africa hosted the G20 Summit in 2025, and the United States holds the G20 presidency in 2026.",
        used: false,
      },
      {
        id: "ca-4",
        question:
            "In February 2023, a magnitude 7.8 earthquake, followed by another major earthquake, caused catastrophic destruction and tens of thousands of deaths in which two countries?",
        answer: "Turkey and Syria",
        funFact:
            "The initial magnitude 7.8 earthquake was followed hours later by another extremely powerful earthquake, devastating communities across southern Turkey and northern Syria.",
        used: false,
      },
      {
        id: "ca-5",
        question:
            "In 2025, India became the fourth country to successfully dock two satellites in space. What was the mission called?",
        answer: "SpaDeX",
        funFact:
            "SpaDeX made India the fourth nation to demonstrate space docking technology, after the United States, Russia and China.",
        used: false,
      },
      {
        id: "ca-6",
        question:
            "According to the EIU Global Liveability Index 2026, which city was ranked the world's most liveable city?",
        answer: "Copenhagen, Denmark",
        funFact:
            "Copenhagen retained the top position for the second consecutive year and received perfect scores in stability, education and infrastructure.",
        used: false,
      },
      {
        id: "ca-7",
        question:
            "Which major bridge in Baltimore collapsed in March 2024 after being struck by the container ship Dali?",
        answer: "Francis Scott Key Bridge",
        funFact:
            "The Singapore-flagged container ship Dali struck one of the bridge's support piers, causing the bridge to collapse and killing six construction workers.",
        used: false,
      },
      {
        id: "ca-8",
        question:
            "The association of emerging economies originally known as BRIC later became BRICS. What led to this change?",
        answer: "South Africa joined the group",
        funFact:
            "South Africa joined the group in 2010, adding the 'S' to BRIC. India hosted the BRICS Summit in New Delhi in September 2026.",
        used: false,
      },
    ],
  },

  {
    id: "science-sports-culture",
    order: 2,
    name: "Science, Sports & Culture",
    description:
        "Everyday Science, Discoveries & Inventions, Sports, Traditions & Cultural Landmarks",
    questions: [
      {
        id: "ssc-1",
        question:
            "Which European landmark, built for the 1889 World's Fair and originally intended to remain for only about 20 years, was preserved partly because of its later scientific and practical value?",
        answer: "The Eiffel Tower",
        funFact:
            "The Eiffel Tower proved valuable for radio communications and scientific experiments, helping ensure that it was not dismantled as originally planned.",
        used: false,
      },
      {
        id: "ssc-2",
        question:
            "Which country won the ICC Men's T20 World Cup in both 2024 and 2026, becoming the first team to win consecutive titles?",
        answer: "India",
        funFact:
            "India defeated South Africa in the 2024 final and New Zealand in the 2026 final. Sanju Samson was named Player of the Tournament in 2026.",
        used: false,
      },
      {
        id: "ssc-3",
        question:
            "Which three countries jointly hosted the 2026 FIFA World Cup?",
        answer: "United States, Canada and Mexico",
        funFact:
            "The 2026 tournament was the first FIFA World Cup to be hosted by three countries and the first Men's World Cup to feature 48 teams.",
        used: false,
      },
      {
        id: "ssc-4",
        question:
            "In which athletic event did Neeraj Chopra win India's first Olympic gold medal in track and field?",
        answer: "Men's javelin throw",
        funFact:
            "Neeraj Chopra won the men's javelin gold medal at the Tokyo Olympics with a best throw of 87.58 meters.",
        used: false,
      },
      {
        id: "ssc-5",
        question:
            "Who made the first successful powered airplane flight?",
        answer: "The Wright brothers",
        funFact:
            "Brothers Orville and Wilbur Wright developed the first successful powered airplane, with Orville piloting the first flight at Kitty Hawk, North Carolina, in 1903.",
        used: false,
      },
      {
        id: "ssc-6",
        question:
            "Which scale measures the acidity or alkalinity of a substance?",
        answer: "The pH scale",
        funFact:
            "The pH scale commonly ranges from 0 to 14, with 7 considered neutral, values below 7 acidic and values above 7 alkaline.",
        used: false,
      },
      {
        id: "ssc-7",
        question:
            "Which scientist discovered electromagnetic induction?",
        answer: "Michael Faraday",
        funFact:
            "Michael Faraday discovered electromagnetic induction in 1831, a principle that became fundamental to electric generators and transformers.",
        used: false,
      },
      {
        id: "ssc-8",
        question:
            "Which Indian became the youngest-ever undisputed World Chess Champion in 2024?",
        answer: "D. Gukesh",
        funFact:
            "Gukesh became World Chess Champion at age 18 after defeating defending champion Ding Liren in Singapore.",
        used: false,
      },
    ],
  },

  {
    id: "picture-personalities",
    order: 3,
    name: "Picture Round",
    description:
        "Important Personalities Worldwide • Politics, Science & Technology, Business, Space, Sports, Literature & Arts",
    isPicture: true,
    questions: [
      {
        id: "pic-1",
        question: "Who is this personality?",
        answer: "Pelé",
        funFact:
            "Brazilian football legend Pelé was born Edson Arantes do Nascimento and is the only player to have won three FIFA World Cups.",
        imageUrl: "/questions/pele.jpg",
        used: false,
      },
      {
        id: "pic-2",
        question: "Who is this personality?",
        answer: "Satya Nadella",
        funFact:
            "Satya Nadella was born in Hyderabad, India, and became CEO of Microsoft in 2014.",
        imageUrl: "/questions/satya-nadella.jpg",
        used: false,
      },
      {
        id: "pic-3",
        question: "Who is this personality?",
        answer: "Taylor Swift",
        funFact:
            "Taylor Swift is an American singer-songwriter known for hits including 'Love Story' and 'Shake It Off' and has won numerous Grammy Awards.",
        imageUrl: "/questions/taylor-swift.jpg",
        used: false,
      },
      {
        id: "pic-4",
        question: "Who is this personality?",
        answer: "Mike Pompeo",
        funFact:
            "Mike Pompeo served as U.S. Secretary of State from 2018 to 2021 during Donald Trump's first administration.",
        imageUrl: "/questions/mike-pompeo.jpg",
        used: false,
      },
      {
        id: "pic-5",
        question: "Who is this personality?",
        answer: "Sigmund Freud",
        funFact:
            "Sigmund Freud founded psychoanalysis and developed influential concepts including the id, ego and superego.",
        imageUrl: "/questions/sigmund-freud.jpg",
        used: false,
      },
    ],
  },

  {
    id: "life-of-jesus",
    order: 4,
    name: "Bible: Life of Jesus",
    description:
        "Birth & Childhood, Major Events in Jesus' Ministry, Crucifixion & Resurrection",
    questions: [
      {
        id: "loj-1",
        question:
            "Which two people recognized the significance of the infant Jesus when Mary and Joseph brought Him to the Temple?",
        answer: "Simeon and Anna (ശിമെയോനും അന്നയും)",
        funFact:
            "Luke 2 records that Simeon praised God upon seeing Jesus, while Anna, a prophetess, spoke about the child to those awaiting the redemption of Jerusalem.",
        used: false,
      },
      {
        id: "loj-2",
        question:
            "Who advised the Jews that it was better for one man to die for the people? (ജനത്തിനുവേണ്ടി ഒരു മനുഷ്യൻ മരിക്കുന്നത് നല്ലതാണെന്ന് യെഹൂദന്മാരെ ഉപദേശിച്ചത് ആര്?)",
        answer: "Caiaphas, the high priest (മഹാപുരോഹിതനായ കയ്യഫാവ്)",
        funFact:
            "Caiaphas' statement is recorded in John 11:49–50 and is referenced again in John 18:14.",
        used: false,
      },
      {
        id: "loj-3",
        question:
            "What was the name of the high priest's servant whose ear was cut off by Peter? (പത്രോസ് ചെവി വെട്ടിക്കളഞ്ഞ മഹാപുരോഹിതന്റെ ദാസന്റെ പേര് എന്തായിരുന്നു?)",
        answer: "Malchus (മൽക്കൊസ്)",
        funFact:
            "John 18:10 identifies both Peter as the disciple who used the sword and Malchus as the servant whose right ear was cut off.",
        used: false,
      },
      {
        id: "loj-4",
        question:
            "To which tribe of Israel did the prophetess Anna belong? (ഇസ്രായേലിലെ ഏത് ഗോത്രത്തിലാണ് അന്നാ പ്രവാചകി ഉൾപ്പെട്ടിരുന്നത്?)",
        answer: "The tribe of Asher",
        funFact:
            "Luke 2:36 identifies Anna as the daughter of Phanuel, of the tribe of Asher.",
        used: false,
      },
      {
        id: "loj-5",
        question:
            "Who was the ruler of Judea (യെഹൂദ്യ) when Joseph returned from Egypt and decided to settle in Galilee?",
        answer: "Archelaus (അർക്കെലാവൊസ്)",
        funFact:
            "According to Matthew 2:22, Joseph was afraid to go to Judea because Archelaus was ruling there and, after being warned in a dream, withdrew to Galilee.",
        used: false,
      },
      {
        id: "loj-6",
        question:
            "According to Mark, what were the names of the two sons of Simon of Cyrene? (മർക്കോസിന്റെ സുവിശേഷപ്രകാരം, കുറേനക്കാരനായ ശിമോന്റെ രണ്ട് പുത്രന്മാരുടെ പേരുകൾ എന്തായിരുന്നു?)",
        answer: "Alexander and Rufus",
        funFact:
            "Mark 15:21 uniquely identifies Simon of Cyrene as the father of Alexander and Rufus.",
        used: false,
      },
      {
        id: "loj-7",
        question:
            "According to the Gospel of John, near which Samaritan town was Jacob's well, where Jesus sat down to rest? (യോഹന്നാന്റെ സുവിശേഷപ്രകാരം, യേശു വിശ്രമിക്കാനിരുന്ന യാക്കോബിന്റെ കിണർ ശമര്യയിലെ ഏത് പട്ടണത്തിനടുത്തായിരുന്നു?)",
        answer: "Sychar (സുഖാർ)",
        funFact:
            "John 4:5–6 places Jacob's well near Sychar, where Jesus later spoke with the Samaritan woman.",
        used: false,
      },
      {
        id: "loj-8",
        question:
            "According to Mark, what Aramaic word did Jesus say while healing a man who was deaf and could hardly speak? (മർക്കോസിന്റെ സുവിശേഷപ്രകാരം, ബധിരനും സംസാരിക്കാൻ പ്രയാസമുള്ളവനുമായ ഒരു മനുഷ്യനെ സൗഖ്യമാക്കുമ്പോൾ യേശു പറഞ്ഞ അരാമ്യപദം എന്തായിരുന്നു?)",
        answer: "Ephphatha (എഫ്ഫഥാ)",
        funFact:
            "Ephphatha means 'Be opened.' Mark 7:34 preserves the Aramaic word spoken by Jesus during the healing.",
        used: false,
      },
    ],
  },

  {
    id: "egypt-to-promised-land",
    order: 5,
    name: "From Egypt to the Promised Land",
    description:
        "The Journey of the Israelites • Exodus, Leviticus, Numbers, Deuteronomy & Joshua",
    questions: [
      {
        id: "epl-1",
        question:
            "What name did Moses give the altar he built after Israel defeated the Amalekites at Rephidim? (രെഫീദീമിൽ വെച്ച് യിസ്രായേൽ അമാലേക്യരെ പരാജയപ്പെടുത്തിയശേഷം മോശെ പണിത യാഗപീഠത്തിന് എന്തു പേരിട്ടു?)",
        answer:
            "Jehovah-Nissi — 'The Lord is my Banner' (യഹോവ-നിസ്സി — 'യഹോവ എന്റെ കൊടി')",
        funFact:
            "Exodus 17:15 says Moses built the altar after Israel's victory over the Amalekites and named it Jehovah-Nissi.",
        used: false,
      },
      {
        id: "epl-2",
        question:
            "Among the seventy elders selected by Moses, which two remained in the Israelite camp and prophesied there instead of going to the Tent of Meeting? (മോശെ തിരഞ്ഞെടുത്ത എഴുപത് മൂപ്പന്മാരിൽ, സമാഗമനക്കുടാരത്തിലേക്കു പോകാതെ ഇസ്രായേൽ പാളയത്തിൽത്തന്നെ പ്രവചിച്ച രണ്ടുപേർ ആരായിരുന്നു?)",
        answer: "Eldad and Medad (എൽദാദും മേദാദും)",
        funFact:
            "Numbers 11:26–29 says Eldad and Medad remained in the camp yet received the Spirit and began to prophesy.",
        used: false,
      },
      {
        id: "epl-3",
        question:
            "During Joshua's battle against the Amorite kings, over which valley was the moon commanded to stand still? (യോശുവ അമോര്യരാജാക്കന്മാർക്കെതിരെ യുദ്ധം ചെയ്തപ്പോൾ, ഏത് താഴ്‌വരയ്ക്കുമീതെയാണ് ചന്ദ്രനോട് നിശ്ചലമായി നിൽക്കാൻ കല്പിച്ചത്?)",
        answer: "The Valley of Aijalon (അയ്യാലോൻ താഴ്‌വര)",
        funFact:
            "In Joshua 10:12, Joshua commands the sun to stand still over Gibeon and the moon over the Valley of Aijalon.",
        used: false,
      },
      {
        id: "epl-4",
        question:
            "What were the names of the two Hebrew midwives who disobeyed Pharaoh's command to kill the newborn Hebrew boys? (പുതുതായി ജനിക്കുന്ന എബ്രായ ആൺകുഞ്ഞുങ്ങളെ കൊല്ലണമെന്ന ഫറവോന്റെ കല്പന അനുസരിക്കാതിരുന്ന രണ്ട് എബ്രായ സൂതികർമ്മിണികളുടെ പേരുകൾ എന്തായിരുന്നു?)",
        answer: "Shiphrah and Puah (ശിപ്രയും പൂവയും)",
        funFact:
            "Exodus 1:15–17 says Shiphrah and Puah feared God and refused to obey Pharaoh's command to kill the Hebrew baby boys.",
        used: false,
      },
      {
        id: "epl-5",
        question:
            "What kind of stones were placed on the shoulder pieces of the high priest's ephod and engraved with the names of Israel's twelve sons? (മഹാപുരോഹിതന്റെ എഫോദിന്റെ ചുമൽപ്പട്ടകളിൽ യിസ്രായേലിന്റെ പന്ത്രണ്ടു മക്കളുടെ പേരുകൾ കൊത്തിവെച്ചിരുന്നത് ഏതു തരത്തിലുള്ള കല്ലുകളിലായിരുന്നു?)",
        answer: "Two onyx stones (രണ്ട് ഗോമേദകക്കല്ലുകളിൽ)",
        funFact:
            "According to Exodus 28:9–12, six names were engraved on each onyx stone according to the order of their birth.",
        used: false,
      },
      {
        id: "epl-6",
        question:
            "Which annual feast began on the fifteenth day of the seventh month and required the Israelites to live in temporary shelters for seven days? (ഏഴാം മാസത്തിന്റെ പതിനഞ്ചാം തീയതി ആരംഭിക്കുകയും യിസ്രായേല്യർ ഏഴു ദിവസം താൽക്കാലിക അഭയങ്ങളിൽ താമസിക്കണമെന്ന് ആവശ്യപ്പെടുകയും ചെയ്ത വാർഷിക പെരുന്നാൾ ഏതാണ്?)",
        answer: "The Feast of Tabernacles, or Feast of Booths (കൂടാരപ്പെരുന്നാൾ)",
        funFact:
            "Leviticus 23:34–43 says the Israelites were to live in booths for seven days as a reminder that God made them dwell in temporary shelters after bringing them out of Egypt.",
        used: false,
      },
      {
        id: "epl-7",
        question:
            "How many cities were the Israelites commanded to give the Levites, and how many of these were to be cities of refuge? (ലേവ്യർക്കു നൽകാൻ യിസ്രായേല്യരോട് കല്പിച്ച പട്ടണങ്ങൾ എത്രയായിരുന്നു? അവയിൽ എത്ര എണ്ണം സങ്കേതപട്ടണങ്ങളായിരുന്നു?)",
        answer:
            "48 cities in total, including 6 cities of refuge (ആകെ 48 പട്ടണങ്ങൾ; അവയിൽ ആറു സങ്കേതപട്ടണങ്ങൾ)",
        funFact:
            "Numbers 35:6–7 specifies six cities of refuge among the forty-eight towns assigned to the Levites.",
        used: false,
      },
      {
        id: "epl-8",
        question:
            "Which local Canaanite group tricked Joshua and the elders of Israel into signing a peace treaty by wearing worn-out clothes, carrying moldy bread and pretending they had traveled from a distant country? (പഴകിയ വസ്ത്രങ്ങൾ ധരിച്ചും പൂപ്പൽപിടിച്ച അപ്പം കൊണ്ടുവന്നും വളരെ ദൂരെയുള്ള ഒരു ദേശത്തുനിന്ന് യാത്രചെയ്തു വന്നവരാണെന്ന് നടിച്ചും യോശുവയെയും യിസ്രായേൽ മൂപ്പന്മാരെയും കബളിപ്പിച്ച് സമാധാന ഉടമ്പടി ഉണ്ടാക്കിയ പ്രാദേശിക കനാന്യ ജനവിഭാഗം ഏതാണ്?)",
        answer: "The Gibeonites (ഗിബെയോന്യർ)",
        funFact:
            "Joshua 9 records that the Israelites examined the Gibeonites' provisions but did not inquire of the Lord before making a treaty with them.",
        used: false,
      },
    ],
  },

  {
    id: "churches-worldwide",
    order: 6,
    name: "Churches Worldwide",
    description:
        "Christianity Around the World, Church History & Reformation, Mar Thoma Church",
    questions: [
      {
        id: "cw-1",
        question:
            "In which present-day country did Martin Luther begin the Protestant Reformation?",
        answer: "Germany",
        funFact:
            "Martin Luther's Ninety-five Theses, traditionally associated with the beginning of the Protestant Reformation, were published in Wittenberg in 1517.",
        used: false,
      },
      {
        id: "cw-2",
        question:
            "Palakunnathu Abraham Malpan was one of the two outstanding leaders of the Reformation Movement in the Malankara Church. Who was the other?",
        answer: "Kaithayil Geevarghese Malpan",
        funFact:
            "Abraham Malpan and Kaithayil Geevarghese Malpan were leading figures in the nineteenth-century reform movement within the Malankara Church.",
        used: false,
      },
      {
        id: "cw-3",
        question:
            "Which Christian denomination developed through the ministry of John Wesley?",
        answer: "Methodism / The Methodist Church",
        funFact:
            "John Wesley and his brother Charles were central figures in the eighteenth-century Methodist revival in England.",
        used: false,
      },
      {
        id: "cw-4",
        question:
            "In a Mar Thoma Church Episcopal election, what minimum percentage of votes must a candidate receive from the clergy and laity separately to be elected as a bishop?",
        answer:
            "75% of the clergy votes and 75% of the laity votes, counted separately",
        funFact:
            "The clergy and laity vote as separate groups, so a candidate must reach the required 75% threshold in each group rather than simply receiving 75% of the combined vote.",
        used: false,
      },
      {
        id: "cw-5",
        question:
            "Which famous cathedral in Paris reopened in December 2024 after extensive restoration following a devastating 2019 fire?",
        answer: "Notre-Dame Cathedral",
        funFact:
            "Notre-Dame reopened in December 2024, more than five years after the April 2019 fire severely damaged its roof and destroyed its famous spire.",
        used: false,
      },
      {
        id: "cw-6",
        question:
            "Which country has the largest Catholic population in the world?",
        answer: "Brazil",
        funFact:
            "Brazil has long had the world's largest Catholic population. The United States is also home to one of the world's largest Catholic populations.",
        used: false,
      },
      {
        id: "cw-7",
        question:
            "In which city is the headquarters of the World Council of Churches located?",
        answer: "Geneva, Switzerland",
        funFact:
            "The World Council of Churches was founded in 1948 and has its headquarters at the Ecumenical Centre in Geneva.",
        used: false,
      },
      {
        id: "cw-8",
        question:
            "Who was the first Metropolitan of the independent reformed Mar Thoma Church to use the title 'Mar Thoma Metropolitan'?",
        answer: "Titus I Mar Thoma Metropolitan",
        funFact:
            "Mathews Mar Athanasius became Malankara Metropolitan in 1852 and was the first Metropolitan to lead the Reformation Movement.",
        used: false,
      },
    ],
  },
];