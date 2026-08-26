export const teams = [
  { rank: 1, number: 1678, name: "Citrus Circuits", opr: 68.4, reliability: 98, tier: "A" },
  { rank: 2, number: 694, name: "StuyPulse", opr: 61.8, reliability: 96, tier: "A" },
  { rank: 3, number: 1155, name: "SciBorgs", opr: 57.2, reliability: 93, tier: "A" },
  { rank: 4, number: 3419, name: "The Roebling's", opr: 49.7, reliability: 90, tier: "B" },
  { rank: 5, number: 399, name: "Eagle Robotics", opr: 44.6, reliability: 87, tier: "B" },
];
export const matches = [
  { time: "9:42", number: 18, red: "694 · 1880 · 3044", blue: "1678 · 3419 · 1155", status: "Live" },
  { time: "9:50", number: 19, red: "399 · 1796 · 383", blue: "340 · 1902 · 316", status: "Next" },
  { time: "9:58", number: 20, red: "694 · 1155 · 399", blue: "1678 · 3044 · 3419", status: "Upcoming" },
];
export const assignments = [
  { match: "Qualification 18", team: "694 · StuyPulse", kind: "Objective", due: "Now", status: "in_progress" },
  { match: "Qualification 20", team: "694 · StuyPulse", kind: "Subjective", due: "9:58 AM", status: "pending" },
  { match: "Qualification 24", team: "1678 · Citrus Circuits", kind: "Objective", due: "10:30 AM", status: "pending" },
];
