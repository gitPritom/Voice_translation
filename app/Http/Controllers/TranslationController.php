<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTranslationRequest;
use App\Services\MurfFalconService;
use App\Services\OpenAITranslationService;
use App\Services\OpenAIWhisperService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

use function Illuminate\Support\microseconds;

class TranslationController extends Controller
{
    public function __construct(
        private readonly OpenAIWhisperService $whisperService,
        private readonly OpenAITranslationService $translationService,
        private readonly MurfFalconService $falconService,
    ) {}

    /**
     * Display the translation interface.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('welcome');
    }

    /**
     * Process audio and return translation with streaming URL.
     */
    public function store(StoreTranslationRequest $request)
    {
        $startTime = microtime(true);

        try {
            $audioFile = $request->input('audio');
            $sourceLanguage = $request->input('source_language');
            $targetLanguage = $request->input('target_language');

            //Step 1: Transcribe using Whisper
            $transcribeStartTime = microtime(true);
            $transcription = $this->whisperService->transcribe($audioFile, $sourceLanguage);
            $transcribeTime = (int) ((microtime(true) - $transcribeStartTime) *  1000);
            $originalText = $transcription['text'];
            $delectedLanguage = $transcription['language'] ?? $sourceLanguage ?? 'auto';

            if (empty($originalText)) {
                return response()->json([
                    'error' => 'Could not transcribe audio. Please ensure the audio is clear and contains speech.',
                ], 400);
            }

            // Step 2: Translate using GPT
            $translateStartTime = microtime(true);
            $translatedText = $this->translationService->translate($originalText, $targetLanguage);
            $translateTime = (int) ((microtime(true) - $translateStartTime) * 1000);

            // Step 3: Generate streaming URL for Murf Falcon TTS.  
            $streamingUrl = '/tts/stream?' . http_build_query([
                'text' => $translatedText,
                'language' => $targetLanguage,
            ]);
            // $synthesizeTime = 0; // TTS happens on-demand - TTFB tracked on frontend

            // Step 4: Calculate total processing time
            $processingTime = (int) ((microtime(true) - $startTime) * 1000);
            
            return response()->json([
                'success' => true,
                'translation' => [
                    'original_text' => $originalText,
                    'translated_text' => $translatedText,
                    'source_language' => $delectedLanguage,
                    'target_language' => $targetLanguage,
                    'streaming_url' => $streamingUrl,
                    'processing_time' => $processingTime,
                    'api_timings' => [
                        'transcribe' => $transcribeTime,
                        'translate' => $translateTime,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stream TTS audio directly from Falcon API.
     */

    public function streamTTS(Request $request) {
        $request->validate([
            'text' => 'required|string|max:5000',
            'language' => 'required|string|in:en,es,fr'
        ]);

        $text = $request->input('text');
        $language = $request->input('language');

        return $this->falconService->stream($text, $language);
    }
}
