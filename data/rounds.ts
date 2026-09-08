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
      { id: "ca-1", points: 10, question: "Placeholder Current Affairs question 1?", answer: "Placeholder answer 1", used: false },
      { id: "ca-2", points: 10, question: "Placeholder Current Affairs question 2?", answer: "Placeholder answer 2", used: false },
      { id: "ca-3", points: 10, question: "Placeholder Current Affairs question 3?", answer: "Placeholder answer 3", used: false },
      { id: "ca-4", points: 10, question: "Placeholder Current Affairs question 4?", answer: "Placeholder answer 4", used: false },
      { id: "ca-5", points: 10, question: "Placeholder Current Affairs question 5?", answer: "Placeholder answer 5", used: false },
      { id: "ca-6", points: 10, question: "Placeholder Current Affairs question 6?", answer: "Placeholder answer 6", used: false },
      { id: "ca-7", points: 10, question: "Placeholder Current Affairs question 7?", answer: "Placeholder answer 7", used: false },
      { id: "ca-8", points: 10, question: "Placeholder Current Affairs question 8?", answer: "Placeholder answer 8", used: false },
      { id: "ca-9", points: 10, question: "Placeholder Current Affairs question 9?", answer: "Placeholder answer 9", used: false },
      { id: "ca-10", points: 10, question: "Placeholder Current Affairs question 10?", answer: "Placeholder answer 10", used: false },
    ],
  },
  {
    id: "science-sports-culture",
    order: 2,
    name: "Science, Sports & Culture",
    questions: [
      { id: "ssc-1", points: 10, question: "Placeholder Science/Sports/Culture question 1?", answer: "Placeholder answer 1", used: false },
      { id: "ssc-2", points: 10, question: "Placeholder Science/Sports/Culture question 2?", answer: "Placeholder answer 2", used: false },
      { id: "ssc-3", points: 10, question: "Placeholder Science/Sports/Culture question 3?", answer: "Placeholder answer 3", used: false },
      { id: "ssc-4", points: 10, question: "Placeholder Science/Sports/Culture question 4?", answer: "Placeholder answer 4", used: false },
      { id: "ssc-5", points: 10, question: "Placeholder Science/Sports/Culture question 5?", answer: "Placeholder answer 5", used: false },
      { id: "ssc-6", points: 10, question: "Placeholder Science/Sports/Culture question 6?", answer: "Placeholder answer 6", used: false },
      { id: "ssc-7", points: 10, question: "Placeholder Science/Sports/Culture question 7?", answer: "Placeholder answer 7", used: false },
      { id: "ssc-8", points: 10, question: "Placeholder Science/Sports/Culture question 8?", answer: "Placeholder answer 8", used: false },
      { id: "ssc-9", points: 10, question: "Placeholder Science/Sports/Culture question 9?", answer: "Placeholder answer 9", used: false },
      { id: "ssc-10", points: 10, question: "Placeholder Science/Sports/Culture question 10?", answer: "Placeholder answer 10", used: false },
    ],
  },
  {
    id: "picture-personalities",
    order: 3,
    name: "Picture Round",
    description: "Important Personalities",
    isPicture: true,
    questions: [
      { id: "pic-1", points: 10, question: "Who is this personality?", answer: "Placeholder name 1", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-2", points: 10, question: "Who is this personality?", answer: "Placeholder name 2", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-3", points: 10, question: "Who is this personality?", answer: "Placeholder name 3", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-4", points: 10, question: "Who is this personality?", answer: "Placeholder name 4", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-5", points: 10, question: "Who is this personality?", answer: "Placeholder name 5", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-6", points: 10, question: "Who is this personality?", answer: "Placeholder name 6", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-7", points: 10, question: "Who is this personality?", answer: "Placeholder name 7", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-8", points: 10, question: "Who is this personality?", answer: "Placeholder name 8", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-9", points: 10, question: "Who is this personality?", answer: "Placeholder name 9", imageUrl: "/questions/placeholder.svg", used: false },
      { id: "pic-10", points: 10, question: "Who is this personality?", answer: "Placeholder name 10", imageUrl: "/questions/placeholder.svg", used: false },
    ],
  },
  {
    id: "life-of-jesus",
    order: 4,
    name: "Bible: Life of Jesus",
    questions: [
      { id: "loj-1", points: 10, question: "Placeholder Life of Jesus question 1?", answer: "Placeholder answer 1", used: false },
      { id: "loj-2", points: 10, question: "Placeholder Life of Jesus question 2?", answer: "Placeholder answer 2", used: false },
      { id: "loj-3", points: 10, question: "Placeholder Life of Jesus question 3?", answer: "Placeholder answer 3", used: false },
      { id: "loj-4", points: 10, question: "Placeholder Life of Jesus question 4?", answer: "Placeholder answer 4", used: false },
      { id: "loj-5", points: 10, question: "Placeholder Life of Jesus question 5?", answer: "Placeholder answer 5", used: false },
      { id: "loj-6", points: 10, question: "Placeholder Life of Jesus question 6?", answer: "Placeholder answer 6", used: false },
      { id: "loj-7", points: 10, question: "Placeholder Life of Jesus question 7?", answer: "Placeholder answer 7", used: false },
      { id: "loj-8", points: 10, question: "Placeholder Life of Jesus question 8?", answer: "Placeholder answer 8", used: false },
      { id: "loj-9", points: 10, question: "Placeholder Life of Jesus question 9?", answer: "Placeholder answer 9", used: false },
      { id: "loj-10", points: 10, question: "Placeholder Life of Jesus question 10?", answer: "Placeholder answer 10", used: false },
    ],
  },
  {
    id: "egypt-to-promised-land",
    order: 5,
    name: "From Egypt to the Promised Land",
    description: "Exodus – Joshua",
    questions: [
      { id: "epl-1", points: 10, question: "Placeholder Exodus–Joshua question 1?", answer: "Placeholder answer 1", used: false },
      { id: "epl-2", points: 10, question: "Placeholder Exodus–Joshua question 2?", answer: "Placeholder answer 2", used: false },
      { id: "epl-3", points: 10, question: "Placeholder Exodus–Joshua question 3?", answer: "Placeholder answer 3", used: false },
      { id: "epl-4", points: 10, question: "Placeholder Exodus–Joshua question 4?", answer: "Placeholder answer 4", used: false },
      { id: "epl-5", points: 10, question: "Placeholder Exodus–Joshua question 5?", answer: "Placeholder answer 5", used: false },
      { id: "epl-6", points: 10, question: "Placeholder Exodus–Joshua question 6?", answer: "Placeholder answer 6", used: false },
      { id: "epl-7", points: 10, question: "Placeholder Exodus–Joshua question 7?", answer: "Placeholder answer 7", used: false },
      { id: "epl-8", points: 10, question: "Placeholder Exodus–Joshua question 8?", answer: "Placeholder answer 8", used: false },
      { id: "epl-9", points: 10, question: "Placeholder Exodus–Joshua question 9?", answer: "Placeholder answer 9", used: false },
      { id: "epl-10", points: 10, question: "Placeholder Exodus–Joshua question 10?", answer: "Placeholder answer 10", used: false },
    ],
  },
  {
    id: "churches-worldwide",
    order: 6,
    name: "Churches Worldwide",
    questions: [
      { id: "cw-1", points: 10, question: "Placeholder Churches Worldwide question 1?", answer: "Placeholder answer 1", used: false },
      { id: "cw-2", points: 10, question: "Placeholder Churches Worldwide question 2?", answer: "Placeholder answer 2", used: false },
      { id: "cw-3", points: 10, question: "Placeholder Churches Worldwide question 3?", answer: "Placeholder answer 3", used: false },
      { id: "cw-4", points: 10, question: "Placeholder Churches Worldwide question 4?", answer: "Placeholder answer 4", used: false },
      { id: "cw-5", points: 10, question: "Placeholder Churches Worldwide question 5?", answer: "Placeholder answer 5", used: false },
      { id: "cw-6", points: 10, question: "Placeholder Churches Worldwide question 6?", answer: "Placeholder answer 6", used: false },
      { id: "cw-7", points: 10, question: "Placeholder Churches Worldwide question 7?", answer: "Placeholder answer 7", used: false },
      { id: "cw-8", points: 10, question: "Placeholder Churches Worldwide question 8?", answer: "Placeholder answer 8", used: false },
      { id: "cw-9", points: 10, question: "Placeholder Churches Worldwide question 9?", answer: "Placeholder answer 9", used: false },
      { id: "cw-10", points: 10, question: "Placeholder Churches Worldwide question 10?", answer: "Placeholder answer 10", used: false },
    ],
  },
];
