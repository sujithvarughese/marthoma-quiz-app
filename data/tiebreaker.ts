import type { Question } from "@/lib/types";

/**
 * SUDDEN-DEATH TIEBREAKER POOL — used only if teams are tied for 1st place
 * once Rapid Fire is complete.
 *
 * All tied teams get the same question at the same time and have 60 seconds
 * to write their answer on a whiteboard; everyone reveals at once and the
 * host grades each board. The host works through this pool one question at a
 * time until exactly one tied team is correct and the rest are wrong. Keep a
 * healthy number here in case several rounds are needed.
 *
 * Some questions may be picture questions — add an `imageUrl` (a path in
 * /public or a full URL) the same way the Picture Round does.
 */

export const tiebreakerPool: Question[] = [
  {
    id: "tb-1",
    question: "Name the personality.",
    answer: "Marie Curie",
    imageUrl: "/questions/marie-curie.jpg",
    funFact: "Physics/Chemistry — Two Nobel Prizes in Physics and Chemistry.",
    used: false,
  },
  {
    id: "tb-2",
    question: "Name the personality.",
    answer: "Thomas Edison",
    imageUrl: "/questions/thomas-edison.jpg",
    funFact: "Inventor — Electric light bulb.",
    used: false,
  },
  {
    id: "tb-3",
    question: "Name the personality.",
    answer: "Pranab Mukherjee",
    imageUrl: "/questions/pranab-mukherjee.jpg",
    funFact: "Pranab Mukherjee served as the 13th President of India from 2012 to 2017.",
    used: false,
  },
  {
    id: "tb-4",
    question: "Name the personality.",
    answer: "Arundhati Roy",
    imageUrl: "/questions/arundhati-roy.jpg",
    funFact: "Booker Prize for her novel The God of Small Things.",
    used: false,
  },
  {
    id: "tb-5",
    question:
        "In the purification ceremony for a person healed of a skin disease, what happened to the living bird after it was dipped in the blood of the sacrificed bird? (ത്വക്‌രോഗത്തിൽനിന്ന് സുഖപ്പെട്ട ഒരാളുടെ ശുദ്ധീകരണച്ചടങ്ങിൽ, അറുക്കപ്പെട്ട പക്ഷിയുടെ രക്തത്തിൽ മുക്കിയ ജീവനുള്ള പക്ഷിയെ പിന്നീട് എന്തുചെയ്തു?)",
    answer:
        "It was released into the open fields. (Leviticus 14:4–7) / അതിനെ തുറസ്സായ വയലിലേക്ക് പറത്തിവിട്ടു.",
    funFact:
        "The purification ceremony used two birds: one was killed over fresh water, while the other was dipped in its blood and then released into the open field.",
    used: false,
  },
  {
    id: "tb-6",
    question:
        "What three things appeared on Aaron’s staff to confirm that God had chosen the tribe of Levi? (ദൈവം ലേവി ഗോത്രത്തെ തിരഞ്ഞെടുത്തുവെന്ന് സ്ഥിരീകരിക്കുന്നതിനായി അഹരോന്റെ വടിയിൽ പ്രത്യക്ഷപ്പെട്ട മൂന്നു കാര്യങ്ങൾ എന്തൊക്കെയായിരുന്നു?)",
    answer:
        "Buds, blossoms and ripe almonds. (Numbers 17:8) / മുളകൾ പൊട്ടി, പൂക്കൾ വിരിഞ്ഞ്, ബദാം പഴുത്തു.",
    funFact:
        "Aaron’s staff miraculously produced buds, blossoms, and ripe almonds overnight, confirming God’s choice of Aaron and the tribe of Levi.",
    used: false,
  },
  {
    id: "tb-7",
    question:
        "Which reformer is particularly associated with the Reformation in Geneva, Switzerland?",
    answer: "John Calvin",
    funFact:
        "John Calvin made Geneva a major center of the Protestant Reformation, and his teachings became the foundation of the Reformed tradition known as Calvinism.",
    used: false,
  },
  {
    id: "tb-8",
    question:
        "Who is considered the senior bishop and symbolic spiritual leader of the worldwide Anglican Communion?",
    answer: "Archbishop of Canterbury",
    funFact:
        "The Archbishop of Canterbury is known as the 'first among equals' among the bishops of the worldwide Anglican Communion.",
    used: false,
  },
  {
    id: "tb-9",
    question:
        "Which is the largest and historically most prominent Christian Church in Egypt?",
    answer: "The Coptic Orthodox Church",
    funFact:
        "The Coptic Orthodox Church traces its origins to St. Mark the Evangelist, who according to church tradition brought Christianity to Alexandria in the first century.",
    used: false,
  },
  {
    id: "tb-10",
    question:
        "In tennis, what term describes winning all four major singles championships in the same calendar year — Australian Open, French Open, Wimbledon and U.S. Open?",
    answer: "Calendar Grand Slam",
    funFact:
        "Only a small number of singles players have completed a Calendar Grand Slam; Rod Laver was the last man to accomplish it, in 1969.",
    used: false,
  },
  {
    id: "tb-11",
    question:
        "Which Mar Thoma hymn writer was popularly known as “Vidhuwan Kutty Achen”? (“വിദ്വാൻകുട്ടി അച്ചൻ” എന്ന പേരിൽ അറിയപ്പെട്ടിരുന്ന മാർത്തോമ്മാ സഭയിലെ ഗാനരചയിതാവ് ആര്?)",
    answer: "Rev. Yusthus Joseph",
    funFact:
        "Rev. Yusthus Joseph, popularly known as Vidhuwan Kutty Achen, was a noted Malayalam Christian hymn writer associated with the Mar Thoma Church.",
    used: false,
  },
  {
    id: "tb-12",
    question:
        "In which year did the reformation movement led by Abraham Malpan begin in the Malankara Church, eventually leading to the formation of the Mar Thoma Church?",
    answer: "1836",
    funFact:
        "In 1836, Abraham Malpan introduced reforms in worship and church practice that became an important milestone in the reformation movement within the Malankara Church.",
    used: false,
  },
  {
    id: "tb-13",
    question:
        "Kuchipudi is a classical dance form originating in which Indian state?",
    answer: "Andhra Pradesh",
    funFact:
        "Kuchipudi takes its name from the village of Kuchipudi in Andhra Pradesh, where the dance tradition developed.",
    used: false,
  },
];
