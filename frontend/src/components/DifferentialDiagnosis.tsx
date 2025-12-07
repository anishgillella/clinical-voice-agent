'use client';

import { useState } from 'react';

interface Diagnosis {
    condition: string;
    probability: number;
    reasoning: string;
    keyFactors: string[];
    redFlags?: string[];
    recommendedTests?: string[];
}

interface Symptom {
    name: string;
    severity: number | null;
    duration: string | null;
    notes: string | null;
}

interface PatientData {
    name?: string | null;
    age?: number | null;
    gender?: string | null;
    symptoms: Symptom[];
    overall_severity: number | null;
    overall_duration: string | null;
    medications: string[];
}

interface DifferentialDiagnosisProps {
    patientData: PatientData;
}

export default function DifferentialDiagnosis({ patientData }: DifferentialDiagnosisProps) {
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [clinicalNotes, setClinicalNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [hasGenerated, setHasGenerated] = useState(false);

    const generateDiagnosis = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientData }),
            });

            if (!res.ok) {
                throw new Error('Failed to generate diagnosis');
            }

            const data = await res.json();
            setDiagnoses(data.diagnoses || []);
            setClinicalNotes(data.clinicalNotes || '');
            setHasGenerated(true);
        } catch (err) {
            setError('Failed to generate differential diagnosis. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getProbabilityColor = (prob: number) => {
        if (prob >= 60) return 'from-red-500 to-orange-500';
        if (prob >= 30) return 'from-yellow-500 to-amber-500';
        if (prob >= 15) return 'from-blue-500 to-cyan-500';
        return 'from-gray-400 to-gray-500';
    };

    const getProbabilityBg = (prob: number) => {
        if (prob >= 60) return 'bg-red-50 border-red-200';
        if (prob >= 30) return 'bg-yellow-50 border-yellow-200';
        if (prob >= 15) return 'bg-blue-50 border-blue-200';
        return 'bg-gray-50 border-gray-200';
    };

    // Check if we have enough data
    const hasEnoughData = patientData.symptoms.length > 0;

    if (!hasEnoughData) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-center text-gray-500">
                    <span className="text-3xl mb-2 block">🩺</span>
                    <p className="font-medium">Differential Diagnosis</p>
                    <p className="text-sm mt-1">Add symptoms to generate differential diagnoses</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🩺</span>
                        <div>
                            <h3 className="font-bold text-lg">Differential Diagnosis</h3>
                            <p className="text-purple-200 text-sm">AI-Powered Clinical Decision Support</p>
                        </div>
                    </div>
                    {!hasGenerated && (
                        <button
                            onClick={generateDiagnosis}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    ✨ Generate
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
                        ⚠️ {error}
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
                        <p className="text-gray-600 font-medium">Analyzing symptoms...</p>
                        <p className="text-gray-400 text-sm">Generating differential diagnoses with clinical reasoning</p>
                    </div>
                )}

                {!isLoading && !hasGenerated && (
                    <div className="text-center py-8 text-gray-500">
                        <p>Click "Generate" to create differential diagnoses</p>
                        <p className="text-sm mt-1">Based on current patient symptoms and demographics</p>
                    </div>
                )}

                {hasGenerated && diagnoses.length > 0 && (
                    <div className="space-y-4">
                        {diagnoses.map((diagnosis, index) => (
                            <div
                                key={index}
                                className={`border-2 rounded-xl overflow-hidden transition-all ${getProbabilityBg(diagnosis.probability)}`}
                            >
                                {/* Diagnosis Header */}
                                <button
                                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold text-gray-300">
                                            #{index + 1}
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-gray-800 text-lg">
                                                {diagnosis.condition}
                                            </h4>
                                            <p className="text-gray-500 text-sm line-clamp-1">
                                                {diagnosis.keyFactors?.slice(0, 2).join(' • ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Probability Bar */}
                                        <div className="w-32 hidden sm:block">
                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${getProbabilityColor(diagnosis.probability)} transition-all duration-500`}
                                                    style={{ width: `${diagnosis.probability}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full font-bold text-white bg-gradient-to-r ${getProbabilityColor(diagnosis.probability)}`}>
                                            {diagnosis.probability}%
                                        </div>
                                        <span className={`transform transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}>
                                            ▼
                                        </span>
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {expandedIndex === index && (
                                    <div className="px-4 pb-4 space-y-4 bg-white/50">
                                        {/* Clinical Reasoning */}
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                🧠 Clinical Reasoning
                                            </h5>
                                            <p className="text-gray-600 leading-relaxed">
                                                {diagnosis.reasoning}
                                            </p>
                                        </div>

                                        {/* Key Factors */}
                                        {diagnosis.keyFactors && diagnosis.keyFactors.length > 0 && (
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                                    ✓ Key Supporting Factors
                                                </h5>
                                                <ul className="space-y-1">
                                                    {diagnosis.keyFactors.map((factor, i) => (
                                                        <li key={i} className="text-blue-700 flex items-start gap-2">
                                                            <span className="text-blue-500">•</span>
                                                            {factor}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Red Flags */}
                                        {diagnosis.redFlags && diagnosis.redFlags.length > 0 && (
                                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                                <h5 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                                    ⚠️ Red Flags to Watch
                                                </h5>
                                                <ul className="space-y-1">
                                                    {diagnosis.redFlags.map((flag, i) => (
                                                        <li key={i} className="text-red-700 flex items-start gap-2">
                                                            <span className="text-red-500">!</span>
                                                            {flag}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Recommended Tests */}
                                        {diagnosis.recommendedTests && diagnosis.recommendedTests.length > 0 && (
                                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                                <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                                    🔬 Recommended Workup
                                                </h5>
                                                <ul className="space-y-1">
                                                    {diagnosis.recommendedTests.map((test, i) => (
                                                        <li key={i} className="text-green-700 flex items-start gap-2">
                                                            <span className="text-green-500">→</span>
                                                            {test}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Clinical Notes */}
                        {clinicalNotes && (
                            <div className="mt-4 bg-amber-50 rounded-lg p-4 border border-amber-200">
                                <h5 className="font-semibold text-amber-800 mb-2">📋 Additional Clinical Notes</h5>
                                <p className="text-amber-700">{clinicalNotes}</p>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="mt-4 bg-gray-100 rounded-lg p-4 text-center">
                            <p className="text-gray-500 text-sm">
                                ⚕️ <strong>Disclaimer:</strong> These suggestions are for clinical consideration only.
                                Not a substitute for professional medical judgment. Requires physician review and clinical correlation.
                            </p>
                        </div>

                        {/* Regenerate Button */}
                        <button
                            onClick={generateDiagnosis}
                            disabled={isLoading}
                            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            🔄 Regenerate Diagnosis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
