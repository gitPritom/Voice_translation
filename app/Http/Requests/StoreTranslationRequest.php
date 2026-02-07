<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTranslationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'audio' => [
                'required',
                'file',
                'mimes:mp3,wav,webm,ogg,mpeg',
                'max:'.(30 * 1024), // 30MB max
            ],
            'source_language' => ['nullable', 'string', 'max:10'],
            'target_language' => ['required', 'string', 'max:10'],
        ];
    }

    /**
     * Get custom error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'audio.required' => 'Please record or upload an audio file.',
            'audio.mimes' => 'The audio file must be in MP3, WAV, WebM, or OGG format.',
            'audio.max' => 'The audio file must not be larger than 30MB.',
            'target_language.required' => 'Please select a target language.',
        ];
    }
}
