import { orangeBleueCoach } from "./coaches/orangeBleueCoach.js";
import { freeleticsCoach } from "./coaches/freeleticsCoach.js";
import { coachProfile } from "./coachProfile.js";
import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_FILE = path.join(__dirname, "logs.json");

// Lire les logs sauvegardés
function readLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Erreur lecture logs:", e);
  }
  return [];
}

// Sauvegarder un log
function writeLogs(logs) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error("Erreur écriture logs:", e);
  }
}

const app = express();

// CORS complet - solution garantie
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://beautiful-choux-757d8e.netlify.app',
    'https://cheery-bubblegum-3c035c.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractStrengthBlocks(rawText = "") {
  const lines = rawText.split("\n");
  const blocks = [];

  for (const line of lines) {
    const clean = line.trim();
    const match = clean.match(/^(.*?)(\d+)x(\d+(?:[.,]\d+)?)kg$/i);

    if (match) {
      blocks.push({
        machine: match[1].trim(),
        sets: Number(match[2]),
        weight: Number(match[3].replace(",", ".")),
      });
    }
  }

  return blocks;
}

// 📝 ROUTE POUR RÉCUPÉRER TOUS LES LOGS (historique synchronisé)
app.get("/api/logs", (req, res) => {
  const logs = readLogs();
  res.json(logs);
});

// 📝 ROUTE POUR AJOUTER UN LOG
app.post("/api/logs", (req, res) => {
  try {
    const { log } = req.body;
    if (!log) {
      return res.status(400).json({ error: "Missing log field" });
    }
    const logs = readLogs();
    logs.push(log);
    writeLogs(logs);
    res.json({ success: true, message: "Log sauvegardé" });
  } catch (error) {
    console.error("Erreur sauvegarde log:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 📝 ROUTE POUR SUPPRIMER UN LOG (optionnel)
app.delete("/api/logs/:timestamp", (req, res) => {
  try {
    const timestamp = req.params.timestamp;
    let logs = readLogs();
    logs = logs.filter(log => log.date !== timestamp);
    writeLogs(logs);
    res.json({ success: true, message: "Log supprimé" });
  } catch (error) {
    console.error("Erreur suppression log:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route principale IA (inchangée)
app.post("/api/coach-ingest", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
  "Tu es un coach orchestrateur ultra personnalisé objectif 80 kg. " +
  "Profil utilisateur : " +
  JSON.stringify(coachProfile) +
  " Coach expert Orange Bleue : " +
  JSON.stringify(orangeBleueCoach) +
  " Coach expert Freeletics : " +
  JSON.stringify(freeleticsCoach) +
  " Utilise ce contexte pour analyser la journée, projeter l'objectif, " +
  "évaluer nutrition, récupération, muscles ciblés et donner un conseil concret. " +
  "N'invente jamais un aliment consommé s'il n'est pas mentionné. " +
  "Identifie précisément le ou les groupes musculaires principaux sollicités aujourd'hui " +
  "(pecs, épaules, dos, jambes, full body, cardio dominant). " +
  "Si la journée décrit surtout un programme futur, indique les muscles probables visés. " +
  "Ajoute obligatoirement un champ nextSession qui représente la séance idéale pour DEMAIN. " +
  "Cette séance doit être une réponse directe au dernier message utilisateur, sans utiliser de règles statiques frontend. " +
  "Si l'utilisateur dit fatigue, repos ou mauvais sommeil, propose récupération active. " +
  "Si l'utilisateur dit grosse séance jambes, propose haut du corps ou posture. " +
  "Si l'utilisateur dit grosse séance haut du corps, propose jambes + gainage. " +
  "Si c'est un premier message, propose une séance découverte adaptée au profil." + " Ajoute aussi un champ dailyAnalysis avec la fatigue du jour, la qualité du sommeil, l'alignement nutritionnel, les muscles principaux travaillés et l'intensité recommandée pour demain."
        },
        {
          role: "user",
          content: text,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "coach_extract",
          schema: {
  type: "object",
  properties: {
    parsedSleep: { type: "string" },
    parsedMeal: { type: "string" },
    parsedCalories: { type: "string" },
    parsedMachine: { type: "string" },
    parsedReps: { type: "string" },

    goalProjection: { type: "string" },
    nutritionScore: { type: "number" },
    recoveryScore: { type: "number" },
    muscleFocus: { type: "string" },
    coachAdvice: { type: "string" },
    nextSession: {
      type: "object",
      properties: {
        format: { type: "string" },
        blocks: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["format", "blocks"],
      additionalProperties: false
    },
    dailyAnalysis: {
      type: "object",
      properties: {
        fatigueLevel: { type: "string" },
        sleepQuality: { type: "number" },
        nutritionAlignment: { type: "number" },
        primaryMusclesWorked: {
          type: "array",
          items: { type: "string" }
        },
        suggestedIntensity: { type: "string" }
      },
      required: [
        "fatigueLevel",
        "sleepQuality",
        "nutritionAlignment",
        "primaryMusclesWorked",
        "suggestedIntensity"
      ],
      additionalProperties: false
    }
  },
  required: [
    "parsedSleep",
    "parsedMeal",
    "parsedCalories",
    "parsedMachine",
    "parsedReps",
    "goalProjection",
    "nutritionScore",
    "recoveryScore",
    "muscleFocus",
    "coachAdvice",
    "nextSession",
    "dailyAnalysis"
  ],
  additionalProperties: false
}
        },
      },
    });

    const parsed = JSON.parse(response.output_text);

    res.json({
      ...parsed,
      raw: text,
      strengthBlocks: extractStrengthBlocks(text),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      parsedSleep: "",
      parsedMeal: "",
      parsedCalories: "",
      parsedMachine: "",
      parsedReps: "",
      goalProjection: "",
      nutritionScore: 0,
      recoveryScore: 0,
      muscleFocus: "",
      coachAdvice: "",
      nextSession: {
        format: "Séance temporairement indisponible",
        blocks: ["Réessaie après un nouveau message au coach"]
      },
      dailyAnalysis: {
        fatigueLevel: "unknown",
        sleepQuality: 0,
        nutritionAlignment: 0,
        primaryMusclesWorked: [],
        suggestedIntensity: "light"
      },
      raw: req.body?.text || "",
      strengthBlocks: extractStrengthBlocks(req.body?.text || ""),
    });
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log("🔥 Coach AI backend running on 3001");
});