'use client';

import { useEffect, useRef } from 'react';

interface TranscriptEntry {
    role: 'patient' | 'agent';
    content: string;
}

interface LiveTranscriptProps {
    transcript: TranscriptEntry[];
    isConnected: boolean;
}

export default function LiveTranscript({ transcript, isConnected }: LiveTranscriptProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <h3 className="font-semibold">Live Conversation</h3>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                    {isConnected ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {/* Transcript */}
            <div
                ref={scrollRef}
                className="h-[300px] overflow-y-auto p-4 space-y-3 bg-gray-50"
            >
                {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <span className="text-4xl mb-2">🎙️</span>
                        <p className="text-sm">Waiting for conversation to start...</p>
                        <p className="text-xs mt-1">Click "Start Session" to begin</p>
                    </div>
                ) : (
                    transcript.map((entry, idx) => (
                        <div
                            key={idx}
                            className={`flex ${entry.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-2 rounded-2xl ${entry.role === 'patient'
                                        ? 'bg-blue-500 text-white rounded-br-md'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                                    }`}
                            >
                                <div className="text-xs opacity-70 mb-1">
                                    {entry.role === 'patient' ? '👤 You' : '🤖 Assistant'}
                                </div>
                                <p className="text-sm">{entry.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
