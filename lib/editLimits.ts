// Every site gets this many AI-powered feedback edits for free; beyond
// that, each additional edit consumes a purchased credit — each one is a
// real Claude API call, so it isn't free to offer unlimited edits.
export const FREE_EDIT_CAP = 5;

interface EditEligibility {
  allowed: boolean;
  usesCredit: boolean;
  freeRemaining: number;
}

export function checkEditEligibility(usedEditCount: number, editCredits: number): EditEligibility {
  const freeRemaining = Math.max(0, FREE_EDIT_CAP - usedEditCount);

  if (freeRemaining > 0) {
    return { allowed: true, usesCredit: false, freeRemaining };
  }
  if (editCredits > 0) {
    return { allowed: true, usesCredit: true, freeRemaining: 0 };
  }
  return { allowed: false, usesCredit: false, freeRemaining: 0 };
}
