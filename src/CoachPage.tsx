import { useState, useEffect } from "react";

const API_BASE = "https://hybrid-coach-local-1.onrender.com";

// ============ FONCTIONS UTILITAIRES (inchangées) ============
function extractWeight(input: string): number | null {
  const normalized = input.toLowerCase().replace(/\s+/g, " ");
  const patterns = [
    /(?:poids|pèse|pese|je pèse|auj(?:ourd'hui)? je pèse|bw)\s*:?\s*(\d{2,3}(?:[.,]\d+)?)\s*kg?/i,
    /(\d{2,3}(?:[.,]\d+)?)\s*kg\b/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function sanitizeNextSession(value: unknown): { format: string; blocks: string[] } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const rawFormat = (value as { format?: unknown }).format;
  const rawBlocks = (value as { blocks?: unknown }).blocks;
  const format = typeof rawFormat === "string" && rawFormat.trim() &&
    !["structured", "coach_extract", "demain", "blocks"].includes(rawFormat.trim().toLowerCase())
    ? rawFormat.trim() : "Séance personnalisée de demain";
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.map((b) => (typeof b === "string" ? b.trim() : "")).filter(b => b && !["structured", "coach_extract", "demain", "blocks"].includes(b.toLowerCase()))
    : [];
  return { format, blocks: blocks.length > 0 ? blocks : ["Ajoute plus de détails au coach pour une séance ultra ciblée"] };
}

function sanitizeDailyAnalysis(value: unknown) {
  if (!value || typeof value !== "object") {
    return { fatigueLevel: "unknown", sleepQuality: 0, nutritionAlignment: 0, primaryMusclesWorked: [], suggestedIntensity: "light" };
  }
  const src = value as any;
  return {
    fatigueLevel: typeof src.fatigueLevel === "string" ? src.fatigueLevel : "unknown",
    sleepQuality: typeof src.sleepQuality === "number" ? src.sleepQuality : 0,
    nutritionAlignment: typeof src.nutritionAlignment === "number" ? src.nutritionAlignment : 0,
    primaryMusclesWorked: Array.isArray(src.primaryMusclesWorked) ? src.primaryMusclesWorked.filter((i: any) => typeof i === "string") : [],
    suggestedIntensity: typeof src.suggestedIntensity === "string" ? src.suggestedIntensity : "light",
  };
}

function inferRecoveryScoreFromText(input: string): number {
  const lower = input.toLowerCase();
  if (lower.includes("8h") || lower.includes("7h")) return 85;
  if (lower.includes("6h")) return 70;
  if (lower.includes("fatigue") || lower.includes("épuisé") || lower.includes("epuise")) return 45;
  return 60;
}

function inferMuscleFocusFromText(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("jamb")) return "Jambes";
  if (lower.includes("pec")) return "Pecs";
  if (lower.includes("dos")) return "Dos";
  if (lower.includes("épaule") || lower.includes("epaule")) return "Épaules";
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("cardio")) return "Cardio";
  return "À définir";
}

function inferNutritionScoreFromText(input: string): number {
  const lower = input.toLowerCase();
  let score = 50;
  if (lower.includes("poulet") || lower.includes("thon") || lower.includes("oeuf") || lower.includes("œuf")) score += 20;
  if (lower.includes("chips") || lower.includes("merguez") || lower.includes("soda")) score -= 15;
  return Math.max(0, Math.min(100, score));
}
// ============ FIN FONCTIONS ============

type LogEntry = {
  date: string;
  raw: string;
  weight?: number | null;
  recoveryScore?: number;
  nutritionScore?: number;
  muscleFocus?: string;
  coachAdvice?: string;
  nextSession?: { format: string; blocks: string[] };
  dailyAnalysis?: any;
};

export default function CoachPage() {
  const [text, setText] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger l'historique depuis le backend au démarrage
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`${API_BASE}/api/logs`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error("Erreur chargement historique:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const saveLog = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/coach-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const aiData = await response.json();
      const cleanNextSession = sanitizeNextSession(aiData?.nextSession);
      const cleanDailyAnalysis = sanitizeDailyAnalysis(aiData?.dailyAnalysis);
      const detectedWeight = extractWeight(text);
      const fallbackRecovery = inferRecoveryScoreFromText(text);
      const fallbackFocus = inferMuscleFocusFromText(text);
      const fallbackNutrition = inferNutritionScoreFromText(text);

      const newLog: LogEntry = {
        date: new Date().toISOString(),
        raw: text,
        weight: detectedWeight,
        ...aiData,
        recoveryScore: aiData?.recoveryScore ?? fallbackRecovery,
        nutritionScore: aiData?.nutritionScore ?? fallbackNutrition,
        muscleFocus: aiData?.muscleFocus ?? fallbackFocus,
        nextSession: cleanNextSession,
        dailyAnalysis: cleanDailyAnalysis,
      };

      // Sauvegarde sur le backend
      await fetch(`${API_BASE}/api/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: newLog }),
      });

      // Recharger l'historique complet
      const refreshRes = await fetch(`${API_BASE}/api/logs`);
      const refreshedLogs = await refreshRes.json();
      setLogs(refreshedLogs);
      setText("");
      alert("✅ Journée digérée + séance de demain préparée");
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur de connexion au backend");
    }
  };

  const deleteLog = async (date: string) => {
    if (!window.confirm("Supprimer cette entrée ?")) return;
    try {
      await fetch(`${API_BASE}/api/logs/${encodeURIComponent(date)}`, { method: "DELETE" });
      const refreshRes = await fetch(`${API_BASE}/api/logs`);
      const refreshedLogs = await refreshRes.json();
      setLogs(refreshedLogs);
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-3xl mx-auto text-center">Chargement de l'historique...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">🧠 Coach quotidien</h1>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aujourd'hui je pèse 98kg, grosse séance jambes, 20 min vélo"
          className="w-full h-48 rounded-2xl bg-slate-900 p-4"
        />

        <button onClick={saveLog} className="px-6 py-3 rounded-2xl bg-emerald-500 font-semibold">
          Digérer ma journée
        </button>

        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-4 text-xl font-semibold">📜 Historique</h2>
          {logs.length === 0 ? (
            <p className="text-slate-400">Aucun log pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {[...logs].reverse().map((log, idx) => (
                <div key={idx} className="rounded-xl bg-slate-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">{new Date(log.date).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-slate-200">{log.raw}</p>
                      {typeof log.weight === "number" && (
                        <p className="mt-1 text-xs text-emerald-400">⚖️ {log.weight} kg</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteLog(log.date)}
                      className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}