import { useMemo, useState, useEffect } from "react";

type TimeScope = "day" | "week" | "fortnight" | "all";
type ViewMode = "analysis" | "prep";

type NextSession = {
  format?: unknown;
  blocks?: unknown;
};

type CoachLog = {
  raw?: unknown;
  weight?: unknown;
  coachAdvice?: unknown;
  nutritionScore?: unknown;
  recoveryScore?: unknown;
  muscleFocus?: unknown;
  parsedCalories?: unknown;
  nextSession?: NextSession;
};

type ChartPoint = {
  day: string;
  weight: number;
};

type MuscleStats = {
  pecs: number;
  dos: number;
  jambes: number;
  epaules: number;
};

type BlockExplanation = {
  title: string;
  explanation: string;
  tip: string;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLastKnownWeight(logs: CoachLog[], fallback = 88): number {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const candidate = safeNumber(logs[index]?.weight, NaN);
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  return fallback;
}

function readHybridCoachLogs(): CoachLog[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem("hybridCoachLogs");
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.warn("Invalid hybridCoachLogs payload in localStorage", error);
    return [];
  }
}

function countMatches(texts: string[], fragment: string): number {
  return texts.filter((text) => text.includes(fragment)).length;
}

function InfoHint({ text, title }: { text: string; title?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative ml-2 inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-emerald-600/30 text-xs text-emerald-400 transition-colors hover:bg-emerald-600/50">
        i
      </span>

      {open && (
        <div className="absolute left-7 top-1/2 z-50 w-80 -translate-y-1/2 rounded-xl border border-emerald-500/30 bg-slate-900 px-4 py-3 text-sm shadow-2xl backdrop-blur-sm">
          {title && <p className="mb-2 font-semibold text-emerald-400">{title}</p>}
          <p className="text-slate-300">{text}</p>
        </div>
      )}
    </span>
  );
}

// 🆕 Analyse approfondie du contexte utilisateur
function analyzeUserContext(historyText: string[]): {
  isBeginner: boolean;
  hasPostureIssues: boolean;
  hasHypotension: boolean;
  sedentaryDuration: string;
  priorityMuscles: string[];
  contraindications: string[];
} {
  const allText = historyText.join(" ").toLowerCase();
  
  return {
    isBeginner: allText.includes("sédentaire") || allText.includes("deux ans") || allText.includes("ne fais plus") || (historyText.length < 3),
    hasPostureIssues: allText.includes("posture") || allText.includes("enroulement") || allText.includes("bassin") || allText.includes("lordose"),
    hasHypotension: allText.includes("hypotension") || allText.includes("abilify") || allText.includes("traitement"),
    sedentaryDuration: allText.includes("deux ans") ? "longue" : allText.includes("un an") ? "moyenne" : "courte",
    priorityMuscles: [
      ...(allText.includes("dos") || allText.includes("enroulement") ? ["dos"] : []),
      ...(allText.includes("jambes") || allText.includes("sédentaire") ? ["jambes"] : []),
      ...(allText.includes("gainage") || allText.includes("bassin") ? ["gainage"] : []),
    ],
    contraindications: [
      ...(allText.includes("hypotension") ? ["changements brusques position"] : []),
      ...(allText.includes("traitement") ? ["surveillance tension"] : []),
    ],
  };
}

