// app/health-information/hepatitis-awareness/page.tsx
// A standalone educational page, deliberately kept separate from any
// product listing or shopping flow. General public-health information
// only — not medical advice, and not tied to any GLOBALGETWEST product.

export const metadata = {
  title: 'Hepatitis Awareness — GLOBALGETWEST',
  description: 'General information about viral hepatitis and the importance of medical testing.',
};

export default function HepatitisAwarenessPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-14">
      <p className="uppercase tracking-[0.2em] text-[var(--color-forest)] text-xs font-medium mb-3">
        Health Information
      </p>
      <h1 className="font-display text-3xl md:text-4xl mb-6 text-[var(--color-ink)]">
        Understanding Viral Hepatitis
      </h1>

      <p className="text-[var(--color-ink-soft)] mb-6 leading-relaxed">
        Hepatitis refers to inflammation of the liver, most commonly caused by
        one of several viruses — hepatitis A, B, C, D, or E. Hepatitis B and
        C in particular can become chronic, meaning the infection persists in
        the body over the long term, sometimes for years, without the person
        being aware of it.
      </p>

      <h2 className="font-display text-xl mb-3 mt-10 text-[var(--color-ink)]">
        Why it can go unnoticed
      </h2>
      <p className="text-[var(--color-ink-soft)] mb-6 leading-relaxed">
        Chronic viral hepatitis is often described as "silent" — it can
        cause no noticeable symptoms for years while gradually affecting
        liver function. This is exactly why routine testing matters: by the
        time symptoms appear, the liver may already have sustained
        significant damage.
      </p>

      <h2 className="font-display text-xl mb-3 mt-10 text-[var(--color-ink)]">
        Symptoms that can appear with advanced liver involvement
      </h2>
      <p className="text-[var(--color-ink-soft)] mb-4 leading-relaxed">
        The following are commonly documented signs of advanced liver
        inflammation or damage. Their presence does not confirm hepatitis on
        its own — only a medical test can do that — but they are reasons to
        seek medical evaluation promptly:
      </p>
      <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink-soft)] mb-8">
        <li>Persistent fatigue that rest does not resolve</li>
        <li>Jaundice — yellowing of the skin or the whites of the eyes</li>
        <li>Dark-colored urine</li>
        <li>Pale, gray, or clay-colored stool</li>
        <li>Pain or discomfort in the upper right abdomen</li>
        <li>Loss of appetite</li>
        <li>Nausea or vomiting</li>
        <li>Joint or muscle aches</li>
        <li>Unusual bruising or bleeding</li>
        <li>Swelling in the abdomen, legs, or ankles</li>
        <li>Persistent itchy skin</li>
        <li>Unexplained weight loss</li>
      </ul>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] p-6 mb-10">
        <h2 className="font-display text-lg mb-2 text-[var(--color-ink)]">
          If you recognize these symptoms
        </h2>
        <p className="text-[var(--color-ink-soft)] leading-relaxed">
          Please see a doctor or visit a hospital or clinic for a blood test
          and a liver function test. These are the only reliable ways to
          confirm or rule out viral hepatitis and to assess how your liver
          is functioning. Viral hepatitis is a medical condition that
          requires diagnosis and management by a qualified healthcare
          professional — early testing generally leads to better outcomes.
        </p>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
        This page provides general information for awareness purposes only
        and is not medical advice, a diagnosis, or a substitute for
        consultation with a qualified healthcare provider. If you are
        experiencing any of the symptoms above, please seek professional
        medical evaluation.
      </p>
    </div>
  );
}
