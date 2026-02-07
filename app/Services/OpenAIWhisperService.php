<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIWhisperService
{
    /**
     * Create a new class instance.
     */
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model = 'whisper-1',
    ) {}

    /**
     * Transcribe audio using OpenAI Whisper API.
     *
     * @param  UploadedFile  $audioFile  The audio file to transcribe
     * @param  string|null  $language  Optional language code (e.g., 'en', 'es'). If null, auto-detect.
     * @return array{text: string, language?: string}
     *
     * @throws \Exception
     */
    public function transcribe(UploadedFile $audioFile, ?string $language = null)
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    "Authorization" => "Bearer {$this->apiKey}",
                ])
                ->attach('file', file_get_contents($audioFile->getRealPath()), $audioFile->getClientOriginalName())
                ->attach('model', $this->model)
                ->when($language !== null, function ($request) use ($language) {
                    return $request->attach('language', $language);
                })
                ->post('https://api.openai.com/v1/audio/transcriptions');

            if ($response->failed()) {
                Log::error('OpneAI whisper API failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                throw new \Exception('Failed to transcribe audio: ' . $response->json('error.message', 'Unknown error'));
            }

            $data = $response->json();
            return [
                'text' => $data['text'] ?? '',
                'language' => $data['language'] ?? null,
            ];
        } catch (\Exception $e) {
            Log::error('OpenAI Whisper transcription error', [
                'error' => $e->getMessage(),
            ]);
            throw new \Exception('Transcription failed: ' . $e->getMessage(), 0, $e);
        }
    }
}