// 🆕 Génération dynamique des blocs selon TOUT le contexte
function generateDynamicBlocks(context: {
  focusMuscle: string;
  recoveryScore: number;
  weeklyMuscleStats: MuscleStats;
  historyText: string[];
  totalSeries: number;
  latestRaw: string;
  overloadWarning: string;
  posturePriority: string;
  userContext: ReturnType<typeof analyzeUserContext>;
}): string[] {
  const blocks: string[] = [];
  const isBeginner = context.userContext.isBeginner;
  const hasPostureIssues = context.userContext.hasPostureIssues;
  const hasHypotension = context.userContext.hasHypotension;
  
  // 🔴 PRIORITÉ ABSOLUE : Sécurité hypotension
  if (hasHypotension) {
    blocks.push("⚠️ CONSIGNE SÉCURITÉ : Monte-toi très progressivement (assis → debout → attendre 30 sec)");
    blocks.push("💊 Échauffement de 10-15 min minimum avant tout effort intense");
    blocks.push("🚰 Hydratation continue pendant la séance (petites gorgées toutes les 10 min)");
  }
  
  // 🟠 DÉBUTANT / SÉDENTAIRE : Approche très progressive
  if (isBeginner) {
    blocks.unshift("🎯 SÉANCE ZÉRO : Objectif = apprendre les mouvements, PAS performer");
    blocks.push("📏 Squat sur chaise 3x8 (descendre toucher une chaise, remonter) - protéger les genoux");
    blocks.push("🦵 Leg curl machine 3x12 (très léger, sentir le mouvement)");
    blocks.push("🍑 Hip thrust poids du corps 3x10 (maîtriser la bascule du bassin)");
    blocks.push("💪 Gainage sur genoux 3x20 sec (version adaptée, pas sur pointes)");
    blocks.push("🏃 Cardio : 10 min vélo ou marche inclinée (NE PAS FORCER)");
    blocks.push("📖 Après séance : 5 min d'étirements très doux");
    return blocks; // On s'arrête là pour les débutants
  }
  
  // 🟡 PROBLÈMES POSTURAUX
  if (hasPostureIssues) {
    blocks.push("🧘 Face pull 4x15 (ouvre la cage thoracique, corrige les épaules rondes)");
    blocks.push("📐 Rowing face 3x12 (travail chaîne postérieure)");
    blocks.push("🦢 Étirement pectoraux 3x30 sec (angle porte)");
  }
  
  // 🟢 MUSCLES PRIORITAIRES selon analyse
  if (context.userContext.priorityMuscles.includes("dos")) {
    blocks.push("🦾 Tirage vertical prise large 4x12 (renforce le dos large)");
  }
  if (context.userContext.priorityMuscles.includes("jambes")) {
    blocks.push("🦵 Presse à cuisses 4x12 (jambes en sécurité)");
  }
  if (context.userContext.priorityMuscles.includes("gainage")) {
    blocks.push("💪 Planche abdos sur avant-bras 3x30 sec (neutralise le bassin)");
  }
  
  // Si aucun bloc spécifique n'a été ajouté
  if (blocks.length === 0) {
    blocks.push("🏋️ Full body découverte : 1 exercice par groupe musculaire");
    blocks.push("🎯 3 séries de 8-12 reps, charge légère");
    blocks.push("📖 Finir par 10 min de marche");
  }
  
  return blocks.slice(0, 6);
}


function generateDynamicFormat(context: {
  focusMuscle: string;
  weeklyMuscleStats: MuscleStats;
  latestRaw: string;
  overloadWarning: string;
  userContext: ReturnType<typeof analyzeUserContext>;
}): string {
  if (context.userContext.isBeginner) {
    return "🎓 SÉANCE DÉCOUVERTE - Apprentissage des mouvements de base";
  }
  if (context.userContext.hasHypotension) {
    return "🩺 SÉANCE SÉCURISÉE - Adaptation tension artérielle";
  }
  if (context.userContext.hasPostureIssues) {
    return "🧘 CORRECTION POSTURALE - Rééquilibrage dos/pectoraux";
  }
  return "🏋️ SÉANCE STANDARD - Progression contrôlée";
}

