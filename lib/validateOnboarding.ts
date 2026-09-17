import { OnboardingData, ServiceItem, SocialLinks } from "./types";

function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseSocial(input: unknown): SocialLinks {
  const social = (input as Record<string, unknown>) || {};
  return {
    facebook: typeof social.facebook === "string" ? normalizeUrl(social.facebook) : undefined,
    instagram: typeof social.instagram === "string" ? normalizeUrl(social.instagram) : undefined,
    tiktok: typeof social.tiktok === "string" ? normalizeUrl(social.tiktok) : undefined,
    website: typeof social.website === "string" ? normalizeUrl(social.website) : undefined,
  };
}

function parseServices(input: unknown): { data: ServiceItem[] } | { error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "At least one service is required." };
  }
  for (const s of input) {
    if (typeof s !== "object" || s === null || typeof (s as { name?: unknown }).name !== "string" || (s as { name: string }).name.trim() === "") {
      return { error: "Each service needs a name." };
    }
  }
  return {
    data: (input as { name: string; description?: string }[]).map((s, i) => ({
      id: `svc_${i}_${Math.random().toString(36).slice(2, 8)}`,
      name: s.name.trim(),
      description: s.description?.trim() || undefined,
    })),
  };
}

export function validateOnboarding(input: unknown): { data: OnboardingData } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Invalid submission." };
  }
  const d = input as Record<string, unknown>;

  const required: [string, unknown][] = [
    ["fullName", d.fullName],
    ["trade", d.trade],
    ["businessName", d.businessName],
    ["areaCovered", d.areaCovered],
    ["phone", d.phone],
    ["email", d.email],
    ["aboutText", d.aboutText],
  ];
  for (const [key, value] of required) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return { error: `Missing required field: ${key}` };
    }
  }

  const services = parseServices(d.services);
  if ("error" in services) return services;

  const quiz = d.quiz as Record<string, unknown> | undefined;
  if (
    !quiz ||
    typeof quiz.feeling !== "string" ||
    typeof quiz.phrase !== "string" ||
    typeof quiz.priority !== "string" ||
    typeof quiz.oneWordDescriptor !== "string"
  ) {
    return { error: "Please complete the personality quiz." };
  }

  const yearsExperience = Number(d.yearsExperience);
  if (Number.isNaN(yearsExperience) || yearsExperience < 0) {
    return { error: "Years of experience must be a number." };
  }

  const data: OnboardingData = {
    fullName: (d.fullName as string).trim(),
    age: d.age ? Number(d.age) : undefined,
    trade: (d.trade as string).trim(),
    yearsExperience,
    businessName: (d.businessName as string).trim(),
    areaCovered: (d.areaCovered as string).trim(),
    dayRate: d.dayRate ? Number(d.dayRate) : undefined,
    phone: (d.phone as string).trim(),
    email: (d.email as string).trim(),
    social: parseSocial(d.social),
    services: services.data,
    aboutText: (d.aboutText as string).trim(),
    quiz: {
      feeling: quiz.feeling as string,
      phrase: quiz.phrase as string,
      oneWordDescriptor: quiz.oneWordDescriptor as string,
      priority: quiz.priority as string,
    },
  };

  return { data };
}

// Post-launch dashboard edits — a smaller field set than initial onboarding.
// Trade, years of experience, and the personality quiz aren't editable here;
// they're what originally drove the tone/copy, and changing them quietly
// would be confusing without re-running the quiz.
export type OnboardingPatch = Pick<
  OnboardingData,
  "businessName" | "areaCovered" | "phone" | "email" | "social" | "services" | "aboutText" | "dayRate"
>;

export function validateOnboardingPatch(input: unknown): { data: OnboardingPatch } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Invalid submission." };
  }
  const d = input as Record<string, unknown>;

  const required: [string, unknown][] = [
    ["businessName", d.businessName],
    ["areaCovered", d.areaCovered],
    ["phone", d.phone],
    ["email", d.email],
    ["aboutText", d.aboutText],
  ];
  for (const [key, value] of required) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return { error: `Missing required field: ${key}` };
    }
  }

  const services = parseServices(d.services);
  if ("error" in services) return services;

  return {
    data: {
      businessName: (d.businessName as string).trim(),
      areaCovered: (d.areaCovered as string).trim(),
      phone: (d.phone as string).trim(),
      email: (d.email as string).trim(),
      social: parseSocial(d.social),
      services: services.data,
      aboutText: (d.aboutText as string).trim(),
      dayRate: d.dayRate ? Number(d.dayRate) : undefined,
    },
  };
}
