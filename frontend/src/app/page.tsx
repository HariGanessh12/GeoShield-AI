import Link from "next/link";
import GeoRiskMap from "@/components/geo-risk-map";

export const dynamic = "force-static";

const statCards = [
  { value: "4.7M", label: "people affected by floods in Europe, 1980-2017" },
  { value: "65-85%", label: "faster response times with GeoAI-style workflows" },
  { value: "$52B", label: "in flood damages better early warning can help reduce" },
];

const steps = [
  {
    title: "Ingest real-time data",
    description: "Weather, satellite imagery, incident feeds, and sensor signals arrive in one clean pipeline.",
    icon: "01",
  },
  {
    title: "AI risk scoring",
    description: "GeoShield AI blends location context and confidence scoring to rank emerging hazards before they spread.",
    icon: "02",
  },
  {
    title: "Alert + map",
    description: "Decision makers see the risk zone on the map and get the alert they need to act immediately.",
    icon: "03",
  },
];

const features = [
  {
    title: "Live Risk Map",
    description: "Visualize threat intensity by district, corridor, or custom region with seeded or live data.",
  },
  {
    title: "AI Alert Engine",
    description: "Prioritize the signal that matters so emergency teams are not buried in noisy updates.",
  },
  {
    title: "Incident Reports",
    description: "Package the current risk picture into something a field team, manager, or judge can understand fast.",
  },
  {
    title: "Multi-source Data Fusion",
    description: "Blend weather, sensors, crowd reports, and imagery into a single operational view.",
  },
];

const useCases = [
  {
    title: "Flood Risk Management",
    description: "Track rainfall corridors, river-adjacent neighborhoods, and evacuation priorities before water levels spike.",
  },
  {
    title: "Urban Crime Hotspots",
    description: "Spot clustering patterns and surface patrol-worthy regions without forcing analysts to stitch tools together.",
  },
  {
    title: "Disaster Response Coordination",
    description: "Keep emergency managers, city planners, and field responders aligned on the same live risk picture.",
  },
];

const mapRegions = [
  { id: "north-basin", name: "North Basin", score: 84, color: "#ef4444", coordinates: [[28.71, 77.05], [28.71, 77.18], [28.82, 77.18], [28.82, 77.05]] as [number, number][] },
  { id: "river-ward", name: "River Ward", score: 67, color: "#f59e0b", coordinates: [[28.66, 77.14], [28.66, 77.26], [28.76, 77.26], [28.76, 77.14]] as [number, number][] },
  { id: "west-grid", name: "West Grid", score: 41, color: "#22c55e", coordinates: [[28.74, 76.96], [28.74, 77.08], [28.84, 77.08], [28.84, 76.96]] as [number, number][] },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,rgba(8,12,22,0.96),rgba(6,8,14,0.96))] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
          <Link href="#how-it-works" className="transition hover:text-white">How it works</Link>
          <Link href="#features" className="transition hover:text-white">Features</Link>
          <Link href="#use-cases" className="transition hover:text-white">Use cases</Link>
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-cyan-300">GeoShield AI</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight text-white sm:text-6xl">
              AI-Powered Threat Detection. Before Disaster Strikes.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
              GeoShield AI monitors real-time geospatial signals - weather, satellite imagery, sensor networks, and crowd data - to predict and alert on emerging threats 6 hours before they escalate.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/demo" className="rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-900 transition hover:scale-[1.02] active:scale-95">
                Try Live Demo &rarr;
              </Link>
              <Link href="#how-it-works" className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/5">
                See How It Works
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {statCards.map((stat) => (
                <article key={stat.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{stat.label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-cyan-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Live risk map</p>
                  <h2 className="mt-1 text-lg font-black text-white">Seeded threat zones</h2>
                </div>
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  Interactive
                </div>
              </div>
              <div id="map" className="relative h-[420px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800">
                <GeoRiskMap regions={mapRegions} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {mapRegions.map((region) => (
                  <div key={region.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{region.name}</span>
                      <span className="text-xs font-black" style={{ color: region.color }}>{region.score}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full" style={{ width: `${region.score}%`, backgroundColor: region.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="Problem statement">
        {statCards.map((stat) => (
          <article key={stat.label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="text-3xl font-black text-white">{stat.value}</div>
            <p className="mt-3 text-sm leading-7 text-white/68">{stat.label}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">How it works</p>
          <h2 className="mt-3 text-3xl font-black text-white">From signals to action in three steps.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-black text-cyan-200">{step.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mt-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Features</p>
          <h2 className="mt-3 text-3xl font-black text-white">Designed to be useful to operators, not just impressive on a slide.</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 shadow-lg">
              <h3 className="text-lg font-bold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="use-cases" className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Use cases</p>
          <h2 className="mt-3 text-3xl font-black text-white">Useful across flood response, public safety, and disaster coordination.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <h3 className="text-lg font-bold text-white">{useCase.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{useCase.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-slate-900 to-indigo-500/10 px-6 py-8 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">CTA</p>
            <h2 className="mt-3 text-3xl font-black text-white">Start protecting your region today</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Turn live geospatial signals into a shared operational view that helps teams move faster when the next threat appears.</p>
          </div>
          <Link href="/register" className="inline-flex rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-900 transition hover:scale-[1.02] active:scale-95">
            Sign Up
          </Link>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-white/45">
        Protecting regions. Powered by AI.
      </footer>
    </main>
  );
}

