import AppShell from "@/components/AppShell";

const LAST_UPDATED = "March 10, 2026";

const POLICY_SECTIONS = [
  {
    title: "1. Data Collection",
    body: "We only collect information you voluntarily provide, such as your email address when joining our members area.",
  },
  {
    title: "2. Use of Data",
    body: "Your information is used only to provide access to our prompting resources and to send occasional updates. We do not sell your data to third parties.",
  },
  {
    title: "3. GDPR Compliance",
    body: "As a UK-based entity, we respect your right to access, delete, or correct your data at any time.",
  },
  {
    title: "4. Cookies",
    body: "We use basic cookies to ensure the website functions correctly and to improve your user experience.",
  },
];

export default function Privacy() {
  return (
    <AppShell
      requireAuth={false}
      eyebrow="Legal"
      title="Privacy Policy for Dunamiss.xyz"
      description={`Last Updated: ${LAST_UPDATED}`}
      accent="slate"
    >
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(19,23,31,0.96),rgba(10,10,10,0.94))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:p-8">
        <div className="max-w-4xl space-y-6">
          <p className="text-sm leading-7 text-zinc-300 lg:text-base">
            At Dunamis, we value your privacy. This policy outlines how we handle your information.
          </p>

          {POLICY_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300 lg:text-base">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
