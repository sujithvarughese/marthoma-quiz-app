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
  { id: "rf-bib-1", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-2", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-3", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-4", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-5", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-6", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-7", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },
  { id: "rf-bib-8", points: 2, question: "Placeholder: quick Bible question?", answer: "Placeholder", used: false },

  // General Knowledge
  { id: "rf-gk-1", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },
  { id: "rf-gk-2", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },
  { id: "rf-gk-3", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },
  { id: "rf-gk-4", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },
  { id: "rf-gk-5", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },
  { id: "rf-gk-6", points: 2, question: "Placeholder: quick GK question?", answer: "Placeholder", used: false },

  // India
  { id: "rf-ind-1", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },
  { id: "rf-ind-2", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },
  { id: "rf-ind-3", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },
  { id: "rf-ind-4", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },
  { id: "rf-ind-5", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },
  { id: "rf-ind-6", points: 2, question: "Placeholder: quick India question?", answer: "Placeholder", used: false },

  // Current Affairs
  { id: "rf-ca-1", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },
  { id: "rf-ca-2", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },
  { id: "rf-ca-3", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },
  { id: "rf-ca-4", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },
  { id: "rf-ca-5", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },
  { id: "rf-ca-6", points: 2, question: "Placeholder: quick current-affairs question?", answer: "Placeholder", used: false },

  // Mar Thoma Church
  { id: "rf-mtc-1", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
  { id: "rf-mtc-2", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
  { id: "rf-mtc-3", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
  { id: "rf-mtc-4", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
  { id: "rf-mtc-5", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
  { id: "rf-mtc-6", points: 2, question: "Placeholder: quick Mar Thoma Church question?", answer: "Placeholder", used: false },
];
