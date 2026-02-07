
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    audioBlob: Blob | null;
    mimeType: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    resetRecording: () => void;
    error: string | null;
}

const MAX_RECORDING_TIME = 30000; // 30 seconds in milliseconds

export function useAudioRecorder(): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const resetRecording = useCallback(() => {
        setAudioBlob(null);
        setMimeType(null);
        setRecordingTime(0);
        setError(null);
        audioChunksRef.current = [];
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        startTimeRef.current = Date.now();

        timerRef.current = window.setInterval(() => {
            if (startTimeRef.current) {
                const elapsed = Date.now() - startTimeRef.current;

                if (elapsed >= MAX_RECORDING_TIME) {
                    stopRecording();
                } else {
                    setRecordingTime(elapsed);
                }
            }
        }, 100);
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        stopTimer();
        setIsRecording(false);
        setIsPaused(false);
        startTimeRef.current = null;
    }, [stopTimer]);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            resetRecording();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : MediaRecorder.isTypeSupported('audio/mp4')
                  ? 'audio/mp4'
                  : 'audio/ogg';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                setMimeType(mimeType);
            };

            mediaRecorder.onerror = (event) => {
                setError('Recording error occurred');
                console.error('MediaRecorder error:', event);
            };

            mediaRecorder.start();
            setIsRecording(true);
            startTimer();
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to access microphone. Please check your permissions.';

            setError(errorMessage);
            console.error('Error starting recording:', err);
        }
    }, [resetRecording, startTimer]);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            stopTimer();
        }
    }, [stopTimer]);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            startTimer();
        }
    }, [startTimer]);

    useEffect(() => {
        return () => {
            stopRecording();
            stopTimer();
        };
    }, [stopRecording, stopTimer]);

    return {
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
        error,
    };
}
