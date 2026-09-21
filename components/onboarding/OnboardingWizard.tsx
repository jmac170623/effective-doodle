"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ_QUESTIONS } from "@/lib/toneProfiles";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/idGen";

const MAX_ONBOARDING_PHOTOS = 8;

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
};

const STEP_LABELS = ["Basic Info", "Contact", "Services", "About You", "Photos", "Your Style"];

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

      if (photos.length > 0) {
        setUploadingPhotos(true);
        const supabase = createClient();
        // Best-effort: a failed photo upload shouldn't block the site the
        // owner just paid attention to build — skip it and move on.
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
        {step === 4 && <PhotosStep photos={photos} onAdd={addPhotos} onRemove={removePhoto} />}
        {step === 5 && <QuizStep state={state} update={update} />}

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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Your full name">
          <input className={inputClass} value={state.fullName} onChange={(e) => update("fullName", e.target.value)} />
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
            value={state.yearsExperience}
            onChange={(e) => update("yearsExperience", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Business name">
        <input className={inputClass} value={state.businessName} onChange={(e) => update("businessName", e.target.value)} />
      </Field>
      <Field label="Location / area covered">
        <input
          className={inputClass}
          placeholder="e.g. Greater Manchester"
          value={state.areaCovered}
          onChange={(e) => update("areaCovered", e.target.value)}
        />
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone number">
          <input className={inputClass} value={state.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={state.email} onChange={(e) => update("email", e.target.value)} />
        </Field>
      </div>
      <p className="pt-2 text-sm font-medium text-slate-700">Social links (optional)</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Facebook">
          <input className={inputClass} value={state.facebook} onChange={(e) => update("facebook", e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input className={inputClass} value={state.instagram} onChange={(e) => update("instagram", e.target.value)} />
        </Field>
        <Field label="TikTok">
          <input className={inputClass} value={state.tiktok} onChange={(e) => update("tiktok", e.target.value)} />
        </Field>
        <Field label="Website">
          <input className={inputClass} value={state.website} onChange={(e) => update("website", e.target.value)} />
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
                placeholder="Short description (optional)"
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
        Don&apos;t worry about making it sound &quot;professional&quot; — write it like you&apos;d tell a customer. We&apos;ll lightly polish it.
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
}: {
  photos: PhotoDraft[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Show off your work (optional)</h2>
      <p className="text-sm text-slate-500">
        Upload photos of jobs you&apos;ve done and we&apos;ll build them straight into your site&apos;s gallery — no
        placeholder &quot;add later&quot; slots. You can always add or change photos afterwards too.
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
