import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
import { GeminiAnalysisResponseSchema, SessionStartResponseSchema } from '@speaking-coach/shared';
import type { GeminiAnalysisResponse, GeneratedTopic, ErrorPattern, ReadingPassage } from '@speaking-coach/shared';
import { SCENARIOS } from '@speaking-coach/shared';

const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] ?? '');
const GEMINI_MODEL = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash-lite';

const ANALYSIS_SYSTEM_INSTRUCTION = `You are an expert English speaking coach, linguist, and examiner. You are working with a Russian-speaking learner.

The user will send you an audio recording. Analyze it with extreme precision.

TRANSCRIPT RULE: Transcribe verbatim. If the user mispronounces a word, write what was actually heard — use phonetic approximation in square brackets if the distortion is severe, like [goot] instead of "good". Do NOT silently correct anything in the transcript field.

Return a single JSON object with this exact structure:

{
  "transcript": "Verbatim transcript. Phonetic distortions in [brackets]. Do NOT fix errors here.",
  "wordsPerMinute": <number>,
  "pauseCount": <number>,
  "confidenceLevel": <1–5, where 1 = hesitant/broken, 3 = functional but accented, 5 = near-native>,
  "errors": [
    {
      "original": "exactly what the user said",
      "corrected": "standard English version",
      "explanation": "Объяснение на русском. Для произношения — опишите конкретно: положение языка, зубов, участие голосовых связок. Для грамматики — назовите правило и почему русский мозг делает эту ошибку.",
      "category": "grammar | vocabulary | pronunciation",
      "pattern": "Specific error pattern name, like: H-dropping, TH-fronting, Vowel reduction, Article omission, False friend"
    }
  ],
  "dialogueReply": "Natural English reply (2–4 sentences). Acknowledge what the user said. End with a question. Be warm but rigorous — do not pretend errors didn't happen.",
  "grammarTip": "One specific phonetic or linguistic insight in English, directly tied to something in this recording.",
  "topicFeedback": "Краткая обратная связь на русском: насколько понятна речь, раскрыта ли тема, что улучшить в содержании."
}

RULES:
1. Errors array: max 5 items. Rank by impact on comprehension — pronunciation errors that cause misunderstanding outrank minor grammar slips.
2. If the user says "my English is very well" — always include this as a grammar error: "very well" (adverb) is wrong here, "very good" (adjective) is correct.
3. pattern field must be a specific, named linguistic phenomenon — not a paraphrase of the explanation.
4. Never skip pronunciation errors. Russian speakers systematically struggle with: word-final voiced consonants, /w/ vs /v/, /θ/ and /ð/, vowel length, and sentence stress. If any of these appear, flag them.
5. The transcript field is sacred — it reflects reality, not intention.`;

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
 * Helper to generate content and parse JSON with repair mechanism.
 */
async function generateJsonResponse<T>(
  model: any,
  prompt: string,
  generationConfig: any = { temperature: 0.7, maxOutputTokens: 2048 }
): Promise<T> {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  });

  const rawText = result.response.text();
  let jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.warn(`[Gemini] Initial JSON parse failed, attempting repair...`);
    try {
      jsonText = tryRepairJson(jsonText);
      return JSON.parse(jsonText);
    } catch (repairErr) {
      console.error(`[Gemini] JSON repair failed. Raw text: ${rawText}`);
      throw new Error(`Gemini returned invalid/truncated JSON: ${jsonText.slice(0, 100)}...`);
    }
  }
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

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [audioPart, textPart] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });

    const rawText = result.response.text();
    let jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      jsonText = tryRepairJson(jsonText);
      parsed = JSON.parse(jsonText);
    }

    return GeminiAnalysisResponseSchema.parse(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generates a conversation topic/scenario tailored to the user's top error patterns.
 */
export async function generateTopic(errorPatterns: Pick<ErrorPattern, 'pattern' | 'occurrences'>[]): Promise<GeneratedTopic> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: 'You are an English speaking coach. Respond ONLY with valid JSON.',
  });

  const topPatterns = errorPatterns
    .slice(0, 3)
    .map((e, i) => `${i + 1}. ${e.pattern} (${e.occurrences}x)`)
    .join('\n');

  const scenarioList = SCENARIOS.join(', ');

