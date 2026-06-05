import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
import { GeminiAnalysisResponseSchema, SessionStartResponseSchema } from '@speaking-coach/shared';
import type { GeminiAnalysisResponse, GeneratedTopic, ErrorPattern, ReadingPassage } from '@speaking-coach/shared';
import { SCENARIOS } from '@speaking-coach/shared';

const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] ?? '');
const GEMINI_MODEL = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash-lite';

const ANALYSIS_SYSTEM_INSTRUCTION = `You are an expert English speaking coach, linguist, and examiner. You are working with a Russian-speaking learner.

The user will send you an audio recording. Your goal is to analyze it with extreme precision.

CRITICAL: You must provide a VERBATIM transcript. Do NOT "clean up" the speech. If the user mispronounces a word (e.g., "xello" instead of "hello"), transcribe the sound exactly as it was heard if possible, or use the transcript to highlight the error later.

JSON structure:
{
  "transcript": "Verbatim transcript (e.g., 'Xello, my English is very well'). Do NOT fix errors here.",
  "wordsPerMinute": 0,
  "pauseCount": 0,
  "confidenceLevel": 1-5,
  "errors": [
    {
      "original": "exactly what the user said (with phonetic approximation if needed)",
      "corrected": "standard English version",
      "explanation": "Объяснение на русском. Если это произношение, объясните как правильно расположить язык/зубы (phonetic tips).",
      "category": "grammar|vocabulary|pronunciation",
      "pattern": "Specific rule name (e.g., 'H-dropping', '/h/ vs /x/')"
    }
  ],
  "dialogueReply": "Natural English reply (2-4 sentences, end with a question). Be encouraging but don't ignore the errors.",
  "grammarTip": "One specific phonetic or linguistic insight in English based on the user's speech.",
  "topicFeedback": "Brief Russian feedback on the content and clarity of the speech."
}

RULES:
- Priority: Pronunciation errors are just as important as grammar. Catch them all.
- Errors array: max 5 items. Prioritize the most "broken" or "non-native" aspects.
- transcript: Must match what was ACTUALLY said, even if it's ungrammatical or phonetic nonsense.
- Always include the 'grammar' error 'my English is very well' -> 'very good' if the user said it.
- Never be condescending. The user wants rigorous, professional feedback.`;

/**
 * Attempts to repair truncated JSON by adding missing closing braces.
 */
function tryRepairJson(json: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  let repaired = json;
  if (inString) repaired += '"';
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }
  return repaired;
}

/**
 * Analyses a user's audio recording and returns structured coaching feedback.
 */
export async function analyzeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<GeminiAnalysisResponse> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION + '\nKeep explanations brief and concise to avoid truncation.',
  });

  const audioPart: Part = {
    inlineData: {
      mimeType,
      data: audioBuffer.toString('base64'),
    },
  };

  const textPart: Part = {
    text: 'Analyze the speech and provide JSON. Keep descriptions short.',
  };

  // 60-second timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let result;
  try {
    result = await model.generateContent({
      contents: [{ role: 'user', parts: [audioPart, textPart] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawText = result.response.text();
  console.log(`[Gemini] Raw response length: ${rawText.length}`);

  // Strip possible markdown code fences
  let jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.warn(`[Gemini] Initial parse failed, attempting repair...`);
    try {
      jsonText = tryRepairJson(jsonText);
      parsed = JSON.parse(jsonText);
      console.info(`[Gemini] JSON repaired successfully.`);
    } catch (repairErr) {
      console.error(`[Gemini] Repair failed. Raw text: ${rawText}`);
      throw new Error(`Gemini returned invalid/truncated JSON: ${jsonText.slice(0, 100)}...`);
    }
  }

  return GeminiAnalysisResponseSchema.parse(parsed);
}

/**
 * Generates a conversation topic/scenario tailored to the user's top error patterns.
 */
export async function generateTopic(errorPatterns: Pick<ErrorPattern, 'pattern' | 'occurrences'>[]): Promise<GeneratedTopic> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
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
    generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
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
    model: GEMINI_MODEL,
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
    model: GEMINI_MODEL,
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
