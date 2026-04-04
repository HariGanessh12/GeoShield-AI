export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl light-mode:border-slate-200 light-mode:bg-white">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300 light-mode:text-cyan-700">Privacy policy</p>
        <h1 className="mt-3 text-4xl font-black text-white light-mode:text-slate-950">GeoShield AI privacy policy</h1>
        <div className="mt-6 space-y-6 text-sm leading-8 text-white/70 light-mode:text-slate-600">
          <p>GeoShield AI collects location data, device context, and incident metadata to calculate geospatial risk zones and generate alerts.</p>
          <p>We store this data only for the period needed to provide the demo or operational service. Location traces are retained for analysis, troubleshooting, and audit purposes within the active account lifecycle.</p>
          <p>We do not share customer location data with third parties on the free tier. Data may be processed by our hosting and infrastructure providers strictly to operate the service.</p>
          <p>Users can request deletion by contacting privacy@geoshield.ai with the account email and the data they want removed. We will confirm deletion once the request is processed.</p>
          <p>For questions about this policy or data handling, contact privacy@geoshield.ai.</p>
        </div>
      </section>
    </main>
  );
}

