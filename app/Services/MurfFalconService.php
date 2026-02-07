<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MurfFalconService
{
    /**
     * Create a new class instance.
     */
    public function __construct(
        private readonly string $apiKey,
        private readonly string $apiUrl = 'https://api.murf.ai/v1',
    ) {
        $this->guzzleClient = new Client([
            'timeout' => 60,
            'connect_timeout' => 10,
        ]);
    }

    /**
     * Get the voice configuration for a given language.
     *
     * @return array{voiceId: string, locale: string}
     */
    private function getVoiceConfig(
        string $language
    ) {
        $defaultVoices = [
            'en' => 'en-US-matthew',
            'es' => 'es-ES-carla',
            'fr' => 'fr-FR-axel',
        ];

        $localeMap = [
            'en' => 'en-US',
            'es' => 'es-ES',
            'fr' => 'fr-FR',
        ];

        return [
            'voiceId' => $defaultVoices[strtolower($language)] ?? 'en-US-matthew',
            'locale' => $localeMap[strtolower(($language))] ?? 'en-US',
        ];
    }

    /**
     * Stream speech synthesis directly from Murf.ai Falcon API.
     * Returns a StreamedResponse that starts sending bytes immediately.
     *
     * @param  string  $text  The text to convert to speech
     * @param  string  $language  Language code (e.g., 'en', 'es', 'fr')
     * @param  string|null  $voiceId  Optional voice ID
     *
     * @throws \Exception
     */
    public function stream(
        string $text,
        string $language,
        ?string $voiceId = null
    ) {
        $config = $this->getVoiceConfig($language);
        $selectedVoice = $voiceId ?? $config['voiceId'];
        $locale = $config['locale'];

        return new StreamedResponse(function () use ($text, $selectedVoice, $locale) {
            try {
                $response = $this->guzzleClient->request('POST', "{$this->apiUrl}/speech/stream", [
                    'headers' => [
                        'api-key' => $this->apiKey,
                        "Content-Type" => 'application/json',
                    ],
                    'json' => [
                        'voiceId' => $selectedVoice,
                        'style' => 'Conversation',
                        'text' => $text,
                        'multiNativeLocale' => $locale,
                        'model' => 'FALCON',
                        'format' => "MP3",
                        'sampleRate' => 24000,
                        'channelType' => 'MONO',
                    ],
                    'stream' => true,
                ]);

                $body = $response->getBody();

                // --- OPTIONAL: To save the streamed audio to a file, uncomment below ---
                // use Illuminate\Support\Facades\Storage;
                // $audioContent = '';

                while (!$body->eof()) {
                    $chunk = $body->read(8192);
                    echo $chunk;

                    // --- OPTIONAL: Collect chunks to save to file ---
                    // $audioContent .= $chunk;

                    if (ob_get_level() > 0) {
                        ob_flush();
                    }

                    flush();
                }

                // --- OPTIONAL: Save collected audio to file ---
                // if (!empty($audioContent)) {
                //     $filename = 'translations/generated/' . uniqid('falcon_', true) . '.mp3';
                //     Storage::disk('public')->put($filename, $audioContent);
                //     Log::info('Saved streamed audio to: ' . $filename);
                // }

            } catch (GuzzleException $e) {
                Log::error('Murf.ai Falcon streaming error', [
                    'error' => $e->getMessage(),
                ]);

                throw new \Exception('Speech streaming failed: ' . $e->getMessage());
            }
        }, 200, [
            'Content-Type' => 'audio/mpeg',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