function generateSessionDecision(params: {
  profileText: string;
  dailyStateText: string;
  fallbackFormat: string;
  fallbackBlocks: string[];
}): { format: string; blocks: string[] } {
  const profile = params.profileText.toLowerCase();
  const state = params.dailyStateText.toLowerCase();

  const hasHypotension = profile.includes("hypotension") || profile.includes("abilify");
  const hasPostureNeed =
    profile.includes("lordose") ||
    profile.includes("bassin") ||
    profile.includes("épaules") ||
    profile.includes("epaules") ||
    profile.includes("cage thoracique");

  const needsRecovery =
    state.includes("repos") ||
    state.includes("fatigue") ||
    state.includes("épuis") ||
    state.includes("courbature") ||
    state.includes("mal dormi");

  const heavyLegDay = state.includes("jambes") || state.includes("leg day");
  const heavyUpperDay =
    state.includes("pec") ||
    state.includes("dos") ||
    state.includes("épaule") ||
    state.includes("epaule");

  if (needsRecovery) {
    return {
      format: "🛌 Récupération intelligente pilotée par l’état de la veille",
      blocks: [
        hasHypotension
          ? "⚠️ Lever progressif + 5 min de marche lente"
          : "🚶 Marche douce 10 à 15 min",
        hasPostureNeed
          ? "🧘 Mobilité cage thoracique + ouverture épaules 3x30 sec"
          : "🧘 Étirements doux 5 min",
        "💪 Gainage léger 3x20 sec",
        "💧 Hydratation + protéines + coucher tôt",
      ],
    };
  }

  if (heavyLegDay) {
    return {
      format: "🔁 Haut du corps + posture (adapté à hier)",
      blocks: [
        "🦾 Tirage vertical 4x12",
        "📐 Rowing assis 3x12",
        hasPostureNeed
          ? "🧘 Face pull 3x15 + ouverture thoracique"
          : "💪 Développé guidé léger 3x10",
        "🏃 Cardio zone 2 : 15 min",
      ],
    };
  }

  if (heavyUpperDay) {
    return {
      format: "🦵 Bas du corps + gainage (rotation intelligente)",
      blocks: [
        "🦵 Presse à cuisses 4x12",
        "🍑 Hip thrust 3x12",
        "💪 Gainage transverse 3x30 sec",
        hasHypotension
          ? "🚲 Vélo assis 10 min retour au calme"
          : "🏃 Marche inclinée 10 min",
      ],
    };
  }

  return {
    format: params.fallbackFormat,
    blocks: params.fallbackBlocks,
  };
}

