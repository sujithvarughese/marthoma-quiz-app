import type { Question } from "@/lib/types";

/**
 * RAPID FIRE POOL — a single mixed bag of short questions.
 *
 * During play, each team is dealt 5 *random* unused questions from this pool
 * and has one 60-second countdown to answer as many as they can (+2 each, no
 * passing, unanswered questions do not carry over). Make sure the pool is large
 * enough: 5 questions × number of teams, plus a buffer.
 *
 * The `points` field is ignored for rapid fire (scoring is a flat +2) but is
 * kept so the type matches the rest of the app. Categories in the comments are
 * just to help you balance the mix — Bible, GK, India, Current Affairs,
 * Mar Thoma Church.
 */

export const rapidFirePool: Question[] = [
  // Bible
  { id: "rf-bib-1", points: 5, question: "Who built the ark?", answer: "Noah", used: false },
  { id: "rf-bib-2", points: 5, question: "Who killed Goliath?", answer: "David", used: false },
  { id: "rf-bib-3", points: 5, question: "Who was swallowed by a great fish?", answer: "Jonah", used: false },
  { id: "rf-bib-4", points: 5, question: "Who was the first man?", answer: "Adam", used: false },
  { id: "rf-bib-5", points: 5, question: "Who betrayed Jesus?", answer: "Judas Iscariot", used: false },
  { id: "rf-bib-6", points: 5, question: "How many disciples did Jesus choose?", answer: "12", used: false },
  { id: "rf-bib-7", points: 5, question: "What was the name of Moses' brother?", answer: "Aaron", used: false },
  { id: "rf-bib-8", points: 5, question: "Who was the mother of Jesus?", answer: "Mary", used: false },

  // General Knowledge
  { id: "rf-gk-1", points: 5, question: "What is the largest ocean on Earth?", answer: "Pacific Ocean", used: false },
  { id: "rf-gk-2", points: 5, question: "How many continents are there?", answer: "7", used: false },
  { id: "rf-gk-3", points: 5, question: "What planet is known as the Red Planet?", answer: "Mars", used: false },
  { id: "rf-gk-4", points: 5, question: "What is the capital of Australia?", answer: "Canberra", used: false },
  { id: "rf-gk-5", points: 5, question: "How many sides does a hexagon have?", answer: "6", used: false },
  { id: "rf-gk-6", points: 5, question: "What is the largest mammal in the world?", answer: "Blue whale", used: false },

  // India
  { id: "rf-ind-1", points: 5, question: "What is the capital of India?", answer: "New Delhi", used: false },
  { id: "rf-ind-2", points: 5, question: "What is the national animal of India?", answer: "Bengal tiger", used: false },
  { id: "rf-ind-3", points: 5, question: "Who was the first Prime Minister of independent India?", answer: "Jawaharlal Nehru", used: false },
  { id: "rf-ind-4", points: 5, question: "Which Indian city is home to the Taj Mahal?", answer: "Agra", used: false },
  { id: "rf-ind-5", points: 5, question: "Which state is known as God's Own Country?", answer: "Kerala", used: false },
  { id: "rf-ind-6", points: 5, question: "What is the currency of India?", answer: "Indian rupee", used: false },

  // Current Affairs
  { id: "rf-ca-1", points: 5, question: "Which city hosted the 2024 Summer Olympics?", answer: "Paris", used: false },
  { id: "rf-ca-2", points: 5, question: "Which country won the 2022 FIFA World Cup?", answer: "Argentina", used: false },
  { id: "rf-ca-3", points: 5, question: "What was Twitter renamed in 2023?", answer: "X", used: false },
  { id: "rf-ca-4", points: 5, question: "Which Indian mission landed on the Moon in 2023?", answer: "Chandrayaan-3", used: false },
  { id: "rf-ca-5", points: 5, question: "What name did Robert Francis Prevost choose when he became pope in 2025?", answer: "Leo XIV", used: false },
  { id: "rf-ca-6", points: 5, question: "Pope Leo XIV became the first pope born in which country?", answer: "United States", used: false },

  // Mar Thoma Church
  { id: "rf-mtc-1", points: 5, question: "Which apostle is traditionally credited with bringing Christianity to India?", answer: "Saint Thomas the Apostle", used: false },
  { id: "rf-mtc-2", points: 5, question: "In what year is Saint Thomas traditionally believed to have arrived in India?", answer: "AD 52", used: false },
  { id: "rf-mtc-3", points: 5, question: "In which Indian state did Saint Thomas traditionally begin his mission?", answer: "Kerala", used: false },
  { id: "rf-mtc-4", points: 5, question: "In which Kerala town is the headquarters of the Mar Thoma Church?", answer: "Thiruvalla", used: false },
  { id: "rf-mtc-5", points: 5, question: "What symbol at the center of the Mar Thoma Church logo represents Jesus Christ?", answer: "The Cross", used: false },
  { id: "rf-mtc-6", points: 5, question: "What symbol in the Mar Thoma Church logo represents the Church's Indian roots?", answer: "The Ashoka Chakra", used: false },
];