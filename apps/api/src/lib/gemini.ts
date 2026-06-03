import { GoogleGenAI, type Part } from '@google/genai';
import { GeminiAnalysisResponseSchema, SessionStartResponseSchema } from '@speaking-coach/shared';
import type { GeminiAnalysisResponse, GeneratedTopic, ErrorPattern, ReadingPassage, Question } from '@speaking-coach/shared';
import { SCENARIOS } from '@speaking-coach/shared';

const genAI = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] ?? '' }) as any;

const ANALYSIS_SYSTEM_INSTRUCTION = `You are an English speaking coach and conversation partner for a Russian-speaking learner at B2–C1 level.

The user will send you an audio recording of themselves speaking English.

CRITICAL: You must respond ONLY with a valid JSON object. No markdown, no preamble, no explanation outside the JSON.

JSON structure:
{
  "transcript": "...",
  "wordsPerMinute": 0,
  "pauseCount": 0,
  "confidenceLevel": 1-5,
  "errors": [
    {
      "original": "phrase user said",
      "corrected": "correct version",
      "explanation": "объяснение на русском — почему это ошибка и какое правило",
      "category": "grammar|vocabulary|pronunciation",
      "pattern": "Present Perfect vs Past Simple"
    }
  ],
  "dialogueReply": "Your natural English reply continuing the conversation (2-4 sentences, end with a question)",
  "grammarTip": "Pro tip: one insight in English related to what the user said",
  "topicFeedback": "brief Russian comment on how well the user handled the topic"
}

RULES:
- errors array: max 4 items. Prioritize the most impactful mistakes.
- If no significant errors, return empty errors array and say so in topicFeedback.
- dialogueReply: match B2–C1 complexity, be warm and natural, always end with open question.
- grammarTip: concrete, specific, not generic. Reference what the user actually said.
- Never be condescending. The user is a high-level adult learner.
- confidenceLevel: 1=very hesitant, 3=normal, 5=very confident and fluent
- wordsPerMinute: estimate from audio duration and word count
- pauseCount: count pauses longer than 1.5 seconds`;

/**
 * Analyses a user's audio recording and returns structured coaching feedback.
 */
export async function analyzeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<GeminiAnalysisResponse> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
  });

  const audioPart: Part = {
    inlineData: {
      mimeType,
      data: audioBuffer.toString('base64'),
    },
  };

  const textPart: Part = {
    text: 'Please analyze this English speech recording and respond with the JSON as instructed.',
  };

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [audioPart, textPart] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  });

  const rawText = result.response.text();

  // Strip possible markdown code fences
  const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${jsonText.slice(0, 200)}`);
  }

  return GeminiAnalysisResponseSchema.parse(parsed);
}

/**
 * Generates a conversation topic/scenario tailored to the user's top error patterns.
 */
export async function generateTopic(errorPatterns: Pick<ErrorPattern, 'pattern' | 'occurrences'>[]): Promise<GeneratedTopic> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const topPatterns = errorPatterns
    .slice(0, 3)
    .map((e, i) => `${i + 1}. ${e.pattern} (${e.occurrences}x)`)
    .join('\n');

  const scenarioList = SCENARIOS.join(', ');

  const prompt = `You are an English speaking coach. Generate a speaking practice scenario for an advanced Russian learner.

User's top error patterns:
${topPatterns || 'No recorded errors yet — pick an engaging scenario.'}

Available scenario types: ${scenarioList}

Respond ONLY with valid JSON (no markdown):
{
  "topic": "specific engaging description of what the user should talk about (1-2 sentences)",
  "scenario": "one of the available scenario types",
  "openingLine": "The AI coach's opening line to start the conversation (immersive, in character)",
  "difficulty": "B1|B2|C1"
}

Rules:
- Rotate through different scenario types — don't repeat the most common one
- The topic should target the user's weak areas naturally (don't mention the errors directly)
- openingLine should be natural, warm, and put the user in the situation immediately`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 512 },
  });

  const rawText = result.response.text();
  const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned invalid JSON for topic: ${jsonText.slice(0, 200)}`);
  }

  return SessionStartResponseSchema.parse(parsed);
}

/**
 * Generates an academic reading passage with comprehension questions.
 */
export async function generateReading(
  errorPatterns: Pick<ErrorPattern, 'pattern' | 'occurrences'>[],
  difficulty: 'B2' | 'C1' = 'B2',
): Promise<ReadingPassage> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const topPatterns = errorPatterns
    .slice(0, 3)
    .map((e, i) => `${i + 1}. ${e.pattern} (${e.occurrences}x)`)
    .join('\n');

  const prompt = `You are an IELTS/TOEFL reading test generator for a ${difficulty} English learner.

Generate an academic reading passage with comprehension questions.
You must respond ONLY with a valid JSON object. No markdown, no preamble.

User's recent error patterns (for vocabulary targeting):
${topPatterns || 'None provided'}

RULES:
- Generate exactly 8 questions total: 3 multiple_choice + 3 true_false_ng + 2 open
- Difficulty ${difficulty}: ${difficulty === 'B2' ? 'complex but accessible sentences, common academic vocabulary' : 'dense academic prose, low-frequency vocabulary, implicit meaning'}
- All explanations in Russian
- Passage must be 800-1000 words
- Respond ONLY with JSON:
{
  "passage": "...",
  "topic": "...",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A. ...",
      "explanation": "..."
    },
    ...
  ]
}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });

  const rawText = result.response.text();
  const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned invalid JSON for reading: ${jsonText.slice(0, 200)}`);
  }

  return parsed as ReadingPassage;
}

/**
 * Evaluates an open-ended answer to a reading comprehension question.
 */
export async function evaluateOpenAnswer(
  question: string,
  referenceAnswer: string,
  userAnswer: string,
): Promise<{ isCorrect: boolean; score: number; aiExplanation: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const prompt = `You are an English language examiner.
Evaluate the student's answer to an open reading comprehension question.
Respond ONLY with valid JSON:
{
  "isCorrect": true/false,
  "score": 0-2,
  "aiExplanation": "Объяснение на русском — что правильно, что упущено, как улучшить"
}

Question: ${question}
Reference answer: ${referenceAnswer}
Student answer: ${userAnswer}

Be fair but rigorous. Accept paraphrasing. Reject answers that miss the key idea. Score: 0=wrong, 1=partially correct, 2=fully correct.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  });

  const rawText = result.response.text();
  const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    return {
      isCorrect: false,
      score: 0,
      aiExplanation: 'Ошибка при анализе ответа ИИ.',
    };
  }
}
