
export interface Translation {
    id: number;
    source_language: string;
    target_language: string;
    original_text: string | null;
    translated_text: string | null;
    original_audio_path: string | null;
    translated_audio_path: string | null;
    processing_time: number | null;
    created_at: string;
    updated_at: string;
}

export interface TranslationResponse {
    success: boolean;
    translation: {
        id: number;
        original_text: string;
        translated_text: string;
        source_language: string;
        target_language: string;
        audio_url: string | null;
        streaming_url: string | null;
        processing_time: number;
        api_timings: {
            transcribe: number;
            translate: number;
            synthesize: number;
        };
        created_at: string;
    };
}

export interface TranslationRequest {
    audio: File;
    source_language?: string;
    target_language: string;
}

export type LanguageCode = 'auto' | 'en' | 'es' | 'fr';

export interface Language {
    code: LanguageCode;
    name: string;
}

export const LANGUAGES: Language[] = [
    { code: 'auto', name: 'Auto-detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
];

export const TARGET_LANGUAGES = LANGUAGES.filter((lang) => lang.code !== 'auto');
