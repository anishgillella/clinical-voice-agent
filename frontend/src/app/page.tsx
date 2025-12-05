'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';
import PatientForm from '@/components/PatientForm';
import ConnectionStatus from '@/components/ConnectionStatus';
import { PatientRecord, LockedFields, DataMessage } from '@/types/patient';

const initialRecord: PatientRecord = {
    name: null,
    age: null,
    symptoms: [],
    severity: null,
    duration: null,
    medications: [],
};

const initialLocked: LockedFields = {
    name: false,
    age: false,
    symptoms: false,
    severity: false,
    duration: false,
    medications: false,
};

export default function Home() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [record, setRecord] = useState<PatientRecord>(initialRecord);
    const [lockedFields, setLockedFields] = useState<LockedFields>(initialLocked);
    const [highlightedField, setHighlightedField] = useState<string | null>(null);
    const [sessionEnded, setSessionEnded] = useState(false);

    const roomRef = useRef<Room | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleConnect = useCallback(async () => {
        setStatus('connecting');

        try {
            // Get token from our API
            const res = await fetch('/api/token?room=intake-room&name=patient');
            const { token, url } = await res.json();

            // Create and connect to room
            const room = new Room({
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // Handle incoming audio
            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    const audioElement = track.attach();
                    document.body.appendChild(audioElement);
                    audioRef.current = audioElement;
                }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track) => {
                track.detach().forEach((el) => el.remove());
            });

            // Handle data messages from agent
            room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
                const decoder = new TextDecoder();
                const message: DataMessage = JSON.parse(decoder.decode(payload));

                if (message.type === 'UPDATE_RECORD') {
                    // Update only unlocked fields
                    setRecord((prev) => {
                        const updated = { ...prev };
                        const data = message.data;

                        // Check each field and only update if not locked
                        if (!lockedFields.name && data.name !== prev.name) {
                            updated.name = data.name;
                            triggerHighlight('name');
                        }
                        if (!lockedFields.age && data.age !== prev.age) {
                            updated.age = data.age;
                            triggerHighlight('age');
                        }
                        if (!lockedFields.symptoms && JSON.stringify(data.symptoms) !== JSON.stringify(prev.symptoms)) {
                            updated.symptoms = data.symptoms;
                            triggerHighlight('symptoms');
                        }
                        if (!lockedFields.severity && data.severity !== prev.severity) {
                            updated.severity = data.severity;
                            triggerHighlight('severity');
                        }
                        if (!lockedFields.duration && data.duration !== prev.duration) {
                            updated.duration = data.duration;
                            triggerHighlight('duration');
                        }
                        if (!lockedFields.medications && JSON.stringify(data.medications) !== JSON.stringify(prev.medications)) {
                            updated.medications = data.medications;
                            triggerHighlight('medications');
                        }

                        return updated;
                    });
                } else if (message.type === 'SESSION_END') {
                    setSessionEnded(true);
                }
            });

            room.on(RoomEvent.Disconnected, () => {
                setStatus('disconnected');
            });

            await room.connect(url, token);
            await room.localParticipant.setMicrophoneEnabled(true);

            roomRef.current = room;
            setStatus('connected');

        } catch (error) {
            console.error('Connection error:', error);
            setStatus('disconnected');
        }
    }, [lockedFields]);

    const handleDisconnect = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.remove();
            audioRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    const triggerHighlight = (field: string) => {
        setHighlightedField(field);
        setTimeout(() => setHighlightedField(null), 1000);
    };

    const handleFieldChange = useCallback((field: keyof PatientRecord, value: string | number | string[]) => {
        setRecord((prev) => ({ ...prev, [field]: value }));
        // Auto-lock field when user edits it
        setLockedFields((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleLockToggle = useCallback((field: keyof LockedFields) => {
        setLockedFields((prev) => ({ ...prev, [field]: !prev[field] }));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        🎤 AI Voice Intake
                    </h1>
                    <p className="text-gray-400">Medical Intake Agent - Real-Time Data Extraction</p>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Left Panel - Connection & Instructions */}
                    <div className="space-y-6">
                        {/* Connection Status Card */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-xl font-semibold text-white mb-4">Connection</h2>
                            <ConnectionStatus
                                status={status}
                                onConnect={handleConnect}
                                onDisconnect={handleDisconnect}
                            />
                        </div>

                        {/* Instructions Card */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-xl font-semibold text-white mb-4">📋 How it works</h2>
                            <ol className="space-y-3 text-gray-300">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">1</span>
                                    <span>Click "Start Interview" to connect to the AI agent</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">2</span>
                                    <span>Allow microphone access when prompted</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">3</span>
                                    <span>Speak naturally - the AI will extract your information</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">4</span>
                                    <span>Watch the form update in real-time!</span>
                                </li>
                            </ol>

                            <div className="mt-4 p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                                <p className="text-amber-200 text-sm">
                                    💡 <strong>Tip:</strong> Click the lock icon on any field to prevent AI from overwriting your manual edits.
                                </p>
                            </div>
                        </div>

                        {/* Audio Indicator */}
                        {status === 'connected' && (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex items-center justify-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-green-400">Agent is listening...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Patient Form */}
                    <div className="bg-white rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            📝 Patient Information
                            {sessionEnded && (
                                <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                                    Session Complete
                                </span>
                            )}
                        </h2>
                        <PatientForm
                            record={record}
                            lockedFields={lockedFields}
                            onFieldChange={handleFieldChange}
                            onLockToggle={handleLockToggle}
                            highlightedField={highlightedField}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
