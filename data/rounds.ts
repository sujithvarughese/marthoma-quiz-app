import type { Round } from "@/lib/types";

/**
 * QUESTION DATA — edit this file to add your real questions.
 *
 * Each round has 10 questions, all worth the same 10 points. On the board they
 * appear as 10 numbered cards; a team picks a card to answer it. A wrong answer
 * can be passed to another team for 5 points. Once a card is chosen it locks.
 *
 * To add real content, just replace the `question` and `answer` strings below
 * (and `imageUrl` for the Picture Round). Keep `points: 10` and `used: false`.
 *
 * Fields per question:
 *   id        — unique within the round (leave as-is or rename)
 *   points    — keep at 10 (same value for every question)
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
    description: "2020 – 2026",
    questions: [
      {
        id: "ca-1",
        points: 10,
        question: "What global pandemic led to widespread lockdowns around the world beginning in 2020?",
        answer: "COVID-19",
        used: false,
      },
      {
        id: "ca-2",
        points: 10,
        question: "Which country officially left the European Union in 2020?",
        answer: "The United Kingdom",
        used: false,
      },
      {
        id: "ca-3",
        points: 10,
        question: "The 2020 Summer Olympics were postponed because of the pandemic and eventually held in 2021. Which city hosted them?",
        answer: "Tokyo, Japan",
        used: false,
      },
      {
        id: "ca-4",
        points: 10,
        question: "What powerful space telescope was launched on Christmas Day in 2021?",
        answer: "The James Webb Space Telescope (JWST)",
        used: false,
      },
      {
        id: "ca-5",
        points: 10,
        question: "Which British monarch died in September 2022 after reigning for more than 70 years?",
        answer: "Queen Elizabeth II",
        used: false,
      },
      {
        id: "ca-6",
        points: 10,
        question: "Which country's Chandrayaan-3 mission successfully landed near the Moon's south polar region in 2023?",
        answer: "India",
        used: false,
      },
      {
        id: "ca-7",
        points: 10,
        question: "Which city hosted the 2024 Summer Olympic Games?",
        answer: "Paris, France",
        used: false,
      },
      {
        id: "ca-8",
        points: 10,
        question: "Which social media platform was renamed 'X' in 2023?",
        answer: "Twitter",
        used: false,
      },
      {
        id: "ca-9",
        points: 10,
        question: "What name did Cardinal Robert Francis Prevost choose after being elected pope in 2025?",
        answer: "Pope Leo XIV",
        used: false,
      },
      {
        id: "ca-10",
        points: 10,
        question: "Pope Leo XIV made history in 2025 as the first pope born in which country?",
        answer: "The United States",
        used: false,
      },
    ],
  },

  {
    id: "science-sports-culture",
    order: 2,
    name: "Science, Sports & Culture",
    questions: [
      {
        id: "ssc-1",
        points: 10,
        question: "What is the largest planet in our solar system?",
        answer: "Jupiter",
        used: false,
      },
      {
        id: "ssc-2",
        points: 10,
        question: "What is the chemical symbol for gold?",
        answer: "Au",
        used: false,
      },
      {
        id: "ssc-3",
        points: 10,
        question: "Which organ in the human body produces insulin?",
        answer: "The pancreas",
        used: false,
      },
      {
        id: "ssc-4",
        points: 10,
        question: "Which gas makes up the largest percentage of Earth's atmosphere?",
        answer: "Nitrogen",
        used: false,
      },
      {
        id: "ssc-5",
        points: 10,
        question: "How many players from one team are normally on the field at a time in soccer?",
        answer: "11",
        used: false,
      },
      {
        id: "ssc-6",
        points: 10,
        question: "In tennis, what word is used for a score of zero?",
        answer: "Love",
        used: false,
      },
      {
        id: "ssc-7",
        points: 10,
        question: "Which country won the 2022 FIFA World Cup?",
        answer: "Argentina",
        used: false,
      },
      {
        id: "ssc-8",
        points: 10,
        question: "In which sport would you perform a slam dunk?",
        answer: "Basketball",
        used: false,
      },
      {
        id: "ssc-9",
        points: 10,
        question: "Which Indian festival is widely known as the Festival of Lights?",
        answer: "Diwali",
        used: false,
      },
      {
        id: "ssc-10",
        points: 10,
        question: "What is the name of the fictional school attended by Harry Potter?",
        answer: "Hogwarts School of Witchcraft and Wizardry (Hogwarts)",
        used: false,
      },
    ],
  },

  {
    id: "picture-personalities",
    order: 3,
    name: "Picture Round",
    description: "Important Personalities",
    isPicture: true,
    questions: [
      {
        id: "pic-1",
        points: 10,
        question: "Who is this personality?",
        answer: "Pope Leo XIV",
        imageUrl: "/questions/pope-leo-xiv.jpg",
        used: false,
      },
      {
        id: "pic-2",
        points: 10,
        question: "Who is this personality?",
        answer: "Narendra Modi",
        imageUrl: "/questions/narendra-modi.jpg",
        used: false,
      },
      {
        id: "pic-3",
        points: 10,
        question: "Who is this personality?",
        answer: "Lionel Messi",
        imageUrl: "/questions/lionel-messi.jpg",
        used: false,
      },
      {
        id: "pic-4",
        points: 10,
        question: "Who is this personality?",
        answer: "Malala Yousafzai",
        imageUrl: "/questions/malala-yousafzai.jpg",
        used: false,
      },
      {
        id: "pic-5",
        points: 10,
        question: "Who is this personality?",
        answer: "Sundar Pichai",
        imageUrl: "/questions/sundar-pichai.jpg",
        used: false,
      },
      {
        id: "pic-6",
        points: 10,
        question: "Who is this personality?",
        answer: "Taylor Swift",
        imageUrl: "/questions/taylor-swift.jpg",
        used: false,
      },
      {
        id: "pic-7",
        points: 10,
        question: "Who is this personality?",
        answer: "Sachin Tendulkar",
        imageUrl: "/questions/sachin-tendulkar.jpg",
        used: false,
      },
      {
        id: "pic-8",
        points: 10,
        question: "Who is this personality?",
        answer: "Mother Teresa",
        imageUrl: "/questions/mother-teresa.jpg",
        used: false,
      },
      {
        id: "pic-9",
        points: 10,
        question: "Who is this personality?",
        answer: "Nelson Mandela",
        imageUrl: "/questions/nelson-mandela.jpg",
        used: false,
      },
      {
        id: "pic-10",
        points: 10,
        question: "Who is this personality?",
        answer: "A. P. J. Abdul Kalam",
        imageUrl: "/questions/apj-abdul-kalam.jpg",
        used: false,
      },
    ],
  },

  {
    id: "life-of-jesus",
    order: 4,
    name: "Bible: Life of Jesus",
    questions: [
      {
        id: "loj-1",
        points: 10,
        question: "In which town was Jesus born?",
        answer: "Bethlehem",
        used: false,
      },
      {
        id: "loj-2",
        points: 10,
        question: "Who baptized Jesus in the Jordan River?",
        answer: "John the Baptist",
        used: false,
      },
      {
        id: "loj-3",
        points: 10,
        question: "What was Jesus' first recorded miracle in the Gospel of John?",
        answer: "Turning water into wine at the wedding in Cana",
        used: false,
      },
      {
        id: "loj-4",
        points: 10,
        question: "How many apostles did Jesus choose?",
        answer: "12",
        used: false,
      },
      {
        id: "loj-5",
        points: 10,
        question: "Which disciple walked on water toward Jesus?",
        answer: "Peter",
        used: false,
      },
      {
        id: "loj-6",
        points: 10,
        question: "Jesus fed about 5,000 people using five loaves and how many fish?",
        answer: "Two fish",
        used: false,
      },
      {
        id: "loj-7",
        points: 10,
        question: "Which man did Jesus raise from the dead after he had been in the tomb for four days?",
        answer: "Lazarus",
        used: false,
      },
      {
        id: "loj-8",
        points: 10,
        question: "Which disciple betrayed Jesus for thirty pieces of silver?",
        answer: "Judas Iscariot",
        used: false,
      },
      {
        id: "loj-9",
        points: 10,
        question: "In which garden did Jesus pray on the night before His crucifixion?",
        answer: "The Garden of Gethsemane",
        used: false,
      },
      {
        id: "loj-10",
        points: 10,
        question: "According to the Gospels, who was compelled to carry Jesus' cross on the way to the crucifixion?",
        answer: "Simon of Cyrene",
        used: false,
      },
    ],
  },

  {
    id: "egypt-to-promised-land",
    order: 5,
    name: "From Egypt to the Promised Land",
    description: "Exodus – Joshua",
    questions: [
      {
        id: "epl-1",
        points: 10,
        question: "Who did God call to lead the Israelites out of Egypt?",
        answer: "Moses",
        used: false,
      },
      {
        id: "epl-2",
        points: 10,
        question: "What appeared to Moses in the wilderness and burned without being consumed?",
        answer: "A burning bush",
        used: false,
      },
      {
        id: "epl-3",
        points: 10,
        question: "How many plagues did God send upon Egypt before Pharaoh finally let the Israelites go?",
        answer: "10",
        used: false,
      },
      {
        id: "epl-4",
        points: 10,
        question: "Which body of water did the Israelites cross after leaving Egypt?",
        answer: "The Red Sea",
        used: false,
      },
      {
        id: "epl-5",
        points: 10,
        question: "What food did God provide from heaven for the Israelites in the wilderness?",
        answer: "Manna",
        used: false,
      },
      {
        id: "epl-6",
        points: 10,
        question: "On which mountain did Moses receive the Ten Commandments?",
        answer: "Mount Sinai",
        used: false,
      },
      {
        id: "epl-7",
        points: 10,
        question: "How many spies were sent to explore the land of Canaan?",
        answer: "12",
        used: false,
      },
      {
        id: "epl-8",
        points: 10,
        question: "Which two spies believed that Israel could successfully take possession of the Promised Land?",
        answer: "Joshua and Caleb",
        used: false,
      },
      {
        id: "epl-9",
        points: 10,
        question: "Who succeeded Moses as leader of the Israelites?",
        answer: "Joshua",
        used: false,
      },
      {
        id: "epl-10",
        points: 10,
        question: "The walls of which city fell after the Israelites marched around it for seven days?",
        answer: "Jericho",
        used: false,
      },
    ],
  },

  {
    id: "churches-worldwide",
    order: 6,
    name: "Churches Worldwide",
    questions: [
      {
        id: "cw-1",
        points: 10,
        question: "In which city is St. Peter's Basilica located?",
        answer: "Vatican City",
        used: false,
      },
      {
        id: "cw-2",
        points: 10,
        question: "Which apostle is traditionally regarded as the first bishop of Rome?",
        answer: "Saint Peter",
        used: false,
      },
      {
        id: "cw-3",
        points: 10,
        question: "Which major branch of Christianity is led by the Pope?",
        answer: "The Roman Catholic Church",
        used: false,
      },
      {
        id: "cw-4",
        points: 10,
        question: "The Church of England separated from the authority of Rome during the reign of which English king?",
        answer: "King Henry VIII",
        used: false,
      },
      {
        id: "cw-5",
        points: 10,
        question: "Martin Luther's Ninety-five Theses are traditionally associated with the beginning of which major Christian movement?",
        answer: "The Protestant Reformation",
        used: false,
      },
      {
        id: "cw-6",
        points: 10,
        question: "Which city is home to the Church of the Holy Sepulchre, traditionally identified with the crucifixion and resurrection of Jesus?",
        answer: "Jerusalem",
        used: false,
      },
      {
        id: "cw-7",
        points: 10,
        question: "Which apostle is traditionally associated with bringing Christianity to India?",
        answer: "Saint Thomas the Apostle",
        used: false,
      },
      {
        id: "cw-8",
        points: 10,
        question: "In which Indian state is the Mar Thoma Syrian Church headquartered?",
        answer: "Kerala",
        used: false,
      },
      {
        id: "cw-9",
        points: 10,
        question: "What name is commonly given to the worldwide fellowship of churches historically connected to the Church of England?",
        answer: "The Anglican Communion",
        used: false,
      },
      {
        id: "cw-10",
        points: 10,
        question: "What is the largest church building in Vatican City and one of the most famous Christian churches in the world?",
        answer: "St. Peter's Basilica",
        used: false,
      },
    ],
  },
];