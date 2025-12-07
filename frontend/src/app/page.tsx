'use client';

import { useState, useCallback, useRef } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import PatientForm from '@/components/PatientForm';
import ConnectionStatus from '@/components/ConnectionStatus';
import ClinicianSummary from '@/components/ClinicianSummary';
import { PatientRecord, LockedFields, DataMessage, Symptom, TranscriptEntry } from '@/types/patient';

const initialRecord: PatientRecord = {
    name: null,
    age: null,
    gender: null,
    symptoms: [],
    overall_severity: null,
    overall_duration: null,
    medications: [],
};

const initialLocked: LockedFields = {
    name: false,
    age: false,
    gender: false,
    symptoms: false,
    severity: false,
    duration: false,
    medications: false,
};

type ViewMode = 'intake' | 'summary';

export default function Home() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [record, setRecord] = useState<PatientRecord>(initialRecord);
    const [lockedFields, setLockedFields] = useState<LockedFields>(initialLocked);
    const [highlightedField, setHighlightedField] = useState<string | null>(null);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('intake');
    const [summary, setSummary] = useState<string>('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const roomRef = useRef<Room | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lockedFieldsRef = useRef(lockedFields);
    const transcriptRef = useRef<TranscriptEntry[]>([]);

    // Keep ref in sync with state
    lockedFieldsRef.current = lockedFields;

    const handleConnect = useCallback(async () => {
        setStatus('connecting');

        try {
            const res = await fetch('/api/token?room=intake-room&name=patient');
            const { token, url } = await res.json();

            const room = new Room({
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            room.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === 'audio') {
                    const audioElement = track.attach();
                    document.body.appendChild(audioElement);
                    audioRef.current = audioElement;
                }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track) => {
                track.detach().forEach((el) => el.remove());
            });

            room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
                const decoder = new TextDecoder();
                const message: DataMessage = JSON.parse(decoder.decode(payload));

                if (message.type === 'UPDATE_RECORD') {
                    setRecord((prev) => {
                        const updated = { ...prev };
                        const data = message.data;
                        const locked = lockedFieldsRef.current;

                        if (!locked.name && data.name !== prev.name) {
                            updated.name = data.name;
                            triggerHighlight('name');
                        }
                        if (!locked.age && data.age !== prev.age) {
                            updated.age = data.age;
                            triggerHighlight('age');
                        }
                        if (!locked.gender && data.gender !== prev.gender) {
                            updated.gender = data.gender;
                            triggerHighlight('gender');
                        }
                        if (!locked.symptoms && JSON.stringify(data.symptoms) !== JSON.stringify(prev.symptoms)) {
                            updated.symptoms = data.symptoms;
                            triggerHighlight('symptoms');
                        }
                        if (!locked.severity && data.overall_severity !== prev.overall_severity) {
                            updated.overall_severity = data.overall_severity;
                            triggerHighlight('severity');
                        }
                        if (!locked.duration && data.overall_duration !== prev.overall_duration) {
                            updated.overall_duration = data.overall_duration;
                            triggerHighlight('duration');
                        }
                        if (!locked.medications && JSON.stringify(data.medications) !== JSON.stringify(prev.medications)) {
                            updated.medications = data.medications;
                            triggerHighlight('medications');
                        }

                        return updated;
                    });

                    // Store transcript if provided
                    if (message.transcript) {
                        transcriptRef.current = message.transcript;
                    }
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
    }, []);

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

    const handleFieldChange = useCallback((field: keyof PatientRecord, value: string | number | Symptom[] | string[] | null) => {
        setRecord((prev) => ({ ...prev, [field]: value }));
        setLockedFields((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleLockToggle = useCallback((field: keyof LockedFields) => {
        setLockedFields((prev) => ({ ...prev, [field]: !prev[field] }));
    }, []);

    const handleGenerateSummary = useCallback(async () => {
        setIsGeneratingSummary(true);

        // End the session first - disconnect from voice agent
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.remove();
            audioRef.current = null;
        }
        setStatus('disconnected');
        setSessionEnded(true);

        try {
            const res = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientData: record,
                    transcript: transcriptRef.current
                }),
            });

            const data = await res.json();
            setSummary(data.summary);
            setViewMode('summary');
        } catch (error) {
            console.error('Summary generation error:', error);
            // Generate a quick local summary as fallback
            setSummary(generateQuickSummary(record));
            setViewMode('summary');
        } finally {
            setIsGeneratingSummary(false);
        }
    }, [record]);

    const handleBackToIntake = useCallback(() => {
        setViewMode('intake');
    }, []);

    // Render Clinician Summary view
    if (viewMode === 'summary') {
        return (
            <ClinicianSummary
                summary={summary}
                patientName={record.name || 'Patient'}
                onBack={handleBackToIntake}
                onSave={(edited) => setSummary(edited)}
            />
        );
    }

    // Render Intake view
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
                    {/* Left Panel */}
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
                                    <span>Click &quot;Start Interview&quot; to connect to the AI agent</span>
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
                                    <span>Click &quot;Generate Summary&quot; when finished</span>
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

                        {/* Generate Summary Button */}
                        {(sessionEnded || record.name) && (
                            <button
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating Summary...
                                    </>
                                ) : (
                                    <>
                                        📄 Generate Clinician Summary
                                    </>
                                )}
                            </button>
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

function generateQuickSummary(record: PatientRecord): string {
    const symptomList = record.symptoms.map(s =>
        s.severity !== null ? `${s.name} (${s.severity}/10)` : s.name
    );
    const chiefComplaint = record.symptoms.length > 0 ? record.symptoms[0].name : 'Not specified';

    return `## Patient Information
- **Name:** ${record.name || 'Unknown'}
- **Age:** ${record.age || 'Unknown'}
- **Gender:** ${record.gender || 'Not specified'}

## Chief Complaint
${chiefComplaint}

## Subjective
Patient reports ${symptomList.length > 0 ? symptomList.join(', ') : 'unspecified symptoms'}.
Overall Severity: ${record.overall_severity || 'Not reported'}/10.
Duration: ${record.overall_duration || 'Not reported'}.

## Objective
- Symptoms: ${symptomList.join(', ') || 'None reported'}
- Overall Severity: ${record.overall_severity || 'Not reported'}/10
- Medications: ${record.medications?.join(', ') || 'None reported'}

## Assessment
Patient presents for evaluation. Further assessment by physician recommended.

## Plan
1. Physician review of intake data
2. Additional evaluation as needed
3. Follow up as clinically indicated

---
*Auto-generated summary - requires physician review*`;
}
