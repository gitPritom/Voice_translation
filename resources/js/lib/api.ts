
import type { Translation, TranslationRequest, TranslationResponse } from '@/types/translation';

export async function translateAudio(
    request: TranslationRequest,
): Promise<TranslationResponse> {
    const formData = new FormData();
    
    // Append the file - make sure it's actually a File object
    console.log('Appending audio file:', {
        isFile: request.audio instanceof File,
        name: request.audio.name,
        type: request.audio.type,
        size: request.audio.size,
    });
    
    formData.append('audio', request.audio, request.audio.name);
    formData.append('target_language', request.target_language);

    if (request.source_language && request.source_language !== 'auto') {
        formData.append('source_language', request.source_language);
    }

    // Get CSRF token from meta tag
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

    // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    const headers: HeadersInit = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    };

    if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
    }

    const response = await fetch('/translations', {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'same-origin',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Translation failed' }));

        throw new Error(error.error || 'Translation failed');
    }

    return response.json();
}

export async function getTranslations(): Promise<Translation[]> {
    const response = await fetch('/translations', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch translations');
    }

    const data = await response.json();

    return data.translations || [];
}

export function getTranslationAudioUrl(translationId: number): string {
    return `/translations/${translationId}/audio`;
}

export function getStreamingAudioUrl(text: string, language: string): string {
    const params = new URLSearchParams({ text, language });

    return `/tts/stream?${params.toString()}`;
}
