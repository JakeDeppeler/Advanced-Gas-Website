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
  currentSystem: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  hp: string;
};

const SERVICES = [
  { id: "air-conditioning-installation", t: "❄ Aircon install", s: "Split / multi-head / ducted" },
  { id: "heat-pump-installation", t: "🔥 Heat pump hot water", s: "Reclaim · iStore · Thermann" },
  { id: "aircon-servicing-repairs", t: "🔧 Service / repair", s: "All major brands" },
  { id: "gas-plumbing", t: "🔥 Gas / plumbing", s: "Heating, hot water, leaks" },
];

const PROPERTY = ["Single-storey home", "Double-storey home", "Apartment", "Commercial / office"];
const TIMING = ["ASAP (within 2 weeks)", "This month", "1-3 months", "Just researching"];

const CURRENT_HOT_WATER = [
  "Electric",
  "Gas storage",
  "Gas instantaneous",
  "Solar (boosted)",
  "Not sure",
];
const CURRENT_AIRCON = [
  "None / first install",
  "Split system",
  "Ducted",
  "Evaporative",
  "Window / wall unit",
];

function currentSystemOptions(service: string) {
  if (service === "heat-pump-installation") {
    return { label: "What hot water system do you currently have?", options: CURRENT_HOT_WATER };
  }
  if (service === "air-conditioning-installation") {
    return { label: "What aircon do you currently have?", options: CURRENT_AIRCON };
  }
  return null;
}

async function fileToBase64(file: File) {
  return new Promise<{ name: string; type: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ name: file.name, type: file.type, base64: result.split(",")[1] ?? "" });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function QuoteForm({ presetService }: { presetService?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>({
    service: presetService ?? "",
    propertyType: "",
    timing: "",
    suburb: "",
    postcode: "",
    currentSystem: "",
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
    if (step === 3) {
      if (!form.suburb || !form.postcode) return setError("Please add your suburb and postcode.");
      if (currentSystemOptions(form.service) && !form.currentSystem) {
        return setError("Please tell us what system you currently have.");
      }
    }
    setStep((s) => Math.min(4, s + 1) as Step);
  }
  function back() { setStep((s) => Math.max(1, s - 1) as Step); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.phone) return setError("Name and phone are required.");
    setSubmitting(true);
    try {
      const photo = photoFile ? await fileToBase64(photoFile) : null;
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photo }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/thanks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please call us instead.");
      setSubmitting(false);
    }
  }

  return (
    <div className="qf-card">
      <div className="qf-ribbon">
        <span className="qf-ribbon-dot" />
        Step {step} of 4 · {Math.round((step / 4) * 100)}% complete
      </div>
      <div className="qf-progress">
        <div className="qf-progress__bar" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <form onSubmit={submit} noValidate>
        <input
          type="text"
          name="company"
          value={form.hp}
          onChange={(e) => update("hp", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />

        {step === 1 && (
          <fieldset>
            <legend className="qf-legend">What do you need installed?</legend>
            <p className="qf-sub">Takes under 60 seconds. No obligation.</p>
            <div className="qf-grid">
              {SERVICES.map((s) => (
                <label key={s.id} className="qf-opt">
                  <input
                    type="radio"
                    name="service"
                    checked={form.service === s.id}
                    onChange={() => update("service", s.id)}
                  />
                  <span className="qf-opt__t">{s.t}</span>
                  <span className="qf-opt__s">{s.s}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <>
            <fieldset>
              <legend className="qf-legend">Property type</legend>
              <div className="qf-grid">
                {PROPERTY.map((p) => (
                  <label key={p} className="qf-opt">
                    <input
                      type="radio"
                      name="property"
                      checked={form.propertyType === p}
                      onChange={() => update("propertyType", p)}
                    />
                    <span className="qf-opt__t" style={{ fontSize: 13 }}>{p}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset style={{ marginTop: 20 }}>
              <legend className="qf-legend">When do you need this done?</legend>
              <div className="qf-grid">
                {TIMING.map((t) => (
                  <label key={t} className="qf-opt">
                    <input
                      type="radio"
                      name="timing"
                      checked={form.timing === t}
                      onChange={() => update("timing", t)}
                    />
                    <span className="qf-opt__t" style={{ fontSize: 13 }}>{t}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            {(() => {
              const cs = currentSystemOptions(form.service);
              if (!cs) return null;
              return (
                <fieldset style={{ marginBottom: 20 }}>
                  <legend className="qf-legend">{cs.label}</legend>
                  <div className="qf-grid">
                    {cs.options.map((opt) => (
                      <label key={opt} className="qf-opt">
                        <input
                          type="radio"
                          name="currentSystem"
                          checked={form.currentSystem === opt}
                          onChange={() => update("currentSystem", opt)}
                        />
                        <span className="qf-opt__t" style={{ fontSize: 13 }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })()}
          <fieldset>
            <legend className="qf-legend">Where&apos;s the job?</legend>
            <p className="qf-sub">We service Pakenham and within 75 km.</p>
            <div className="qf-row">
              <label className="qf-field">
                <span>Suburb</span>
                <input
                  type="text"
                  placeholder="e.g. Pakenham"
                  value={form.suburb}
                  onChange={(e) => update("suburb", e.target.value)}
                />
              </label>
              <label className="qf-field">
                <span>Postcode</span>
                <input
                  type="text"
                  placeholder="e.g. 3810"
                  inputMode="numeric"
                  value={form.postcode}
                  onChange={(e) => update("postcode", e.target.value)}
                />
              </label>
            </div>
            <label className="qf-field" style={{ marginTop: 10 }}>
              <span>Notes (optional)</span>
              <textarea
                rows={3}
                placeholder="Brand preference, number of rooms, etc."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </fieldset>
          </>
        )}

        {step === 4 && (
          <fieldset>
            <legend className="qf-legend">Where do we send your quote?</legend>
            <p className="qf-sub">We&apos;ll text or call within 2 business hours.</p>
            <label className="qf-field">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </label>
            <label className="qf-field">
              <span>Phone</span>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                required
              />
            </label>
            <label className="qf-field">
              <span>Email (optional)</span>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </label>
            <label className="qf-field">
              <span>Photo of the existing unit (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              {photoFile && (
                <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                  {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </label>
            <p className="qf-finep">
              By submitting you agree to be contacted about your quote. We never share your details.
            </p>
          </fieldset>
        )}

        {error && (
          <div className="qf-error" role="alert">{error}</div>
        )}

        <div className="qf-foot">
          {step > 1 ? (
            <button type="button" onClick={back} className="ds-btn ds-btn--ghost">← Back</button>
          ) : <span />}
          {step < 4 ? (
            <button type="button" onClick={next} className="ds-btn ds-btn--orange ds-btn--lg">Continue →</button>
          ) : (
            <button type="submit" disabled={submitting} className="ds-btn ds-btn--orange ds-btn--lg">
              {submitting ? "Sending…" : "Get my free quote"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
