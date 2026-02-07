<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\TranslationController;


// Home page with translation (public)
Route::get('/', [TranslationController::class, 'index'])->name('home');
Route::post('translations', [TranslationController::class, 'store'])->name('translations.store');
Route::get('tts/stream', [TranslationController::class, 'streamTTS'])->name('tts.stream');


Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

require __DIR__ . '/settings.php';
