import { GoogleGenAI } from "@google/genai";
import { LearningPlan, DayPlan, QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert curriculum designer and educational coach. 
Your goal is to break down complex topics into actionable, bite-sized daily learning plans.
The plans must be practical, step-by-step, and tailored to the user's time constraints.

CRITICAL INSTRUCTION: You MUST use the Google Search tool to verify every single URL you provide. 
Do not invent or hallucinate URLs. If you cannot find a specific resource via search, do not include it.
Only include resources that currently exist and are accessible.
`;

// Helper to extract JSON robustly
function extractJson(text: string): any {
  try {
    // 1. Try to find a code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }
    
    // 2. Try parsing the raw text directly
    return JSON.parse(text);
  } catch (e) {
    // 3. Last resort: Find the first '{' and last '}'
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      try {
        const potentialJson = text.substring(firstOpen, lastClose + 1);
        return JSON.parse(potentialJson);
      } catch (e2) {
        // Failed
      }
    }
    console.error("Failed to parse JSON from model response", text);
    throw new Error("The model generated an invalid format. Please try again.");
  }
}

export async function generateLearningPlan(topic: string, days: number, timePerDay: string): Promise<Omit<LearningPlan, 'id' | 'startDate' | 'lastUpdated'>> {
  const prompt = `
    Create a ${days}-day learning plan for the topic: "${topic}".
    The user can spend ${timePerDay} per day.
    
    EXECUTION STEPS:
    1. Search Google for the best, most up-to-date tutorials, documentation, and videos for "${topic}".
    2. Select specific, high-quality URLs from the search results.
    3. Construct the JSON plan.
    
    Return ONLY a JSON object with the following structure:
    {
      "topic": "${topic}",
      "durationDays": ${days},
      "dailyTime": "${timePerDay}",
      "days": [
        {
          "dayNumber": 1,
          "title": "Short title for the day",
          "description": "Detailed step-by-step instructions. Use markdown.",
          "tasks": [
            {
              "text": "The actionable task text",
              "resources": [
                { "title": "Actual Page Title", "url": "https://actual-url-found-via-search", "type": "blog" | "video" | "documentation" }
              ]
            }
          ]
        }
      ]
    }
    
    Requirements:
    - 'tasks' must be an array of objects, NOT strings.
    - Each task MUST have 1-2 relevant 'resources' found via Google Search.
    - URLs MUST be real and verifiable. Do NOT generate placeholders like "example.com".
    - If no specific URL is found for a task, leave the resources array empty.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = extractJson(text);
    
    const formattedDays: DayPlan[] = data.days.map((d: any) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      description: d.description,
      tasks: d.tasks.map((t: any, idx: number) => ({
        id: `task-${d.dayNumber}-${idx}`,
        // Handle both object (new format) and string (fallback)
        text: typeof t === 'string' ? t : t.text,
        isCompleted: false,
        resources: typeof t === 'object' && t.resources ? t.resources : []
      }))
    }));

    return {
      topic: data.topic,
      durationDays: data.durationDays,
      dailyTime: data.dailyTime,
      days: formattedDays
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function updatePlanWithChat(currentPlan: LearningPlan, userRequest: string): Promise<LearningPlan> {
  const simplifiedPlan = {
    days: currentPlan.days.map(d => ({
      dayNumber: d.dayNumber,
      title: d.title,
      description: d.description,
      tasks: d.tasks.map(t => ({ text: t.text, resources: t.resources })) 
    }))
  };

  const prompt = `
    The user wants to modify their current learning plan for "${currentPlan.topic}".
    
    Current Plan Structure (JSON):
    ${JSON.stringify(simplifiedPlan)}
    
    User Request: "${userRequest}"
    
    Please update the plan according to the request. 
    
    CRITICAL: If adding new tasks or content, YOU MUST use Google Search to find relevant, real 'resources' (url, title, type).
    Do not hallucinate URLs.
    
    Return ONLY the valid JSON of the updated "days" array. 
    Structure: { "days": [ ... ] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = extractJson(text);

    const updatedDays: DayPlan[] = data.days.map((d: any) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      description: d.description,
      tasks: d.tasks.map((t: any, idx: number) => ({
        id: `task-${d.dayNumber}-${idx}-${Date.now()}`,
        text: typeof t === 'string' ? t : t.text,
        isCompleted: false,
        resources: typeof t === 'object' && t.resources ? t.resources : []
      }))
    }));

    return {
      ...currentPlan,
      days: updatedDays,
      durationDays: updatedDays.length,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error("Gemini Update Error:", error);
    throw error;
  }
}

export async function generateQuiz(context: string, numQuestions: number = 5): Promise<QuizQuestion[]> {
  const prompt = `
    Create a multiple-choice quiz based on the following learning material.
    
    Material Context:
    "${context}"
    
    Requirements:
    - Generate exactly ${numQuestions} questions.
    - Questions should test understanding of key concepts in the material.
    - Provide 4 options per question.
    - Indicate the correct answer index (0-3).
    - Provide a short explanation for the correct answer.
    
    Return ONLY a JSON array of objects with this structure:
    [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswerIndex": 0,
        "explanation": "Why this is correct."
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return extractJson(text);
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    throw error;
  }
}