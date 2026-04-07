// server/coachProfile.js
import dotenv from 'dotenv';
dotenv.config();

export const coachProfile = {
  identity: {
    // On récupère tes infos privées depuis le .env
    objectiveWeightKg: Number(process.env.USER_GOAL_WEIGHT) || 80,
    heightCm: Number(process.env.USER_HEIGHT) || 190,
    currentRangeKg: "Donnée privée (voir logs)",
    longTermGoal: "être sec et dessiné",
    morphology: `Grand gabarit (${process.env.USER_HEIGHT}cm), bonne marge de recomposition`,
  },

  trainingEnvironment: {
    orangeBleue: {
      enabled: true,
      days: ["lundi", "mardi", "jeudi", "vendredi"],
      classes: ["Yako Pump", "Yako Training", "Yako Biking", "Yako Up"],
      notes: "Alterne cours collectifs et salle libre selon fatigue",
    },
    freeletics: {
      enabled: true,
      strategy: "Utilisé en parallèle pour accélérer la sèche",
      focus: ["HIIT", "cardio", "poids du corps", "running"],
    },
    extra: {
      swimming: true,
      cardioPreference: ["rameur", "tapis", "natation", "marche"],
    },
  },

  nutrition: {
    preferredFoods: [
      "œufs", "blanc de poulet", "thon", "fromage blanc", 
      "flocons d’avoine", "riz", "pâtes", "légumes", "whey vegan"
    ],
    // Tes "écarts" sont maintenant cachés
    commonCheats: process.env.USER_CHEATS ? process.env.USER_CHEATS.split(', ') : ["écarts modérés"],
    
    strategy: "Déficit calorique durable, protéines hautes, flexibilité sociale",
    
    // On garde la logique du plan Lidl car c'est une structure de calcul, pas une info secrète
    lidl14DayNutritionPlan: {
      durationDays: 14,
      dailyTargets: {
        eggs: 4, chickenGrams: 430, tunaFrequency: "10-12 boîtes / 14j",
        fromageBlancGrams: 250, oatsGrams: 85, riceGrams: 140,
      },
      stock: {
        eggs: 56, chickenKg: 6, tunaCans: 12, fromageBlancKg: 3.5,
        oatsKg: 1.2, riceKg: 2, pastaKg: 1, frozenVegetablesKg: 7,
      },
      coachingIntent: "Comparer la journée à cette base pour ajuster le score nutrition."
    },
  },

  recovery: {
    askForFatigueCheck: true,
    sleepSensitiveUnderHours: 6,
  },

  postureProfile: {
    // Info médicale sensible -> Cachée dans le .env
    details: process.env.USER_POSTURE || "Focus posture standard",
    priorities: [
      "ouverture thoracique", "renforcement dos", "gainage profond",
      "fessiers", "ischios", "mobilité hanches",
    ],
    avoidOverload: [
      "développé trop lourd", "trapèzes dominants", "épaules enroulées",
    ],
  },

  coachingRules: [
    "Toujours relier chaque conseil à l'objectif de poids cible.",
    "Prendre en compte Orange Bleue + Freeletics.",
    "Éviter surcharge épaules/pecs sur jours consécutifs.",
    "Proposer report séance si sommeil < 6h.",
  ],
};