export default function PremiumCockpitMock() {
  const [timeScope, setTimeScope] = useState<TimeScope>("week");
  const [viewMode, setViewMode] = useState<ViewMode>("analysis");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allLogs = useMemo(() => readHybridCoachLogs(), []);

  const rawLogs = useMemo(() => {
    if (timeScope === "day") return allLogs.slice(-1);
    if (timeScope === "week") return allLogs.slice(-7);
    if (timeScope === "fortnight") return allLogs.slice(-14);
    return allLogs;
  }, [allLogs, timeScope]);

  const baselineWeight = useMemo(() => getLastKnownWeight(allLogs, 88), [allLogs]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (rawLogs.length === 0) {
      return [
        { day: "Actuel", weight: baselineWeight },
        { day: "Objectif", weight: 80 },
      ];
    }

    const points = rawLogs
      .map((log, index) => ({
        day: `J${index + 1}`,
        weight: safeNumber(log.weight, NaN),
      }))
      .filter((point) => Number.isFinite(point.weight) && point.weight > 0);

    if (points.length === 0) {
      return [
        { day: "Actuel", weight: baselineWeight },
        { day: "Objectif", weight: 80 },
      ];
    }

    return [...points, { day: "Objectif", weight: 80 }];
  }, [rawLogs, baselineWeight]);

  const historyText = useMemo(
    () => rawLogs.map((log) => safeString(log.raw).toLowerCase()),
    [rawLogs]
  );

  // 🆕 Analyse du contexte utilisateur à partir de TOUS les logs
  const userContext = useMemo(() => analyzeUserContext(historyText), [historyText]);

  const weeklyMuscleStats = useMemo<MuscleStats>(
    () => ({
      pecs: countMatches(historyText, "pec"),
      dos: countMatches(historyText, "dos"),
      jambes: countMatches(historyText, "jamb"),
      epaules: historyText.filter((text) => text.includes("épaule") || text.includes("epaule")).length,
    }),
    [historyText]
  );

  const totalSeries = useMemo(
    () =>
      historyText.reduce((acc, text) => {
        const matches = [...text.matchAll(/(\d+)x(\d+(?:[.,]\d+)?)/g)];
        return acc + matches.length;
      }, 0),
    [historyText]
  );

  const overloadWarning = useMemo(() => {
    if (userContext.isBeginner) return "🎓 DÉBUTANT : Progression TRÈS progressive, ne pas forcer";
    if (userContext.hasHypotension) return "⚠️ HYPOTENSION : Montées progressives, hydratation";
    if (weeklyMuscleStats.pecs + weeklyMuscleStats.epaules >= 3) return "⚠️ Haut du corps à surveiller";
    if (weeklyMuscleStats.jambes === 0) return "⚠️ Jambes sous-entraînées";
    return "✅ Répartition équilibrée";
  }, [userContext, weeklyMuscleStats]);

  const latestLog = rawLogs[rawLogs.length - 1] ?? {};
  const latestRaw = safeString(latestLog.raw).toLowerCase();
  const coachAdvice = safeString(latestLog.coachAdvice) || (userContext.isBeginner ? "🎯 Commence doucement, apprends les mouvements avant d'augmenter l'intensité" : overloadWarning);
  const nutritionScore = safeNumber(latestLog.nutritionScore, 0);
  const parsedCalories = safeString(latestLog.parsedCalories) || "Non précisé";

  const recoveryScore = useMemo(() => {
    const aiRecovery = safeNumber(latestLog.recoveryScore, NaN);
    if (Number.isFinite(aiRecovery) && aiRecovery >= 0) {
      return aiRecovery;
    }

    if (latestRaw.includes("8h") || latestRaw.includes("7h")) return 85;
    if (latestRaw.includes("6h")) return 70;
    return userContext.isBeginner ? 70 : 60;
  }, [latestLog.recoveryScore, latestRaw, userContext]);

  const focusMuscle = useMemo(() => {
    const aiFocus = safeString(latestLog.muscleFocus);
    if (aiFocus) {
      return aiFocus;
    }

    if (userContext.hasPostureIssues) return "Correction posturale (dos/ouvrant)";
    if (latestRaw.includes("pec")) return "Pecs";
    if (latestRaw.includes("épaule") || latestRaw.includes("epaule")) return "Épaules";
    if (latestRaw.includes("dos")) return "Dos";
    if (latestRaw.includes("jamb")) return "Jambes";
    return userContext.isBeginner ? "Découverte complète" : "À définir";
  }, [latestLog.muscleFocus, latestRaw, userContext]);

const weightPoints = chartData.filter((point) => point.day !== "Objectif");
const latestWeight =
  weightPoints[weightPoints.length - 1]?.weight ?? baselineWeight;
const chartMaxY = Number.isFinite(latestWeight)
  ? Math.max(90, latestWeight + 2)
  : Math.max(90, baselineWeight + 2);
