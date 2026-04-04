"use client";

import { useEffect, useState } from "react";
import GeoRiskMap from "@/components/geo-risk-map";

type DemoRegion = {
  id: string;
  name: string;
  score: number;
  color: string;
  summary: string;
  alerts: string[];
  coordinates: [number, number][];
};

const demoRegions: DemoRegion[] = [
  {
    id: "north-basin",
    name: "North Basin",
    score: 84,
    color: "#ef4444",
    summary: "Flash flood likelihood is elevated along the drainage corridor and low-lying streets.",
    alerts: ["Drainage overflow risk", "Emergency route obstruction", "Shelter prep recommended"],
    coordinates: [[28.71, 77.05], [28.71, 77.18], [28.82, 77.18], [28.82, 77.05]] as [number, number][],
  },
  {
    id: "river-ward",
    name: "River Ward",
    score: 67,
    color: "#f59e0b",
    summary: "Moderate exposure from sustained rainfall and service disruption near the riverfront.",
    alerts: ["Transit delay cluster", "Road pooling detected", "Patrol re-route suggested"],
    coordinates: [[28.66, 77.14], [28.66, 77.26], [28.76, 77.26], [28.76, 77.14]] as [number, number][],
  },
  {
    id: "west-grid",
    name: "West Grid",
    score: 41,
    color: "#22c55e",
    summary: "Current conditions remain stable, but data fusion keeps monitoring local spikes.",
    alerts: ["Routine watch mode", "Sensor drift check", "Minor congestion only"],
    coordinates: [[28.74, 76.96], [28.74, 77.08], [28.84, 77.08], [28.84, 76.96]] as [number, number][],
  },
];

const activeAlerts = [
  { title: "North Basin flood pocket", detail: "83 score. Drainage channels near capacity.", severity: "High" },
  { title: "River Ward access disruption", detail: "Traffic and rainfall overlap is slowing response times.", severity: "Medium" },
  { title: "West Grid sensor anomaly", detail: "Low confidence anomaly, but monitoring remains active.", severity: "Low" },
];

function buildPdfBlob(lines: string[]) {
  const escapedLines = lines.map((line) => line.replace(/[()]/g, "\\$&"));
  const contentStream = [
    "BT",
    "/F1 18 Tf",
    "48 780 Td",
    `(${escapedLines[0] || "GeoShield AI Demo Report"}) Tj`,
    ...escapedLines.slice(1).flatMap((line) => ["T*", `(${line}) Tj`]),
    "ET",
  ].join("\n");
  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
  );
  objects.push(
    `4 0 obj << /Length ${new TextEncoder().encode(contentStream).length} >> stream\n${contentStream}\nendstream endobj`,
  );
  objects.push("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object) => {
    offsets.push(body.length);
    body += `${object}\n`;
  });

  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

export default function DemoWorkspace() {
  const [selectedRegion, setSelectedRegion] = useState(demoRegions[0]);
  const [analysis, setAnalysis] = useState("Running AI analysis for North Basin...");
  const [analysisStatus, setAnalysisStatus] = useState("Analyzing");
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    setAnalysisStatus("Analyzing");
    const timer = window.setTimeout(() => {
      setAnalysis(
        `${selectedRegion.name} is showing a ${selectedRegion.score >= 80 ? "critical" : selectedRegion.score >= 60 ? "moderate" : "low"} risk pattern. Recommended action: ${selectedRegion.score >= 80 ? "dispatch response assets now" : selectedRegion.score >= 60 ? "increase watch and reroute crews" : "continue monitoring and hold posture"}.`,
      );
      setAnalysisStatus("Ready");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [selectedRegion]);

  const handleReportDownload = async () => {
    setGeneratingReport(true);
    try {
      const blob = buildPdfBlob([
        "GeoShield AI Demo Report",
        `Region: ${selectedRegion.name}`,
        `Risk score: ${selectedRegion.score}`,
        `Summary: ${selectedRegion.summary}`,
        `Top alerts: ${selectedRegion.alerts.join(", ")}`,
      ]);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `geoshield-demo-${selectedRegion.id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-[#0b1020] p-5 lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Public demo</p>
          <h1 className="mt-3 text-3xl font-black text-white">Live risk map</h1>
          <p className="mt-3 text-sm leading-7 text-white/65">Explore seeded geospatial risk zones, AI summaries, and a downloadable report without logging in.</p>
        </div>

        <div className="mt-5 space-y-3">
          {demoRegions.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region)}
              className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                selectedRegion.id === region.id
                  ? "border-cyan-400/35 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{region.name}</span>
                <span className="text-sm font-black" style={{ color: region.color }}>
                  {region.score}/100
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/60">{region.summary}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/55">Active alerts</h2>
            <span className="text-xs text-white/40">3 open</span>
          </div>
          <div className="mt-4 space-y-3">
            {activeAlerts.map((alert) => (
              <article key={alert.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{alert.severity}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/60">{alert.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/55">Risk score chart</h2>
          <div className="mt-4 space-y-3">
            {demoRegions.map((region) => (
              <div key={region.id}>
                <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                  <span>{region.name}</span>
                  <span>{region.score}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${region.score}%`, backgroundColor: region.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.8rem] border border-cyan-500/20 bg-cyan-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">AI analysis</p>
          <h2 className="mt-2 text-lg font-black text-white">{analysisStatus}</h2>
          <p className="mt-3 text-sm leading-7 text-white/72">{analysis}</p>
        </div>

        <button
          onClick={handleReportDownload}
          disabled={generatingReport}
          className="mt-5 w-full rounded-full bg-white px-5 py-3.5 text-sm font-black text-slate-900 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generatingReport ? "Generating report..." : "Generate Report"}
        </button>
      </aside>

      <section className="relative min-h-[60vh] bg-slate-950 lg:min-h-[calc(100vh-81px)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(3,7,18,0.98))]" />
        <div className="relative h-full min-h-[60vh] lg:min-h-[calc(100vh-81px)]">
          <GeoRiskMap
            regions={demoRegions}
            selectedRegionId={selectedRegion.id}
            onRegionSelect={(region) => {
              const matched = demoRegions.find((item) => item.id === region.id);
              if (matched) {
                setSelectedRegion(matched);
              }
            }}
          />
          <div className="pointer-events-none absolute left-4 top-4 max-w-md rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 text-white shadow-2xl backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Demo mode</p>
            <h2 className="mt-2 text-2xl font-black">{selectedRegion.name}</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">{selectedRegion.summary}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
