"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteAnimation, SiteImage, SiteRecord, ToneProfileId } from "@/lib/types";
import { TONE_PROFILES } from "@/lib/toneProfiles";
import { FREE_ANIMATION_CAP, checkAnimationEligibility } from "@/lib/animationLimits";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/idGen";

interface ServiceDraft {
  name: string;
  description: string;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none";

export function ManageClient({ siteId }: { siteId: string }) {
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [loadError, setLoadError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [areaCovered, setAreaCovered] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [aboutText, setAboutText] = useState("");
  const [proudMoment, setProudMoment] = useState("");
  const [uniqueFact, setUniqueFact] = useState("");
  const [dayRate, setDayRate] = useState("");
  const [toneProfile, setToneProfile] = useState<ToneProfileId>("friendly");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const [images, setImages] = useState<SiteImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [animations, setAnimations] = useState<SiteAnimation[]>([]);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animationErrors, setAnimationErrors] = useState<Record<string, string>>({});
  const [buyingAnimationCredit, setBuyingAnimationCredit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/${siteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Site not found.");
        return (await res.json()) as SiteRecord;
      })
      .then((data) => {
        if (cancelled) return;
        setSite(data);
        setBusinessName(data.onboarding.businessName);
        setAreaCovered(data.onboarding.areaCovered);
        setPhone(data.onboarding.phone);
        setEmail(data.onboarding.email);
        setFacebook(data.onboarding.social.facebook ?? "");
        setInstagram(data.onboarding.social.instagram ?? "");
        setTiktok(data.onboarding.social.tiktok ?? "");
        setWebsite(data.onboarding.social.website ?? "");
        setServices(
          data.onboarding.services.map((s) => ({ name: s.name, description: s.description ?? "" }))
        );
        setAboutText(data.onboarding.aboutText);
        setProudMoment(data.onboarding.proudMoment ?? "");
        setUniqueFact(data.onboarding.uniqueFact ?? "");
        setDayRate(data.onboarding.dayRate ? String(data.onboarding.dayRate) : "");
        setToneProfile(data.generated.toneProfile);
        setImages(data.images ?? []);
        setAnimations(data.animations ?? []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load site.");
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  function updateService(index: number, patch: Partial<ServiceDraft>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addService() {
    setServices((prev) => [...prev, { name: "", description: "" }]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${siteId}/${generateId("img")}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(path);

      const newImage: SiteImage = {
        id: generateId("simg"),
        siteId,
        url: publicUrlData.publicUrl,
        sortOrder: images.length,
        createdAt: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from("site_images").insert({
        id: newImage.id,
        site_id: siteId,
        url: newImage.url,
        sort_order: newImage.sortOrder,
      });
      if (insertErr) throw new Error(insertErr.message);

      setImages((prev) => [...prev, newImage]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(image: SiteImage) {
    const supabase = createClient();
    const path = image.url.split("/gallery/")[1];
    if (path) {
      await supabase.storage.from("gallery").remove([path]);
    }
    await supabase.from("site_images").delete().eq("id", image.id);
    setImages((prev) => prev.filter((i) => i.id !== image.id));
  }

  async function handleAnimate(imageId: string) {
    setAnimatingId(imageId);
    setAnimationErrors((prev) => ({ ...prev, [imageId]: "" }));
    try {
      const res = await fetch(`/api/sites/${siteId}/animations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to animate photo.");
      }
      setAnimations((prev) => [
        ...prev,
        {
          id: generateId("anim"),
          siteId,
          imageId,
          status: "completed",
          videoUrl: data.videoUrl,
          usedCredit: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setAnimationErrors((prev) => ({ ...prev, [imageId]: err instanceof Error ? err.message : "Failed to animate photo." }));
    } finally {
      setAnimatingId(null);
    }
  }

  async function handleBuyAnimationCredit() {
    setBuyingAnimationCredit(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/animations/checkout`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setBuyingAnimationCredit(false);
      setAnimationErrors((prev) => ({ ...prev, _checkout: err instanceof Error ? err.message : "Failed to start checkout." }));
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          areaCovered,
          phone,
          email,
          social: { facebook, instagram, tiktok, website },
          services: services.filter((s) => s.name.trim()),
          aboutText,
          proudMoment: proudMoment || undefined,
          uniqueFact: uniqueFact || undefined,
          dayRate: dayRate ? Number(dayRate) : undefined,
          toneProfile,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save changes.");
      }
      const updated = (await res.json()) as SiteRecord;
      setSite(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <div className="p-12 text-center text-red-600">{loadError}</div>;
  }
  if (!site) {
    return <div className="p-12 text-center text-slate-500">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage {site.onboarding.businessName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {site.status === "published" ? "Live" : "Draft"} · changes apply immediately
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/sites" className="text-slate-500 underline">
              My Sites
            </Link>
            {site.status === "published" && (
              <Link href={`/site/${site.id}`} className="text-slate-500 underline">
                View live site
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Business & contact</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <input className={inputClass} placeholder="Area covered" value={areaCovered} onChange={(e) => setAreaCovered(e.target.value)} />
              <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input type="email" className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Social links (optional)</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} placeholder="Facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              <input className={inputClass} placeholder="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
              <input className={inputClass} placeholder="TikTok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
              <input className={inputClass} placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Services</h2>
            {services.map((service, index) => (
              <div key={index} className="flex gap-2 rounded-lg border border-slate-200 p-3">
                <div className="flex-1 space-y-2">
                  <input className={inputClass} placeholder="Service name" value={service.name} onChange={(e) => updateService(index, { name: e.target.value })} />
                  <input className={inputClass} placeholder="Description (optional)" value={service.description} onChange={(e) => updateService(index, { description: e.target.value })} />
                </div>
                {services.length > 1 && (
                  <button type="button" onClick={() => removeService(index)} className="self-start text-slate-400 hover:text-red-600" aria-label="Remove service">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addService} className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400">
              + Add another service
            </button>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Gallery photos</h2>
            <p className="text-xs text-slate-500">Uploaded photos replace the &quot;add later&quot; slots on your site.</p>
            {images.length > 0 && (() => {
              const eligibility = checkAnimationEligibility(animations, site.animationCredits);
              return (
                <>
                  <p className="text-xs text-slate-500">
                    {eligibility.allowed
                      ? eligibility.usesCredit
                        ? "Free animations used up — animating another photo will use a purchased credit."
                        : `${eligibility.freeRemaining} of ${FREE_ANIMATION_CAP} free animations remaining.`
                      : "You've used all your free animations and have no credits left."}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((image) => {
                      const animation = animations.find((a) => a.imageId === image.id && a.status !== "failed");
                      return (
                        <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image)}
                            className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                          >
                            ✕
                          </button>
                          {animation?.status === "completed" ? (
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              Animated
                            </span>
                          ) : animation?.status === "processing" ? (
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              Animating…
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAnimate(image.id)}
                              disabled={animatingId === image.id || !eligibility.allowed}
                              className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-100"
                            >
                              {animatingId === image.id ? "Animating…" : "Animate this photo"}
                            </button>
                          )}
                          {animationErrors[image.id] && (
                            <p className="absolute inset-x-0 bottom-0 bg-red-600/90 px-1 py-0.5 text-[9px] text-white">
                              {animationErrors[image.id]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!eligibility.allowed && (
                    <button
                      type="button"
                      onClick={handleBuyAnimationCredit}
                      disabled={buyingAnimationCredit}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
                    >
                      {buyingAnimationCredit ? "Redirecting to checkout…" : "Buy 1 More Animation"}
                    </button>
                  )}
                  {animationErrors._checkout && <p className="text-xs text-red-600">{animationErrors._checkout}</p>}
                </>
              );
            })()}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">About</h2>
            <textarea className={`${inputClass} min-h-24`} value={aboutText} onChange={(e) => setAboutText(e.target.value)} />
            <label className="block text-xs font-medium text-slate-600">
              A job you&apos;re proud of, or a customer moment that stuck with you (optional)
            </label>
            <textarea className={`${inputClass} min-h-16`} value={proudMoment} onChange={(e) => setProudMoment(e.target.value)} />
            <label className="block text-xs font-medium text-slate-600">
              Something people wouldn&apos;t expect about you or your business (optional)
            </label>
            <textarea className={`${inputClass} min-h-16`} value={uniqueFact} onChange={(e) => setUniqueFact(e.target.value)} />
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Typical day rate (optional)</h2>
            <input type="number" className={inputClass} placeholder="e.g. 250" value={dayRate} onChange={(e) => setDayRate(e.target.value)} />
            <p className="text-xs text-slate-500">Used by the instant quote calculator on your site.</p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Style</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TONE_PROFILES).map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setToneProfile(profile.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    toneProfile === profile.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <span className="block font-medium">{profile.label}</span>
                  <span className={`block text-xs ${toneProfile === profile.id ? "text-slate-300" : "text-slate-500"}`}>
                    {profile.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {saved && <p className="text-sm text-emerald-600">Saved — your site has been updated.</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
