<?php

namespace App\Providers;

use App\Services\MurfFalconService;
use App\Services\OpenAITranslationService;
use App\Services\OpenAIWhisperService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(OpenAIWhisperService::class, function ($app) {
            return new OpenAIWhisperService(
                apiKey: config('services.openai.api_key'),
                model: config('services.openai.model_whisper', 'whisper-1'),
            );
        });

        $this->app->singleton(OpenAITranslationService::class, function ($app) {
            return new OpenAITranslationService(
                apiKey: config('services.openai.api_key'),
                model: config('services.openai.model_translation', 'gpt-4o-min'),
            );
        });

        $this->app->singleton(MurfFalconService::class, function ($app) {
            return new MurfFalconService(
                apiKey: config('services.murf.api_key'),
                apiUrl: config('services.murf.api_url', 'https://global.api.murf.ai/v1'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn(): ?Password => app()->isProduction()
                ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
                : null
        );
    }
}
