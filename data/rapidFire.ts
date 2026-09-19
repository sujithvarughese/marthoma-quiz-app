import type { RapidFireGroup } from "@/lib/types";

/**
 * RAPID FIRE POOL — a single mixed bag of short questions.
 *
 * During play, each team is dealt 5 *random* unused questions from this pool
 * and has one 60-second countdown to answer as many as they can (+2 each, no
 * passing, unanswered questions do not carry over). Make sure the pool is large
 * enough: 5 questions × number of teams, plus a buffer.
 *
 * Categories in the comments are just to help you balance the mix — Bible,
 * GK, India, Current Affairs, Mar Thoma Church.
 */

export const rapidFirePool: RapidFireGroup[] = [
  {
    id: "group-a",
    name: "Group A",
    questions: [
      {
        id: "a-1",
        question:
            "Which country has the largest number of natural lakes in the world?",
        answer: "Canada",
        funFact:
            "Canada has more lakes than any other country and contains a significant share of the world's freshwater.",
        used: false,
      },
      {
        id: "a-2",
        question: "What is the chemical symbol for gold?",
        answer: "Au",
        funFact:
            "The symbol Au comes from the Latin word for gold, 'aurum.'",
        used: false,
      },
      {
        id: "a-3",
        question:
            "How many spies were sent to explore the land of Canaan?",
        answer: "12",
        funFact:
            "One leader from each of the twelve tribes of Israel was chosen to explore the land of Canaan. (Numbers 13:1–16)",
        used: false,
      },
      {
        id: "a-4",
        question:
            "Who wrote the song 'Anugrahathin Adhipathiye' ('അനുഗ്രഹത്തിൻ അധിപതിയേ')?",
        answer: "M. E. Cherian",
        funFact:
            "M. E. Cherian was a noted Malayalam Christian poet and hymn writer whose songs became widely used among Malayalam-speaking Christian communities.",
        used: false,
      },
      {
        id: "a-5",
        question: "Who discovered penicillin?",
        answer: "Alexander Fleming",
        funFact:
            "Alexander Fleming discovered penicillin in 1928 after noticing that a Penicillium mold had prevented bacteria from growing around it.",
        used: false,
      },
    ],
  },

  {
    id: "group-b",
    name: "Group B",
    questions: [
      {
        id: "b-1",
        question: "Which metal has the highest melting point?",
        answer: "Tungsten",
        funFact:
            "Tungsten has a melting point of about 3,422°C (6,192°F), the highest of all pure metals.",
        used: false,
      },
      {
        id: "b-2",
        question:
            "Which U.S. state gained two additional seats in the House of Representatives following the 2020 Census?",
        answer: "Texas",
        funFact:
            "Texas was the only state to gain two U.S. House seats following the 2020 Census; five other states each gained one.",
        used: false,
      },
      {
        id: "b-3",
        question:
            "In the stock market, what does the abbreviation ETF stand for?",
        answer: "Exchange-Traded Fund",
        funFact:
            "An ETF is an investment fund whose shares can generally be bought and sold on a stock exchange throughout the trading day.",
        used: false,
      },
      {
        id: "b-4",
        question:
            "What name did Cardinal Robert Francis Prevost choose after being elected pope in 2025?",
        answer: "Pope Leo XIV",
        funFact:
            "Robert Francis Prevost chose the name Leo XIV and became the first pope born in the United States.",
        used: false,
      },
      {
        id: "b-5",
        question:
            "On what island was Paul shipwrecked while being taken to Rome?",
        answer: "Malta",
        funFact:
            "Acts 27–28 describes Paul's shipwreck and identifies the island where the survivors reached safety as Malta.",
        used: false,
      },
    ],
  },

  {
    id: "group-c",
    name: "Group C",
    questions: [
      {
        id: "c-1",
        question:
            "Which city in New York is home to the Sinai Mar Thoma Center, headquarters of the Diocese of North America?",
        answer: "Merrick, New York",
        funFact:
            "The Sinai Mar Thoma Center is located at 2320 Merrick Avenue in Merrick, New York, and serves as the diocesan office.",
        used: false,
      },
      {
        id: "c-2",
        question:
            "Which prophet challenged the prophets of Baal on Mount Carmel?",
        answer: "Elijah",
        funFact:
            "In 1 Kings 18, Elijah challenged the prophets of Baal on Mount Carmel, where fire came down and consumed his offering.",
        used: false,
      },
      {
        id: "c-3",
        question: "Which is the largest state in India by area?",
        answer: "Rajasthan",
        funFact:
            "Rajasthan covers more than 340,000 square kilometers and is India's largest state by geographical area.",
        used: false,
      },
      {
        id: "c-4",
        question: "Who is the current CEO of Apple?",
        answer: "John Ternus",
        funFact:
            "John Ternus succeeded Tim Cook as Apple's CEO in 2026 after previously serving as the company's Senior Vice President of Hardware Engineering.",
        used: false,
      },
      {
        id: "c-5",
        question: "What is the capital of Canada?",
        answer: "Ottawa",
        funFact:
            "Queen Victoria selected Ottawa as the capital of the Province of Canada in 1857.",
        used: false,
      },
    ],
  },

  {
    id: "group-d",
    name: "Group D",
    questions: [
      {
        id: "d-1",
        question:
            "In which river did Naaman (നയമാൻ) dip himself seven times and become healed of leprosy?",
        answer: "The Jordan River",
        funFact:
            "According to 2 Kings 5, the prophet Elisha instructed Naaman to wash seven times in the Jordan River, after which his skin was restored.",
        used: false,
      },
      {
        id: "d-2",
        question: "What is the largest planet in our solar system?",
        answer: "Jupiter",
        funFact:
            "Jupiter is so large that more than 1,300 Earths could fit inside it by volume.",
        used: false,
      },
      {
        id: "d-3",
        question:
            "How many dioceses does the Mar Thoma Church currently have?",
        answer: "14 dioceses",
        funFact:
            "The Mar Thoma Church currently lists 14 dioceses, including dioceses covering North America and the United Kingdom, Europe and Africa.",
        used: false,
      },
      {
        id: "d-4",
        question:
            "Which U.S. city will host the Summer Olympic Games in 2028?",
        answer: "Los Angeles",
        funFact:
            "The 2028 Games will make Los Angeles a three-time Summer Olympics host, after previously hosting in 1932 and 1984.",
        used: false,
      },
      {
        id: "d-5",
        question: "Who was the first person to walk on the Moon?",
        answer: "Neil Armstrong",
        funFact:
            "Neil Armstrong stepped onto the Moon on July 20, 1969, during NASA's Apollo 11 mission.",
        used: false,
      },
    ],
  },

  {
    id: "group-e",
    name: "Group E",
    questions: [
      {
        id: "e-1",
        question:
            "Which country officially withdrew from the European Union on January 31, 2020?",
        answer: "The United Kingdom",
        funFact:
            "The United Kingdom left the European Union after 47 years of membership, in a process commonly known as Brexit.",
        used: false,
      },
      {
        id: "e-2",
        question: "Which planet is known as the Red Planet?",
        answer: "Mars",
        funFact:
            "Mars appears reddish because iron minerals in its soil oxidize, or rust.",
        used: false,
      },
      {
        id: "e-3",
        question:
            "How many teams played in the 2026 FIFA World Cup?",
        answer: "48 teams",
        funFact:
            "The 2026 FIFA World Cup was the first edition of the men's tournament to feature 48 teams, expanding from the previous 32-team format.",
        used: false,
      },
      {
        id: "e-4",
        question:
            "What was Jesus' first recorded miracle in the Gospel of John?",
        answer: "Turning water into wine at the wedding in Cana",
        funFact:
            "John 2 describes the miracle at Cana as the first of the signs through which Jesus revealed His glory.",
        used: false,
      },
      {
        id: "e-5",
        question:
            "Which metal is liquid at ordinary room temperature?",
        answer: "Mercury",
        funFact:
            "Mercury has a melting point of about −39°C, allowing it to remain liquid at ordinary room temperatures.",
        used: false,
      },
    ],
  },

  {
    id: "group-f",
    name: "Group F",
    questions: [
      {
        id: "f-1",
        question: "Which is the largest continent by area?",
        answer: "Asia",
        funFact:
            "Asia covers roughly 30% of Earth's land area and is also the world's most populous continent.",
        used: false,
      },
      {
        id: "f-2",
        question:
            "Which disciple was a tax collector before following Jesus?",
        answer: "Matthew",
        funFact:
            "Matthew 9:9 describes Jesus calling Matthew while he was sitting at the tax collector's booth.",
        used: false,
      },
      {
        id: "f-3",
        question: "What is the national language of Pakistan?",
        answer: "Urdu",
        funFact:
            "Urdu is Pakistan's national language, while English is also used for official purposes.",
        used: false,
      },
      {
        id: "f-4",
        question:
            "What right did the 19th Amendment to the U.S. Constitution protect from being denied on account of sex?",
        answer: "The right to vote",
        funFact:
            "Ratified in 1920, the 19th Amendment states that the right of U.S. citizens to vote cannot be denied or abridged by the United States or any state on account of sex.",
        used: false,
      },
      {
        id: "f-5",
        question:
            "Who wrote 'Snehathin Idayanaam Yeshuve' ('സ്നേഹത്തിൻ ഇടയനാം യേശുവേ')?",
        answer: "Volbrecht Nagel",
        funFact:
            "Volbrecht Nagel was a German missionary who worked in Kerala and wrote several Malayalam Christian hymns.",
        used: false,
      },
    ],
  },

  {
    id: "group-g",
    name: "Group G",
    questions: [
      {
        id: "g-1",
        question:
            "What is the smallest independent country in the world by both population and area?",
        answer: "Vatican City",
        funFact:
            "Vatican City covers an area of less than half a square kilometer and is entirely surrounded by the city of Rome.",
        used: false,
      },
      {
        id: "g-2",
        question:
            "The ancient city of Petra is located in which country?",
        answer: "Jordan",
        funFact:
            "Petra is famous for buildings carved directly into rose-colored sandstone cliffs and was once an important center of the Nabataean kingdom.",
        used: false,
      },
      {
        id: "g-3",
        question: "What was the name of Priscilla's husband?",
        answer: "Aquila (അക്വിലാസ)",
        funFact:
            "Priscilla and Aquila were a married couple who worked alongside Paul and are mentioned several times in the New Testament.",
        used: false,
      },
      {
        id: "g-4",
        question:
            "Who was the first Indian to win a Nobel Prize?",
        answer: "Rabindranath Tagore",
        funFact:
            "Rabindranath Tagore received the 1913 Nobel Prize in Literature, becoming the first Indian and first Asian Nobel laureate.",
        used: false,
      },
      {
        id: "g-5",
        question:
            "The United Kingdom is part of which diocese of the Mar Thoma Church?",
        answer: "The UK-Europe-Africa Diocese",
        funFact:
            "The UK and Europe Zone was elevated to a full diocese in 2018, forming the Diocese of United Kingdom, Europe and Africa.",
        used: false,
      },
    ],
  },
];