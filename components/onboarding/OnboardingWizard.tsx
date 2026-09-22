"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ_QUESTIONS } from "@/lib/toneProfiles";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/idGen";

const MAX_ONBOARDING_PHOTOS = 8;
const MAX_HERO_STAGES = 4;

interface ServiceDraft {
  name: string;
  description: string;
}

interface WizardState {
  fullName: string;
  age: string;
  trade: string;
  yearsExperience: string;
  businessName: string;
  areaCovered: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  services: ServiceDraft[];
  dayRate: string;
  aboutText: string;
  proudMoment: string;
  uniqueFact: string;
  feeling: string;
  phrase: string;
  oneWordDescriptor: string;
  priority: string;
  domainChoice: "have" | "buy" | "later";
  domainValue: string;
}

const INITIAL_STATE: WizardState = {
  fullName: "",
  age: "",
  trade: "",
  yearsExperience: "",
  businessName: "",
  areaCovered: "",
  phone: "",
  email: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  website: "",
  services: [{ name: "", description: "" }],
  dayRate: "",
  aboutText: "",
  proudMoment: "",
  uniqueFact: "",
  feeling: "",
  phrase: "",
  oneWordDescriptor: "",
  priority: "",
  domainChoice: "later",
  domainValue: "",
};

const STEP_LABELS = ["Basic Info", "Contact", "Services", "About You", "Photos", "Domain", "Your Style"];

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [heroStages, setHeroStages] = useState<PhotoDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState("");

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files)
      .slice(0, Math.max(0, MAX_ONBOARDING_PHOTOS - photos.length))
      .map((file) => ({ id: generateId("photo"), file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function addHeroStages(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files)
      .slice(0, Math.max(0, MAX_HERO_STAGES - heroStages.length))
      .map((file) => ({ id: generateId("stage"), file, previewUrl: URL.createObjectURL(file) }));
    setHeroStages((prev) => [...prev, ...next]);
  }

  function removeHeroStage(id: string) {
    setHeroStages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function moveHeroStage(id: string, direction: -1 | 1) {
    setHeroStages((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      const swapWith = index + direction;
      if (index < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return Boolean(state.fullName && state.trade && state.yearsExperience && state.businessName && state.areaCovered);
      case 1:
        return Boolean(state.phone && state.email);
      case 2:
        return state.services.some((s) => s.name.trim().length > 0);
      case 3:
        return state.aboutText.trim().length > 0;
      case 4:
        return true; // Photos are optional.
      case 5:
        return state.domainChoice === "later" || state.domainValue.trim().length > 0;
      case 6:
        return Boolean(state.feeling && state.phrase && state.oneWordDescriptor && state.priority);
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        fullName: state.fullName,
        age: state.age ? Number(state.age) : undefined,
        trade: state.trade,
        yearsExperience: Number(state.yearsExperience),
        businessName: state.businessName,
        areaCovered: state.areaCovered,
        dayRate: state.dayRate ? Number(state.dayRate) : undefined,
        phone: state.phone,
        email: state.email,
        social: {
          facebook: state.facebook || undefined,
          instagram: state.instagram || undefined,
          tiktok: state.tiktok || undefined,
          website: state.website || undefined,
        },
        services: state.services
          .filter((s) => s.name.trim())
          .map((s) => ({ name: s.name, description: s.description || undefined })),
        aboutText: state.aboutText,
        proudMoment: state.proudMoment || undefined,
        uniqueFact: state.uniqueFact || undefined,
        quiz: {
          feeling: state.feeling,
          phrase: state.phrase,
          oneWordDescriptor: state.oneWordDescriptor,
          priority: state.priority,
        },
        domain:
          state.domainChoice === "later"
            ? undefined
            : { choice: state.domainChoice, value: state.domainValue.trim() },
      };

      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong generating your site.");
      }

      const data = await res.json();

      if (photos.length > 0 || heroStages.length > 0) {
        setUploadingPhotos(true);
        const supabase = createClient();
        // Best-effort: a failed photo upload shouldn't block the site the
        // owner just paid attention to build — skip it and move on.
        for (let i = 0; i < heroStages.length; i++) {
          const { file } = heroStages[i];
          try {
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${data.id}/hero-${generateId("img")}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
            if (uploadErr) throw uploadErr;
            const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(path);
            await supabase.from("site_hero_stages").insert({
              id: generateId("stage"),
              site_id: data.id,
              url: publicUrlData.publicUrl,
              stage_order: i,
            });
          } catch {
            // Continue with the remaining stage photos.
          }
        }
        for (let i = 0; i < photos.length; i++) {
          const { file } = photos[i];
          try {
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${data.id}/${generateId("img")}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
            if (uploadErr) throw uploadErr;
            const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(path);
            await supabase.from("site_images").insert({
              id: generateId("simg"),
              site_id: data.id,
              url: publicUrlData.publicUrl,
              sort_order: i,
            });
          } catch {
            // Continue with the remaining photos.
          }
        }
      }

      router.push(`/preview/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  }

  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ProgressBar step={step} labels={STEP_LABELS} />

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && <BasicInfoStep state={state} update={update} />}
        {step === 1 && <ContactStep state={state} update={update} />}
        {step === 2 && <ServicesStep state={state} update={update} />}
        {step === 3 && <AboutStep state={state} update={update} />}
        {step === 4 && (
          <PhotosStep
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            heroStages={heroStages}
            onAddHeroStage={addHeroStages}
            onRemoveHeroStage={removeHeroStage}
            onMoveHeroStage={moveHeroStage}
          />
        )}
        {step === 5 && <DomainStep state={state} update={update} />}
        {step === 6 && <QuizStep state={state} update={update} />}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 disabled:opacity-0"
          >
            Back
          </button>
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance() || submitting}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {uploadingPhotos ? "Uploading your photos…" : submitting ? "Building your site…" : "Generate My Website"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-500">
        {labels.map((label, i) => (
          <span key={label} className={i <= step ? "text-slate-900" : ""}>
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${((step + 1) / labels.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none";

function BasicInfoStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Tell us about you</h2>
      <p className="text-sm text-slate-500">
        Don&apos;t worry about typos — we&apos;ll proofread everything before it goes on your site. Just get the
        details right.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Your full name">
          <input
            className={inputClass}
            placeholder="e.g. Josh Williams"
            value={state.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </Field>
        <Field label="Age (optional)">
          <input type="number" className={inputClass} value={state.age} onChange={(e) => update("age", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Trade / profession">
          <input
            className={inputClass}
            placeholder="e.g. Plumber"
            value={state.trade}
            onChange={(e) => update("trade", e.target.value)}
          />
        </Field>
        <Field label="Years of experience">
          <input
            type="number"
            className={inputClass}
            placeholder="e.g. 8"
            value={state.yearsExperience}
            onChange={(e) => update("yearsExperience", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Business name">
        <input
          className={inputClass}
          placeholder="e.g. Williams Plumbing & Heating"
          value={state.businessName}
          onChange={(e) => update("businessName", e.target.value)}
        />
      </Field>
      <Field label="Location / area covered">
        <input
          className={inputClass}
          placeholder="e.g. Greater Manchester"
          value={state.areaCovered}
          onChange={(e) => update("areaCovered", e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          The town, city, or region you serve — this appears on your site exactly as written (e.g. &quot;Greater
          Manchester&quot; or &quot;North Leeds and surrounding areas&quot;), so be specific.
        </p>
      </Field>
    </div>
  );
}

function ContactStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">How can customers reach you?</h2>
      <p className="text-sm text-slate-500">These appear on your site exactly as entered, so double-check them.</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone number">
          <input
            className={inputClass}
            placeholder="e.g. 07700 900123"
            value={state.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            placeholder="e.g. josh@williamsplumbing.co.uk"
            value={state.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
      </div>
      <div className="pt-2">
        <p className="text-sm font-medium text-slate-700">Social links (optional)</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Paste the full page URL from your browser&apos;s address bar when you&apos;re on your page — not just
          your username. These become clickable buttons on your site, so a partial link (e.g. just
          &quot;joesplumbing&quot;) will lead nowhere.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Facebook page URL">
          <input
            className={inputClass}
            placeholder="https://facebook.com/yourbusinesspage"
            value={state.facebook}
            onChange={(e) => update("facebook", e.target.value)}
          />
        </Field>
        <Field label="Instagram profile URL">
          <input
            className={inputClass}
            placeholder="https://instagram.com/yourbusiness"
            value={state.instagram}
            onChange={(e) => update("instagram", e.target.value)}
          />
        </Field>
        <Field label="TikTok profile URL">
          <input
            className={inputClass}
            placeholder="https://tiktok.com/@yourbusiness"
            value={state.tiktok}
            onChange={(e) => update("tiktok", e.target.value)}
          />
        </Field>
        <Field label="Existing website URL">
          <input
            className={inputClass}
            placeholder="https://yourbusiness.co.uk"
            value={state.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function ServicesStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  function updateService(index: number, patch: Partial<ServiceDraft>) {
    const next = state.services.map((s, i) => (i === index ? { ...s, ...patch } : s));
    update("services", next);
  }

  function addService() {
    update("services", [...state.services, { name: "", description: "" }]);
  }

  function removeService(index: number) {
    update(
      "services",
      state.services.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">What services do you offer?</h2>
      <p className="text-sm text-slate-500">
        Each one becomes its own listing on your site, so name them the way a customer would search for them — e.g.
        &quot;Boiler installation &amp; repair&quot; works better than just &quot;Heating&quot;.
      </p>
      <div className="space-y-3">
        {state.services.map((service, index) => (
          <div key={index} className="flex gap-2 rounded-lg border border-slate-200 p-3">
            <div className="flex-1 space-y-2">
              <input
                className={inputClass}
                placeholder="e.g. Bathroom fitting"
                value={service.name}
                onChange={(e) => updateService(index, { name: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Short description (optional) — e.g. Full bathroom refits, tiling, and leak repairs"
                value={service.description}
                onChange={(e) => updateService(index, { description: e.target.value })}
              />
            </div>
            {state.services.length > 1 && (
              <button
                type="button"
                onClick={() => removeService(index)}
                className="self-start rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-red-600"
                aria-label="Remove service"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addService}
        className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
      >
        + Add another service
      </button>

      <div className="border-t border-slate-100 pt-4">
        <Field label="Typical day rate (optional)">
          <input
            type="number"
            className={inputClass}
            placeholder="e.g. 250"
            value={state.dayRate}
            onChange={(e) => update("dayRate", e.target.value)}
          />
        </Field>
        <p className="mt-1 text-xs text-slate-500">
          Used to power the instant quote calculator on your site. Leave blank and we&apos;ll use a typical rate for your trade.
        </p>
      </div>
    </div>
  );
}

function AboutStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Describe your business in your own words</h2>
      <p className="text-sm text-slate-500">
        Don&apos;t worry about making it sound &quot;professional&quot; or about typos — write it like you&apos;d
        tell a customer. We&apos;ll proofread spelling and punctuation and lightly polish it, keeping it in your
        voice.
      </p>
      <textarea
        className={`${inputClass} min-h-32`}
        value={state.aboutText}
        onChange={(e) => update("aboutText", e.target.value)}
      />

      <Field label="A job you're proud of, or a customer moment that stuck with you (optional)">
        <textarea
          className={`${inputClass} min-h-20`}
          placeholder="e.g. Rewired a house for a family who'd been living with one working socket for months"
          value={state.proudMoment}
          onChange={(e) => update("proudMoment", e.target.value)}
        />
      </Field>

      <Field label="What's something people wouldn't expect about you or your business? (optional)">
        <textarea
          className={`${inputClass} min-h-20`}
          placeholder="e.g. Started out as a chef before retraining as a plumber"
          value={state.uniqueFact}
          onChange={(e) => update("uniqueFact", e.target.value)}
        />
      </Field>

      <p className="text-xs text-slate-500">
        These two are optional but genuinely help — the more specific and personal your answers, the less generic your site will sound.
      </p>
    </div>
  );
}

function PhotosStep({
  photos,
  onAdd,
  onRemove,
  heroStages,
  onAddHeroStage,
  onRemoveHeroStage,
  onMoveHeroStage,
}: {
  photos: PhotoDraft[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  heroStages: PhotoDraft[];
  onAddHeroStage: (files: FileList | null) => void;
  onRemoveHeroStage: (id: string) => void;
  onMoveHeroStage: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your main display image (optional)</h2>
        <p className="text-sm text-slate-500">
          This becomes the big background image on your homepage — pick the job you&apos;re most proud of. Upload
          just the finished shot, or upload it as a sequence (before → during → after) and we can turn it into an
          animation that plays as visitors scroll down the page, once that&apos;s set up.
        </p>

        {heroStages.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {heroStages.map((stage, index) => (
              <div key={stage.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stage.previewUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index === 0 ? "Start" : index === heroStages.length - 1 ? "Finished" : `Stage ${index + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveHeroStage(stage.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100"
                  aria-label="Remove"
                >
                  ✕
                </button>
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onMoveHeroStage(stage.id, -1)}
                    disabled={index === 0}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white disabled:opacity-30"
                    aria-label="Move earlier"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveHeroStage(stage.id, 1)}
                    disabled={index === heroStages.length - 1}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white disabled:opacity-30"
                    aria-label="Move later"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {heroStages.length < MAX_HERO_STAGES && (
          <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-medium text-slate-600 hover:border-slate-400">
            + Add {heroStages.length > 0 ? "another stage photo" : "your main display image"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAddHeroStage(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <p className="text-xs text-slate-500">
          Up to {MAX_HERO_STAGES} photos, in order. Add at least 2 (e.g. before and after) if you want the
          scroll animation later — one photo alone just becomes a static background image.
        </p>
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-lg font-semibold">More photos for your gallery (optional)</h2>
        <p className="text-sm text-slate-500">
          Upload other photos of jobs you&apos;ve done and we&apos;ll build them straight into your site&apos;s
          gallery — no placeholder &quot;add later&quot; slots. You can always add or change photos afterwards too.
        </p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < MAX_ONBOARDING_PHOTOS && (
          <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-medium text-slate-600 hover:border-slate-400">
            + Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAdd(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <p className="text-xs text-slate-500">Up to {MAX_ONBOARDING_PHOTOS} photos.</p>
      </div>
    </div>
  );
}

function DomainStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  const options: { value: WizardState["domainChoice"]; label: string; helper: string }[] = [
    { value: "have", label: "I already have a domain", helper: "We'll connect it to your new site." },
    { value: "buy", label: "I'd like to buy one", helper: "Search and buy a domain — you'll pay for this separately after your site is generated." },
    { value: "later", label: "I'll sort this out later", helper: "Your site works fine without one for now — you can add a domain any time from your dashboard." },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Do you have a domain for your website?</h2>
      <p className="text-sm text-slate-500">
        A domain is the web address customers type to find you (e.g. &quot;williamsplumbing.co.uk&quot;) — without
        one, your site is only reachable at a generic web address.
      </p>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update("domainChoice", opt.value)}
            className={`block w-full rounded-lg border px-4 py-3 text-left text-sm ${
              state.domainChoice === opt.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            <span className="block font-medium">{opt.label}</span>
            <span className={`block text-xs ${state.domainChoice === opt.value ? "text-slate-300" : "text-slate-500"}`}>
              {opt.helper}
            </span>
          </button>
        ))}
      </div>

      {state.domainChoice === "have" && (
        <Field label="Your domain">
          <input
            className={inputClass}
            placeholder="e.g. williamsplumbing.co.uk"
            value={state.domainValue}
            onChange={(e) => update("domainValue", e.target.value)}
          />
        </Field>
      )}

      {state.domainChoice === "buy" && (
        <Field label="What domain would you like to search for?">
          <input
            className={inputClass}
            placeholder="e.g. williamsplumbing.com"
            value={state.domainValue}
            onChange={(e) => update("domainValue", e.target.value)}
          />
        </Field>
      )}
      {state.domainChoice === "buy" && (
        <p className="text-xs text-slate-500">
          Note: UK domains (.uk / .co.uk) currently can&apos;t be bought through this tool — buy those with your
          usual registrar and connect them here instead. .com, .net, .org and most other endings work fine.
        </p>
      )}
    </div>
  );
}

function QuizStep({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">A few quick questions</h2>
        <p className="text-sm text-slate-500">This helps us match your site&apos;s tone and style to you.</p>
      </div>

      <QuizChoice
        question={QUIZ_QUESTIONS[0].question}
        options={QUIZ_QUESTIONS[0].options!}
        value={state.feeling}
        onChange={(v) => update("feeling", v)}
      />
      <QuizChoice
        question={QUIZ_QUESTIONS[1].question}
        options={QUIZ_QUESTIONS[1].options!}
        value={state.phrase}
        onChange={(v) => update("phrase", v)}
      />
      <Field label={QUIZ_QUESTIONS[2].question}>
        <input
          className={inputClass}
          placeholder="e.g. Reliable"
          value={state.oneWordDescriptor}
          onChange={(e) => update("oneWordDescriptor", e.target.value)}
        />
      </Field>
      <QuizChoice
        question={QUIZ_QUESTIONS[3].question}
        options={QUIZ_QUESTIONS[3].options!}
        value={state.priority}
        onChange={(v) => update("priority", v)}
      />
    </div>
  );
}

function QuizChoice({
  question,
  options,
  value,
  onChange,
}: {
  question: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{question}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              value === opt.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