const prompt = `You are generating a speaking practice scenario for a Russian-speaking English learner.

LEARNER'S CURRENT ERROR PATTERNS:
${topPatterns || 'No recorded errors yet — treat as beginner-intermediate (B1).'}

AVAILABLE SCENARIO TYPES:
${scenarioList}

YOUR TASK:
Choose a scenario type and topic that will naturally provoke the learner to use the structures they struggle with most. If error patterns are listed, pick a scenario where those patterns are likely to surface — not one that avoids them.

DIFFICULTY SELECTION GUIDE:
- B1: short answers acceptable, simple tenses, everyday vocabulary
- B2: requires opinions, conditionals, some abstract reasoning  
- C1: nuanced discussion, complex grammar expected, abstract or professional topics
Base difficulty on the error patterns above. Severe basic errors → B1. Intermediate mistakes → B2. Near-native slips → C1.

OPENING LINE RULES:
- Write it as the other character speaking first — not a narrator describing the scene
- It must be a natural spoken sentence that immediately requires the learner to respond
- Length: one to two sentences maximum
- Tone must match the scenario type (professional, casual, academic, etc.)

Return a single JSON object:
{
  "topic": "Specific topic title (3–6 words)",
  "scenario": "Must be one of the available scenario types, copied exactly",
  "openingLine": "The first thing the other character says to the learner",
  "difficulty": "B1 | B2 | C1",
  "targetPatterns": ["error pattern 1", "error pattern 2"]
}

targetPatterns: list the 1–2 error patterns from the learner's history that this scenario is designed to surface. If no history exists, leave as empty array.`;

  const parsed = await generateJsonResponse<any>(model, prompt, { temperature: 0.9, maxOutputTokens: 1024 });
  
  // Manual safety injection in case of truncation
  if (parsed && typeof parsed === 'object') {
    if (!parsed.difficulty) parsed.difficulty = 'B2';
    if (!parsed.scenario) parsed.scenario = 'debate';
    if (!parsed.openingLine) parsed.openingLine = 'Hello! Ready to start?';
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
    systemInstruction: 'You are an IELTS generator. Respond ONLY with valid JSON.',
  });

  const topPatterns = errorPatterns
    .slice(0, 3)
    .map((e, i) => `${i + 1}. ${e.pattern} (${e.occurrences}x)`)
    .join('\n');

  const prompt = `Generate an academic reading passage (${difficulty}) with 8 questions (JSON).
User's recent error patterns: ${topPatterns || 'None'}

Passage must be 800-1000 words. All explanations in Russian.
JSON structure: { "passage": "...", "topic": "...", "difficulty": "${difficulty}", "questions": [...] }`;

  const parsed = await generateJsonResponse<any>(model, prompt, { temperature: 0.7, maxOutputTokens: 8192 });

  // Manual safety injection
  if (parsed && typeof parsed === 'object') {
    if (!parsed.passage) parsed.passage = 'No passage generated.';
    if (!parsed.topic) parsed.topic = 'Topic not specified.';
    if (!parsed.difficulty) parsed.difficulty = difficulty;
    if (!parsed.questions || !Array.isArray(parsed.questions)) parsed.questions = [];
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
    systemInstruction: 'You are an English examiner. Respond ONLY with valid JSON.',
  });

  const prompt = `Evaluate the student's answer (JSON):
Question: ${question}
Reference: ${referenceAnswer}
Student: ${userAnswer}

JSON: { "isCorrect": boolean, "score": 0-2, "aiExplanation": "..." }`;

  const parsed = await generateJsonResponse<any>(model, prompt, { temperature: 0.3, maxOutputTokens: 1024 });

  // Manual safety injection
  if (parsed && typeof parsed === 'object') {
    if (parsed.isCorrect === undefined) parsed.isCorrect = false;
    if (parsed.score === undefined) parsed.score = 0;
    if (!parsed.aiExplanation) parsed.aiExplanation = 'No explanation provided.';
  }

  return parsed;
}
