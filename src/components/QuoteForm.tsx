"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3 | 4;

type FormState = {
  service: string;
  propertyType: string;
  timing: string;
  suburb: string;
  postcode: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  hp: string; // honeypot
};

const SERVICES = [
  { id: "aircon-install", label: "Air conditioning installation", icon: "❄" },
  { id: "heat-pump-install", label: "Heat pump hot water install", icon: "🔥" },
  { id: "aircon-service", label: "Aircon service or repair", icon: "🔧" },
  { id: "gas-plumbing", label: "Gas / plumbing work", icon: "🔥" },
];

const PROPERTY = ["Single-storey home", "Double-storey home", "Apartment", "Commercial / office"];
const TIMING = ["ASAP (within 2 weeks)", "This month", "1-3 months", "Just researching"];

export function QuoteForm({ presetService }: { presetService?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    service: presetService ?? "",
    propertyType: "",
    timing: "",
    suburb: "",
    postcode: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
    hp: "",
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 1 && !form.service) return setError("Please choose a service.");
    if (step === 2 && (!form.propertyType || !form.timing)) return setError("Please answer both questions.");
    if (step === 3 && (!form.suburb || !form.postcode)) return setError("Please add your suburb and postcode.");
    setStep((s) => Math.min(4, s + 1) as Step);
  }
  function back() { setStep((s) => Math.max(1, s - 1) as Step); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.phone) return setError("Name and phone are required.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/thanks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please call us instead.");
      setSubmitting(false);
    }
  }

  const progress = (step / 4) * 100;

  return (
    <div className="card">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Step {step} of 4</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        {/* Honeypot — bots fill it, humans don't see it */}
        <input
          type="text"
          name="company"
          value={form.hp}
          onChange={(e) => update("hp", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        {step === 1 && (
          <fieldset>
            <legend className="text-xl font-semibold text-slate-900">What do you need installed?</legend>
            <p className="mt-1 text-sm text-slate-500">Takes under 60 seconds. No obligation.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    form.service === s.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    className="sr-only"
                    checked={form.service === s.id}
                    onChange={() => update("service", s.id)}
                  />
                  <span className="text-2xl" aria-hidden>{s.icon}</span>
                  <span className="font-medium text-slate-900">{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xl font-semibold text-slate-900">Property type</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PROPERTY.map((p) => (
                  <label key={p} className={`cursor-pointer rounded-xl border p-3 text-sm font-medium ${form.propertyType === p ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-400"}`}>
                    <input type="radio" name="property" className="sr-only" checked={form.propertyType === p} onChange={() => update("propertyType", p)} />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-xl font-semibold text-slate-900">When do you need this done?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TIMING.map((t) => (
                  <label key={t} className={`cursor-pointer rounded-xl border p-3 text-sm font-medium ${form.timing === t ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-400"}`}>
                    <input type="radio" name="timing" className="sr-only" checked={form.timing === t} onChange={() => update("timing", t)} />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <fieldset>
            <legend className="text-xl font-semibold text-slate-900">Where's the job?</legend>
            <p className="mt-1 text-sm text-slate-500">We service all of Melbourne and regional Victoria.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Suburb" value={form.suburb} onChange={(v) => update("suburb", v)} placeholder="e.g. Richmond" />
              <Field label="Postcode" value={form.postcode} onChange={(v) => update("postcode", v)} placeholder="e.g. 3121" inputMode="numeric" />
            </div>
            <Field label="Notes (optional)" value={form.notes} onChange={(v) => update("notes", v)} placeholder="Brand preference, number of rooms, etc." textarea />
          </fieldset>
        )}

        {step === 4 && (
          <fieldset>
            <legend className="text-xl font-semibold text-slate-900">Where do we send your quote?</legend>
            <p className="mt-1 text-sm text-slate-500">We'll text or call within 1 business hour.</p>
            <div className="mt-5 grid gap-4">
              <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} required autoComplete="name" />
              <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} required type="tel" autoComplete="tel" inputMode="tel" />
              <Field label="Email (optional)" value={form.email} onChange={(v) => update("email", v)} type="email" autoComplete="email" />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              By submitting you agree to be contacted about your quote. We never share your details.
            </p>
          </fieldset>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="btn-ghost">← Back</button>
          ) : <span />}
          {step < 4 ? (
            <button type="button" onClick={next} className="btn-accent">Continue →</button>
          ) : (
            <button type="submit" disabled={submitting} className="btn-accent disabled:opacity-60">
              {submitting ? "Sending..." : "Get my free quote"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  textarea?: boolean;
}) {
  const { label, value, onChange, textarea, ...rest } = props;
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={rest.placeholder}
        />
      ) : (
        <input
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </label>
  );
}
