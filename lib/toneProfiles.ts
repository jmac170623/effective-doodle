import { QuizAnswers, ToneProfile, ToneProfileId } from "./types";

export const TONE_PROFILES: Record<ToneProfileId, ToneProfile> = {
  friendly: {
    id: "friendly",
    label: "Friendly",
    description: "Warm, welcoming and easygoing — puts customers at ease.",
  },
  "no-nonsense": {
    id: "no-nonsense",
    label: "No-Nonsense",
    description: "Bold, direct and efficient — no fluff, just the facts.",
  },
  premium: {
    id: "premium",
    label: "Premium / Detail-Oriented",
    description: "Polished, precise and craftsmanship-led.",
  },
  approachable: {
    id: "approachable",
    label: "Approachable",
    description: "Relaxed, personable and community-minded.",
  },
};

export const QUIZ_QUESTIONS = [
  {
    id: "feeling" as const,
    question: "How do you want customers to feel when they land on your site?",
    options: [
      { value: "reassured", label: "Reassured" },
      { value: "excited", label: "Excited" },
      { value: "impressed", label: "Impressed" },
      { value: "comfortable", label: "Comfortable" },
    ],
  },
  {
    id: "phrase" as const,
    question: "Pick a phrase that sounds most like you",
    options: [
      { value: "straight-to-the-point", label: "Straight to the point, no nonsense" },
      { value: "friendly-approachable", label: "Friendly and approachable" },
      { value: "professional-detail", label: "Professional and detail-oriented" },
      { value: "fun-personable", label: "Fun and personable" },
    ],
  },
  {
    id: "oneWordDescriptor" as const,
    question: "How would your regular customers describe you in one word?",
    freeText: true,
    options: undefined as { value: string; label: string }[] | undefined,
  },
  {
    id: "priority" as const,
    question: "What matters most to you in your work?",
    options: [
      { value: "reliability", label: "Reliability" },
      { value: "craftsmanship", label: "Craftsmanship" },
      { value: "speed", label: "Speed" },
      { value: "customer-relationships", label: "Customer relationships" },
    ],
  },
];

const DESCRIPTOR_LEXICON: Record<string, ToneProfileId> = {
  honest: "no-nonsense",
  reliable: "no-nonsense",
  efficient: "no-nonsense",
  punctual: "no-nonsense",
  tidy: "premium",
  meticulous: "premium",
  thorough: "premium",
  precise: "premium",
  professional: "premium",
  skilled: "premium",
  friendly: "friendly",
  warm: "friendly",
  cheerful: "friendly",
  kind: "friendly",
  helpful: "approachable",
  personable: "approachable",
  chatty: "approachable",
  "down-to-earth": "approachable",
  easygoing: "approachable",
};

function scoreDescriptor(word: string, scores: Record<ToneProfileId, number>) {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
  const match = DESCRIPTOR_LEXICON[normalized];
  if (match) scores[match] += 2;
}

export function computeToneProfile(quiz: QuizAnswers): ToneProfileId {
  const scores: Record<ToneProfileId, number> = {
    friendly: 0,
    "no-nonsense": 0,
    premium: 0,
    approachable: 0,
  };

  switch (quiz.feeling) {
    case "reassured":
      scores.approachable += 2;
      scores.friendly += 1;
      break;
    case "excited":
      scores.friendly += 2;
      break;
    case "impressed":
      scores.premium += 2;
      break;
    case "comfortable":
      scores.friendly += 2;
      scores.approachable += 1;
      break;
  }

  switch (quiz.phrase) {
    case "straight-to-the-point":
      scores["no-nonsense"] += 3;
      break;
    case "friendly-approachable":
      scores.friendly += 3;
      break;
    case "professional-detail":
      scores.premium += 3;
      break;
    case "fun-personable":
      scores.approachable += 3;
      break;
  }

  switch (quiz.priority) {
    case "reliability":
      scores["no-nonsense"] += 2;
      scores.approachable += 1;
      break;
    case "craftsmanship":
      scores.premium += 3;
      break;
    case "speed":
      scores["no-nonsense"] += 2;
      break;
    case "customer-relationships":
      scores.friendly += 2;
      scores.approachable += 2;
      break;
  }

  if (quiz.oneWordDescriptor) {
    scoreDescriptor(quiz.oneWordDescriptor, scores);
  }

  const priorityOrder: ToneProfileId[] = [
    "no-nonsense",
    "premium",
    "friendly",
    "approachable",
  ];

  let winner: ToneProfileId = "friendly";
  let best = -1;
  for (const id of priorityOrder) {
    if (scores[id] > best) {
      best = scores[id];
      winner = id;
    }
  }
  return winner;
}
