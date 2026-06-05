import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { PronunciationResult } from '@speaking-coach/shared';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import * as tmp from 'tmp-promise';

/**
 * Converts any audio buffer to WAV (PCM 16kHz mono) required by Azure.
 */
export async function convertToWav(inputBuffer: Buffer): Promise<Buffer> {
  const tmpIn = await tmp.file({ postfix: '.webm' });
  const tmpOut = await tmp.file({ postfix: '.wav' });

  try {
    await fs.writeFile(tmpIn.path, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpIn.path)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec('pcm_s16le')
        .format('wav')
        .output(tmpOut.path)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('[ffmpeg] Conversion error:', err);
          reject(err);
        })
        .run();
    });

    const wavBuffer = await fs.readFile(tmpOut.path);
    return wavBuffer;
  } finally {
    // Cleanup
    await tmpIn.cleanup();
    await tmpOut.cleanup();
  }
}

/**
 * Assesses pronunciation of an audio buffer using Azure AI Speech.
 * Uses Unscripted Mode (empty referenceText) for maximum objectivity and strictness.
 */
export async function assessPronunciation(
  audioBuffer: Buffer,
  referenceText: string = '' 
): Promise<PronunciationResult> {
  const key = process.env['AZURE_SPEECH_KEY'];
  const region = process.env['AZURE_SPEECH_REGION'];

  if (!key || !region) {
    throw new Error('Azure Speech credentials not configured');
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = 'en-US';

  // Pronunciation Assessment Config
  // Passing an empty string as the first argument enables "Unscripted Mode"
  const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
    '', 
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true // enableMiscue
  );
  pronunciationConfig.enableProsodyAssessment = true;

  // Audio stream from buffer
  const pushStream = sdk.AudioInputStream.createPushStream();
  pushStream.write(audioBuffer.buffer as ArrayBuffer);
  pushStream.close();

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  pronunciationConfig.applyTo(recognizer);

  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          const assessment = sdk.PronunciationAssessmentResult.fromResult(result);
          
          // Parse detailed JSON response for words and phonemes
          let words: PronunciationResult['words'] = [];
          try {
            const rawJson = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
            const parsedJson = JSON.parse(rawJson);
            const rawWords = parsedJson.NBest?.[0]?.Words ?? [];

            words = rawWords.map((w: any) => ({
              word: w.Word,
              accuracyScore: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
              errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
              phonemes: (w.Phonemes ?? []).map((p: any) => ({
                phoneme: p.Phoneme,
                accuracyScore: Math.round(p.PronunciationAssessment?.AccuracyScore ?? 0),
                isCorrect: (p.PronunciationAssessment?.AccuracyScore ?? 0) >= 60
              })),
              syllables: w.Syllables?.map((s: any) => s.Syllable) ?? []
            }));
          } catch (err) {
            console.error('[Azure] Failed to parse detailed results:', err);
          }

          resolve({
            pronunciationScore: Math.round(assessment.pronunciationScore),
            accuracyScore: Math.round(assessment.accuracyScore),
            fluencyScore: Math.round(assessment.fluencyScore),
            completenessScore: Math.round(assessment.completenessScore),
            words,
            transcript: result.text
          });
        } else if (result.reason === sdk.ResultReason.NoMatch) {
          reject(new Error('Azure Speech: No speech could be recognized.'));
        } else if (result.reason === sdk.ResultReason.Canceled) {
          const cancellation = sdk.CancellationDetails.fromResult(result);
          reject(new Error(`Azure Speech Canceled: ${cancellation.reason} ${cancellation.errorDetails}`));
        } else {
          reject(new Error(`Azure Speech failed: ${result.reason}`));
        }
        recognizer.close();
      },
      (err) => {
        recognizer.close();
        reject(new Error(`Azure Speech error: ${err}`));
      }
    );
  });
}
