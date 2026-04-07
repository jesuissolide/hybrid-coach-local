type CoachParsed = {
  goalProjection: string | undefined;
  parsedSleep: string;
  parsedMeal: string;
  parsedCalories: string;
  parsedMachine: string;
  parsedReps: string;
  raw?: string;
  nextSession?: {
    format: string;
    blocks: string[];
  };
};

function inferNextSession(rawText: string) {
  const raw = rawText.toLowerCase();

  if (raw.includes("fatigue") || raw.includes("mal dormi") || raw.includes("6h")) {
    return {
      format: "Recovery • mobilité + cardio facile",
      blocks: [
        "Gainage 3 x 20 sec • repos 30 sec",
        "Mobilité thoracique 3 x 12",
        "Cardio zone 2 12 min",
      ],
    };
  }

  if (raw.includes("pec") || raw.includes("épaule")) {
    return {
      format: "Salle libre • machines dos + posture",
      blocks: [
        "Rowing machine 4 x 10 • repos 75 sec",
        "Seated row 3 x 12 • repos 60 sec",
        "Gainage 4 x 30 sec",
      ],
    };
  }

  if (!raw.includes("jamb")) {
    return {
      format: "Salle libre • jambes + bassin",
      blocks: [
        "Hip thrust 4 x 12 • repos 60 sec",
        "Leg curl 3 x 15 • repos 60 sec",
        "Cardio léger 10 min",
      ],
    };
  }

  return {
    format: "Full body léger",
    blocks: [
      "Rowing 3 x 10",
      "Hip thrust 3 x 12",
      "Cardio zone 2 15 min",
    ],
  };
}

export async function coachIngest(
  text: string
): Promise<CoachParsed> {
const res = await fetch(
    "https://hybrid-coach-local-1.onrender.com/api/coach-ingest",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!res.ok) {
    return {
      goalProjection: undefined,
      parsedSleep: "",
      parsedMeal: "",
      parsedCalories: "",
      parsedMachine: "",
      parsedReps: "",
      raw: text,
      nextSession: inferNextSession(text),
    };
  }

  const data = await res.json();

  return {
    ...data,
    raw: data.raw ?? text,
    nextSession: {
      format:
        data.nextSession?.format ?? inferNextSession(text).format,
      blocks: Array.isArray(data.nextSession?.blocks)
        ? data.nextSession.blocks
        : inferNextSession(text).blocks,
    },
  };
}