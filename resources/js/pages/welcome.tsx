import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { translateAudio } from '@/lib/api';
import { LANGUAGES, TARGET_LANGUAGES, type TranslationResponse } from '@/types/translation';
import { Head } from '@inertiajs/react';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function Welcome() {

    const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
    const [targetLanguage, setTargetLanguage] = useState<string>('es');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTranslation, setCurrentTranslation] = useState<TranslationResponse['translation'] | null>(null);
    const [status, setStatus] = useState<string>('');
    const [streamingTTFB, setStreamingTTFB] = useState<number | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioLoadStartRef = useRef<number>(0);

    const {
        isRecording,
        isPaused,
        recordingTime,
        audioBlob,
        mimeType,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        resetRecording,
        error: recorderError,
    } = useAudioRecorder();

    const formatTime = useCallback((ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);

        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }, []);

    const handleTranslate = useCallback(async () => {
        if (!audioBlob) {
            setError('Please record audio first');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setStatus('Processing...');

        try {
            const detectedMimeType = mimeType || audioBlob.type || 'audio/webm';
            
            let filename = 'recording.webm';
            let fileMimeType = 'audio/webm';

            if (detectedMimeType.includes('webm')) {
                filename = 'recording.webm';
                fileMimeType = 'audio/webm';
            } else if (detectedMimeType.includes('mp4') || detectedMimeType.includes('m4a')) {
                filename = 'recording.mp4';
                fileMimeType = 'audio/mp4';
            } else if (detectedMimeType.includes('ogg')) {
                filename = 'recording.ogg';
                fileMimeType = 'audio/ogg';
            } else if (detectedMimeType.includes('wav')) {
                filename = 'recording.wav';
                fileMimeType = 'audio/wav';
            } else if (detectedMimeType.includes('mp3') || detectedMimeType.includes('mpeg')) {
                filename = 'recording.mp3';
                fileMimeType = 'audio/mpeg';
            }

            const audioFile = new File([audioBlob], filename, { type: fileMimeType });

            const response = await translateAudio({
                audio: audioFile,
                source_language: sourceLanguage === 'auto' ? undefined : sourceLanguage,
                target_language: targetLanguage,
            });

            setCurrentTranslation(response.translation);
            setStatus('Playing translation...');
            resetRecording();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Translation failed';
            setError(errorMessage);
            setStatus('');
        } finally {
            setIsProcessing(false);
        }
    }, [audioBlob, mimeType, sourceLanguage, targetLanguage, resetRecording]);

    useEffect(() => {
        if (recorderError) {
            setError(recorderError);
        }
    }, [recorderError]);

    const audioUrl = currentTranslation?.streaming_url;

    // Auto-play audio when translation is ready and track TTFB
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioLoadStartRef.current = performance.now();
            setStreamingTTFB(null);

            const audio = audioRef.current;

            const handleCanPlay = () => {
                const ttfb = Math.round(performance.now() - audioLoadStartRef.current);
                setStreamingTTFB(ttfb);
                console.log(`[Streaming] TTFB: ${ttfb}ms`);
            };

            audio.addEventListener('canplay', handleCanPlay, { once: true });

            audio.play().catch((err) => {
                console.error('Error playing audio:', err);
                setError('Failed to play audio');
            });

            return () => {
                audio.removeEventListener('canplay', handleCanPlay);
            };
        }
    }, [audioUrl]);

    // Auto-translate when recording stops
    useEffect(() => {
        if (audioBlob && !isRecording && !isProcessing && !currentTranslation) {
            const timer = setTimeout(() => {
                handleTranslate();
            }, 100);

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob, isRecording, isProcessing, currentTranslation]);

    const handleStartRecording = useCallback(() => {
        setCurrentTranslation(null);
        setError(null);
        setStatus('');
        setStreamingTTFB(null);
        startRecording();
    }, [startRecording]);

    const handleStopRecording = useCallback(() => {
        stopRecording();
        setStatus('Preparing...');
    }, [stopRecording]);

    return (
        <>
            <Head title="Live Voice Translation">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFDFC] p-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <main className="w-full max-w-2xl">
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Live Voice Translation</CardTitle>
                            <CardDescription>
                                Speak in one language and hear your words translated instantly
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-6">
                            {/* Language Selectors */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Source Language</label>
                                    <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LANGUAGES.map((lang) => (
                                                <SelectItem key={lang.code} value={lang.code}>
                                                    {lang.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Target Language</label>
                                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TARGET_LANGUAGES.map((lang) => (
                                                <SelectItem key={lang.code} value={lang.code}>
                                                    {lang.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Recording Controls */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-4">
                                    {!isRecording ? (
                                        <Button
                                            onClick={handleStartRecording}
                                            disabled={isProcessing}
                                            size="lg"
                                            className="gap-2"
                                        >
                                            <Mic className="size-5" />
                                            Start Recording
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={isPaused ? resumeRecording : pauseRecording}
                                                variant="outline"
                                                size="lg"
                                                className="gap-2"
                                            >
                                                {isPaused ? (
                                                    <>
                                                        <Play className="size-5" />
                                                        Resume
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pause className="size-5" />
                                                        Pause
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleStopRecording}
                                                variant="destructive"
                                                size="lg"
                                                className="gap-2"
                                            >
                                                <Square className="size-5" />
                                                Stop
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {isRecording && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 animate-pulse rounded-full bg-red-500" />
                                            <span className="text-sm font-medium">
                                                {isPaused ? 'Paused' : 'Recording...'}
                                    </span>
                                        </div>
                                        <span className="text-2xl font-mono">
                                            {formatTime(recordingTime)}
                                        </span>
                                    </div>
                                )}

                                {status && (
                                    <div className="text-sm text-muted-foreground">{status}</div>
                                )}

                                {error && <InputError message={error} />}
                        </div>

                            {/* Audio Player */}
                            {currentTranslation && audioUrl && (
                                <div className="flex flex-col gap-4 rounded-lg border p-4">
                                    <audio
                                        ref={audioRef}
                                        src={audioUrl}
                                        controls
                                        className="w-full"
                                        onEnded={() => setStatus('')}
                                    />
                                </div>
                            )}

                            {/* Text Display */}
                            {(currentTranslation || (audioBlob && !isRecording)) && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-2 rounded-lg border p-4">
                                        <h3 className="text-sm font-semibold">Original Text</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {currentTranslation?.original_text || 'Processing...'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 rounded-lg border p-4">
                                        <h3 className="text-sm font-semibold">Translated Text</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {currentTranslation?.translated_text || 'Processing...'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* API Timings */}
                            {currentTranslation?.api_timings && (
                                <div className="flex flex-col gap-2 rounded-lg border p-4">
                                    <h3 className="text-sm font-semibold">API Performance</h3>
                                    <div className="grid gap-2 md:grid-cols-3">
                                        <div className="flex flex-col gap-1 rounded bg-muted/50 p-2">
                                            <div className="text-xs font-medium text-muted-foreground">
                                                Speech-to-Text
                                            </div>
                                            <div className="text-sm font-mono font-semibold">
                                                {currentTranslation.api_timings.transcribe}ms
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 rounded bg-muted/50 p-2">
                                            <div className="text-xs font-medium text-muted-foreground">
                                                Translation
                                            </div>
                                            <div className="text-sm font-mono font-semibold">
                                                {currentTranslation.api_timings.translate}ms
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 rounded bg-muted/50 p-2">
                                            <div className="text-xs font-medium text-muted-foreground">
                                                Text-to-Speech (TTFB)
                                            </div>
                                            <div className="text-sm font-mono font-semibold">
                                                {streamingTTFB !== null ? `${streamingTTFB}ms` : 'streaming...'}
                                            </div>
                                        </div>
                                    </div>
                                    {currentTranslation.processing_time && (
                                        <div className="mt-2 text-center text-xs text-muted-foreground">
                                            Total: {currentTranslation.processing_time}ms
                                        </div>
                                    )}
                        </div>
                            )}
                        </CardContent>
                    </Card>
                    </main>
            </div>
        </>
    );
}