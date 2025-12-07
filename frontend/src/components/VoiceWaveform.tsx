'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceWaveformProps {
    isConnected: boolean;
    isListening: boolean;
}

export default function VoiceWaveform({ isConnected, isListening }: VoiceWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        let audioContext: AudioContext | null = null;
        let stream: MediaStream | null = null;

        const setupAudio = async () => {
            if (!isConnected) return;

            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();

                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;
                setHasPermission(true);

                // Start animation
                animate();
            } catch (err) {
                console.error('Microphone access denied:', err);
                setHasPermission(false);
            }
        };

        const animate = () => {
            if (!canvasRef.current || !analyserRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const analyser = analyserRef.current;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                animationRef.current = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                // Clear canvas
                ctx.fillStyle = 'rgba(249, 250, 251, 1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw bars
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

                    // Gradient color based on height
                    const hue = 220 + (barHeight / canvas.height) * 60; // Blue to purple
                    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

                    const y = (canvas.height - barHeight) / 2;
                    ctx.fillRect(x, y, barWidth - 1, barHeight);

                    x += barWidth;
                }
            };

            draw();
        };

        setupAudio();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (audioContext) {
                audioContext.close();
            }
        };
    }, [isConnected]);

    // Idle animation when not connected
    useEffect(() => {
        if (isConnected || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let phase = 0;
        const drawIdle = () => {
            animationRef.current = requestAnimationFrame(drawIdle);

            ctx.fillStyle = 'rgba(249, 250, 251, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barCount = 30;
            const barWidth = canvas.width / barCount;

            for (let i = 0; i < barCount; i++) {
                const height = Math.sin(phase + i * 0.3) * 10 + 15;
                ctx.fillStyle = '#CBD5E1'; // Gray when idle
                ctx.fillRect(
                    i * barWidth + 2,
                    (canvas.height - height) / 2,
                    barWidth - 4,
                    height
                );
            }
            phase += 0.05;
        };

        drawIdle();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isConnected]);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎙️</span>
                    <span className="font-semibold text-sm">Voice Input</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {isConnected ? (
                        <>
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span>Listening</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            <span>Standby</span>
                        </>
                    )}
                </div>
            </div>
            <div className="p-2">
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={60}
                    className="w-full h-[60px] rounded-lg bg-gray-50"
                />
            </div>
            {!hasPermission && isConnected && (
                <div className="px-4 py-2 bg-yellow-50 text-yellow-700 text-xs text-center">
                    ⚠️ Microphone access needed for visualization
                </div>
            )}
        </div>
    );
}
