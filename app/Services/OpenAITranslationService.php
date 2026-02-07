<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAITranslationService
{
    /**
     * Create a new class instance.
     */
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model = 'gpt-4o-mini',
    ) {}

    /**
     * Translate text using OpenAI GPT API.
     *
     * @param  string  $text  The text to translate
     * @param  string  $targetLanguage  Target language code (e.g., 'es', 'fr', 'de')
     * @return string The translated text
     *
     * @throws \Exception
     */
    public function translate(string $text, string $targetLanguage)
    {
        try {
            $languageNames = [
                'en' => 'English',
                'es' => 'Spanish',
                'fr' => 'French',
            ];

            $targetLanguageName = $languageNames[strtolower($targetLanguage)] ?? $targetLanguage;

            $response = Http::timeout(30)
                ->withHeaders([
                    "Authorization" => "Bearer {$this->apiKey}",
                    "Content-Type" => 'application/json',
                ])->post('https://api.openai.com/v1/chat/completions', [

                    'model' => $this->model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => "You are a professional translator. Translate the following text to {$targetLanguageName}. Only return the translation, no explanations or additional text.",
                        ],
                        [
                            'role' => 'user',
                            'content' => $text,
                        ],
                        [
                            'temperature' => 0.3,
                            'max_tokens' => 1000,
                        ],
                    ],
                ]);

            if ($response->failed()) {
                Log::error('OpenAI Translation API failed', [
                    'status' => $response->status(),
                    'body' =>  $response->body(),
                ]);
                throw new \Exception('Failed to translate text: ' . $response->json('error.message', 'Unknown error'));
            }

            $data = $response->json();
            $translatedText = $data['choices'][0]['message']['content'] ?? '';
            if (empty($translatedText)) {
                throw new \Exception('Translation returned empty result');
            }
            return trim($translatedText);
        } catch (\Exception $e) {
            Log::error('OpenAI Translation error', [
                'error' => $e->getMessage(),
            ]);

            throw new \Exception('Translation failed: ' . $e->getMessage(), 0, $e);
        }
    }
}