const progressionSummary = useMemo(() => {
  const realPoints = chartData.filter(
    (point) => point.day !== "Objectif"
  );

  if (realPoints.length < 2) {
    return {
      delta: 0,
      etaDays: null as number | null,
    };
  }

  const startWeight = realPoints[0]?.weight ?? baselineWeight;
  const currentWeight =
    realPoints[realPoints.length - 1]?.weight ?? baselineWeight;

  const delta = Number((currentWeight - startWeight).toFixed(1));

  const avgLossPerLog =
    (startWeight - currentWeight) /
    Math.max(1, realPoints.length - 1);

  const remaining = Math.max(0, currentWeight - 80);

  return {
    delta,
    etaDays:
      avgLossPerLog > 0
        ? Math.ceil(remaining / avgLossPerLog)
        : null,
  };
}, [chartData, baselineWeight]);  

  const posturePriority = useMemo(() => {
    if (userContext.hasPostureIssues) return "Ouverture thoracique + gainage transverse + neutralisation bassin";
    if (weeklyMuscleStats.dos < weeklyMuscleStats.pecs) return "Dos + ouverture thoracique";
    if (weeklyMuscleStats.jambes === 0) return "Fessiers + gainage + hanches";
    return "Équilibre postural OK";
  }, [userContext, weeklyMuscleStats]);

  // 🆕 Génération DYNAMIQUE selon TOUT le contexte
  const dynamicContext = useMemo(() => ({
    focusMuscle,
    recoveryScore,
    weeklyMuscleStats,
    historyText,
    totalSeries,
    latestRaw,
    overloadWarning,
    posturePriority,
    userContext,
  }), [focusMuscle, recoveryScore, weeklyMuscleStats, historyText, totalSeries, latestRaw, overloadWarning, posturePriority, userContext]);

  const dynamicBlocks = useMemo(() => generateDynamicBlocks(dynamicContext), [dynamicContext]);
  const dynamicFormat = useMemo(() => generateDynamicFormat(dynamicContext), [dynamicContext]);

  const permanentProfileText = safeString(allLogs[0]?.raw);
  const dailyStateText = latestRaw;

  const nextSessionDecision = useMemo(() => {
    const coachNextSession = latestLog.nextSession;

    const hasCoachDecision =
      coachNextSession &&
      typeof coachNextSession === "object" &&
      typeof coachNextSession.format === "string" &&
      Array.isArray(coachNextSession.blocks) &&
      coachNextSession.blocks.length > 0;

    if (hasCoachDecision) {
      return {
        format: safeString(coachNextSession.format),
        blocks: Array.isArray(coachNextSession.blocks)
          ? coachNextSession.blocks
              .map((block) => safeString(block))
              .filter(Boolean)
          : [],
      };
    }

    return generateSessionDecision({
      profileText: permanentProfileText,
      dailyStateText,
      fallbackFormat: dynamicFormat,
      fallbackBlocks: dynamicBlocks,
    });
  }, [
    latestLog,
    permanentProfileText,
    dailyStateText,
    dynamicFormat,
    dynamicBlocks,
  ]);

  const nextSessionFormat = nextSessionDecision.format;
  const nextSessionBlocks = nextSessionDecision.blocks;

  function generateBlockExplanations(blocks: string[], ctx: typeof dynamicContext): BlockExplanation[] {
    const dailyText = ctx.latestRaw.toLowerCase();
    const currentWeight = latestWeight;
    const recoveryState =
      ctx.recoveryScore >= 80
        ? "récupération haute"
        : ctx.recoveryScore >= 65
          ? "récupération correcte"
          : "récupération fragile";

    return blocks.map((block) => {
      const lowerBlock = block.toLowerCase();
      const mentionedSleep = dailyText.includes("dormi") || dailyText.includes("sommeil");
      const mentionedFood =
        dailyText.includes("mangé") ||
        dailyText.includes("mange") ||
        dailyText.includes("poulet") ||
        dailyText.includes("proté") ||
        dailyText.includes("protein");
      const mentionedWalk =
        dailyText.includes("march") ||
        dailyText.includes("km") ||
        dailyText.includes("cardio");

      let explanation: BlockExplanation = {
        title: `🎯 ${block}`,
        explanation: `L'IA a choisi exactement ce bloc pour demain en réponse à ton dernier état (${ctx.latestRaw || "état du jour"}), avec un poids actuel autour de ${currentWeight} kg et une ${recoveryState}.`,
        tip: "Priorité à une exécution propre, tempo contrôlé, et adaptation selon l'énergie réelle du moment.",
      };

      if (lowerBlock.includes("squat")) {
        explanation = {
          title: "🏋️ Squat",
          explanation: `${block} a été retenu pour renforcer jambes + gainage selon ton état récent et ton objectif poids.`,
          tip: ctx.userContext.hasHypotension
            ? "Remonte lentement et marque 2 sec debout avant la rep suivante."
            : "Pousse dans les talons et garde le buste gainé.",
        };
      } else if (lowerBlock.includes("hip thrust")) {
        explanation = {
          title: "🍑 Hip Thrust",
          explanation: `${block} cible précisément bassin, fessiers et posture globale pour optimiser la silhouette.`,
          tip: mentionedSleep
            ? "Vu le sommeil loggé, reste sur une charge modérée et tempo contrôlé."
            : "Pause 1 sec en haut en contractant fort les fessiers.",
        };
      } else if (lowerBlock.includes("tirage") || lowerBlock.includes("row")) {
        explanation = {
          title: "🦾 Tirage / Rowing",
          explanation: `${block} équilibre la chaîne postérieure après ce que tu as loggé aujourd'hui.`,
          tip: mentionedWalk
            ? "Comme tu as déjà bougé aujourd'hui, focus qualité de contraction plutôt que volume."
            : "Ramène les coudes vers l'arrière sans hausser les épaules.",
        };
      } else if (
        lowerBlock.includes("cardio") ||
        lowerBlock.includes("marche") ||
        lowerBlock.includes("vélo")
      ) {
        explanation = {
          title: "🏃 Cardio intelligent",
          explanation: `${block} ajuste la dépense énergétique selon activité, poids et récupération de la veille.`,
          tip: mentionedFood
            ? "Après ton apport alimentaire récent, reste en zone 2 pour optimiser la dépense."
            : "Rythme conversationnel, respiration nasale si possible.",
        };
      } else if (lowerBlock.includes("gainage")) {
        explanation = {
          title: "💪 Gainage ciblé",
          explanation: `${block} renforce le centre du corps pour protéger le dos et améliorer la posture.`,
          tip: ctx.userContext.hasPostureIssues
            ? "Rentre légèrement les côtes et neutralise le bassin."
            : "Serre les abdos sans bloquer la respiration.",
        };
      }

      return explanation;
    });
  }

  const blockExplanations = useMemo(() => generateBlockExplanations(nextSessionBlocks, dynamicContext), [nextSessionBlocks, dynamicContext]);

  const SimpleChart = () => {
  const chartFloor = Math.min(
    76,
    Math.floor(Math.min(...chartData.map((item) => item.weight)) - 2)
  );

  return (
    <div className="h-64 w-full">
      <div className="h-full rounded-2xl bg-slate-800 p-4">
        <div className="mb-4 flex justify-between text-sm text-slate-400">
          <span>📊 Progression vers 80 kg</span>
          <span>Objectif: 80 kg</span>
        </div>

        <div className="relative h-48">
          <div className="absolute bottom-0 left-0 right-0">
            {chartData.map((point, idx) => {
              const heightPercent =
                ((point.weight - chartFloor) /
                  (chartMaxY - chartFloor)) *
                100;

              const barHeight = Math.max(
                5,
                Math.min(100, heightPercent)
              );

              return (
                <div
                  key={idx}
                  className="inline-block w-12 align-bottom"
                  style={{ height: "100%" }}
                >
                  <div
                    className="mx-1 rounded-t-lg bg-emerald-500 transition-all"
                    style={{
                      height: `${barHeight}%`,
                      minHeight: "4px",
                    }}
                  />

                  <div className="mt-2 text-center text-xs text-slate-400">
                    {point.day}
                  </div>

                  <div className="text-center text-xs text-emerald-400">
                    {point.weight}kg
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-6xl text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Hybrid Coach Cockpit</h1>
          <p className="mt-2 text-slate-400 text-sm md:text-base">Vision long terme, objectif 80 kg, Orange Bleue + Freeletics</p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {[
            { value: "day" as const, label: "Aujourd'hui" },
            { value: "week" as const, label: "7 jours" },
            { value: "fortnight" as const, label: "14 jours" },
            { value: "all" as const, label: "Depuis le début" },
          ].map((scope) => (
            <button
              key={scope.value}
              className={`rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm transition-colors ${
                timeScope === scope.value ? "bg-emerald-500" : "bg-slate-800 hover:bg-slate-700"
              }`}
              onClick={() => setTimeScope(scope.value)}
              type="button"
            >
              {scope.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            className={`rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm transition-colors ${
              viewMode === "analysis" ? "bg-cyan-500" : "bg-slate-800 hover:bg-slate-700"
            }`}
            onClick={() => setViewMode("analysis")}
            type="button"
          >
            📊 Analyse
          </button>
          <button
            className={`rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm transition-colors ${
              viewMode === "prep" ? "bg-violet-500" : "bg-slate-800 hover:bg-slate-700"
            }`}
            onClick={() => setViewMode("prep")}
            type="button"
          >
            🎯 Préparer demain
          </button>
        </div>

        {viewMode === "analysis" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-slate-900 p-6">
                <h2 className="mb-4 text-xl font-semibold">🧠 À retenir aujourd'hui</h2>
                <div className="space-y-3 text-slate-300">
                  <p>Focus du corps : <strong className="text-cyan-400">{focusMuscle}</strong></p>
                  <p>Conseil coach : <strong className="text-emerald-400">{coachAdvice}</strong></p>
                  <p>Priorité posture : <strong className="text-violet-400">{posturePriority}</strong></p>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900 p-6">
                <h2 className="mb-4 text-xl font-semibold">🍱 Nutrition + récup</h2>
                <div className="space-y-3 text-slate-300">
                  <p>Calories repérées : <strong>{parsedCalories}</strong></p>
                  <p>Score nutrition : <strong className="text-emerald-400">{nutritionScore}/100</strong></p>
                  <p>Sommeil / récup : <strong className="text-cyan-400">{recoveryScore}/100</strong></p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">⚠️ À éviter</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-slate-400">Surcharge</p>
                  <p className="text-lg font-bold">{overloadWarning}</p>
                </div>
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-slate-400">Demain</p>
                  <p className="text-lg font-bold text-cyan-400">{nextSessionFormat}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-900 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
  <h2 className="text-xl font-semibold">📈 Progression</h2>

  <div className="text-sm text-slate-400">
    Δ depuis début:
    <strong
      className={
        progressionSummary.delta <= 0
          ? "text-emerald-400"
          : "text-red-400"
      }
    >
      {progressionSummary.delta > 0 ? " +" : " "}
      {progressionSummary.delta} kg
    </strong>

    {progressionSummary.etaDays ? (
      <span className="ml-3">
        🎯 ETA 80kg:
        <strong className="text-cyan-400">
          {progressionSummary.etaDays} j
        </strong>
      </span>
    ) : null}
  </div>
</div>

<SimpleChart />
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">📋 Plan de la prochaine séance</h2>
              <p className="text-lg text-emerald-400">{overloadWarning}</p>
              <p className="mt-3 text-slate-300">
                Séance recommandée : <strong className="text-cyan-400">{nextSessionFormat}</strong>
              </p>
              <p className="mt-3 text-slate-300">
                Priorité posture : <strong className="text-violet-400">{posturePriority}</strong>
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">🏋️ Machines / focus conseillé</h2>
              <ul className="space-y-3 text-slate-300">
                {nextSessionBlocks.map((block, index) => (
                  <li key={`${block}-${index}`} className="rounded-2xl bg-slate-800 p-4 hover:bg-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1">{block}</span>
                      <InfoHint title={blockExplanations[index]?.title} text={`${blockExplanations[index]?.explanation}\n\n${blockExplanations[index]?.tip}`} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}