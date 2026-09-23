"use client";

import { FormEvent, useState } from "react";

export function ContactForm({ siteId }: { siteId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <div
        className="rounded-[var(--radius)] p-6 text-center shadow-lg"
        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
      >
        <p className="font-semibold">Thanks — your message has been sent!</p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          We&apos;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius)] p-6 shadow-lg"
      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
    >
      <div>
        <label className="text-sm font-medium" htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          name="name"
          required
          className="mt-1 w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-muted)" }}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-muted)" }}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          className="mt-1 w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-muted)" }}
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
