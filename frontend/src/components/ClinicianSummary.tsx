'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Edit, Save, Download, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface Diagnosis {
    condition: string;
    probability: number;
    reasoning: string;
    keyFactors?: string[];
    redFlags?: string[];
    recommendedTests?: string[];
}

interface Urgency {
    level: 'routine' | 'soon' | 'urgent' | 'emergent';
    reasoning: string;
    timeframe: string;
}

interface ClinicianSummaryProps {
    summary: string;
    patientName: string;
    onBack: () => void;
    onSave?: (editedSummary: string) => void;
    urgency?: Urgency;
    differentialDiagnoses?: Diagnosis[];
    clinicalNotes?: string;
}

export default function ClinicianSummary({
    summary,
    patientName,
    onBack,
    onSave,
    urgency,
    differentialDiagnoses,
    clinicalNotes,
}: ClinicianSummaryProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSummary, setEditedSummary] = useState(summary);
    const [isSaved, setIsSaved] = useState(false);
    const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(0);

    const handleSave = () => {
        setIsEditing(false);
        setIsSaved(true);
        onSave?.(editedSummary);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([editedSummary], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${patientName.replace(/\s+/g, '_')}_intake_summary.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getUrgencyConfig = (level: string) => {
        const configs = {
            routine: {
                bg: 'bg-green-100',
                border: 'border-green-300',
                text: 'text-green-800',
                icon: '🟢',
                label: 'Routine'
            },
            soon: {
                bg: 'bg-yellow-100',
                border: 'border-yellow-300',
                text: 'text-yellow-800',
                icon: '🟡',
                label: 'Soon'
            },
            urgent: {
                bg: 'bg-orange-100',
                border: 'border-orange-300',
                text: 'text-orange-800',
                icon: '🟠',
                label: 'Urgent'
            },
            emergent: {
                bg: 'bg-red-100',
                border: 'border-red-300',
                text: 'text-red-800',
                icon: '🔴',
                label: 'Emergent'
            }
        };
        return configs[level as keyof typeof configs] || configs.routine;
    };

    const getProbabilityColor = (prob: number) => {
        if (prob >= 50) return 'from-red-500 to-orange-500';
        if (prob >= 25) return 'from-yellow-500 to-amber-500';
        return 'from-blue-500 to-cyan-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Intake
                    </button>

                    <div className="flex items-center gap-3">
                        {isSaved && (
                            <span className="text-green-600 text-sm animate-pulse">✓ Saved</span>
                        )}
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - SOAP Note */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Urgency Banner */}
                        {urgency && (
                            <div className={`${getUrgencyConfig(urgency.level).bg} ${getUrgencyConfig(urgency.level).border} border-2 rounded-xl p-4`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getUrgencyConfig(urgency.level).icon}</span>
                                        <div>
                                            <div className={`font-bold text-xl ${getUrgencyConfig(urgency.level).text}`}>
                                                {getUrgencyConfig(urgency.level).label} Priority
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {urgency.timeframe}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-gray-700">{urgency.reasoning}</p>
                            </div>
                        )}

                        {/* SOAP Note Card */}
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-white" />
                                <h1 className="text-xl font-semibold text-white">
                                    Clinical Summary - {patientName || 'Patient'}
                                </h1>
                            </div>

                            <div className="p-6">
                                {isEditing ? (
                                    <textarea
                                        value={editedSummary}
                                        onChange={(e) => setEditedSummary(e.target.value)}
                                        className="w-full h-[500px] p-4 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Edit the clinical summary..."
                                    />
                                ) : (
                                    <div className="prose prose-blue max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                h2: ({ children }) => (
                                                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mt-6 mb-3">
                                                        {children}
                                                    </h2>
                                                ),
                                                h3: ({ children }) => (
                                                    <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">{children}</h3>
                                                ),
                                                strong: ({ children }) => (
                                                    <strong className="text-gray-900">{children}</strong>
                                                ),
                                                ul: ({ children }) => (
                                                    <ul className="list-disc list-inside space-y-1 text-gray-700">{children}</ul>
                                                ),
                                                ol: ({ children }) => (
                                                    <ol className="list-decimal list-inside space-y-1 text-gray-700">{children}</ol>
                                                ),
                                                p: ({ children }) => (
                                                    <p className="text-gray-700 leading-relaxed">{children}</p>
                                                ),
                                                hr: () => <hr className="my-6 border-gray-200" />,
                                                em: ({ children }) => (
                                                    <em className="text-gray-500 text-sm">{children}</em>
                                                ),
                                            }}
                                        >
                                            {editedSummary}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Clinical Notes */}
                        {clinicalNotes && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <h3 className="font-semibold text-amber-800 mb-2">📋 Additional Clinical Notes</h3>
                                <p className="text-amber-700">{clinicalNotes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Differential Diagnoses */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    🩺 Differential Diagnoses
                                </h2>
                            </div>

                            <div className="p-4 space-y-3">
                                {differentialDiagnoses && differentialDiagnoses.length > 0 ? (
                                    differentialDiagnoses.map((diagnosis, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 rounded-xl overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setExpandedDiagnosis(expandedDiagnosis === index ? null : index)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-gray-300">#{index + 1}</span>
                                                    <div className="text-left">
                                                        <h4 className="font-semibold text-gray-800">{diagnosis.condition}</h4>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getProbabilityColor(diagnosis.probability)}`}>
                                                        {diagnosis.probability}%
                                                    </div>
                                                    {expandedDiagnosis === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </div>
                                            </button>

                                            {expandedDiagnosis === index && (
                                                <div className="px-4 pb-4 space-y-3 bg-gray-50">
                                                    {/* Reasoning */}
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <h5 className="text-sm font-semibold text-gray-600 mb-1">🧠 Reasoning</h5>
                                                        <p className="text-sm text-gray-700">{diagnosis.reasoning}</p>
                                                    </div>

                                                    {/* Key Factors */}
                                                    {diagnosis.keyFactors && diagnosis.keyFactors.length > 0 && (
                                                        <div className="bg-blue-50 rounded-lg p-3">
                                                            <h5 className="text-sm font-semibold text-blue-700 mb-1">✓ Key Factors</h5>
                                                            <ul className="text-sm text-blue-600 space-y-1">
                                                                {diagnosis.keyFactors.map((f, i) => (
                                                                    <li key={i}>• {f}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Red Flags */}
                                                    {diagnosis.redFlags && diagnosis.redFlags.length > 0 && (
                                                        <div className="bg-red-50 rounded-lg p-3">
                                                            <h5 className="text-sm font-semibold text-red-700 mb-1">⚠️ Red Flags</h5>
                                                            <ul className="text-sm text-red-600 space-y-1">
                                                                {diagnosis.redFlags.map((f, i) => (
                                                                    <li key={i}>! {f}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Recommended Tests */}
                                                    {diagnosis.recommendedTests && diagnosis.recommendedTests.length > 0 && (
                                                        <div className="bg-green-50 rounded-lg p-3">
                                                            <h5 className="text-sm font-semibold text-green-700 mb-1">🔬 Workup</h5>
                                                            <ul className="text-sm text-green-600 space-y-1">
                                                                {diagnosis.recommendedTests.map((t, i) => (
                                                                    <li key={i}>→ {t}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No differential diagnoses available</p>
                                )}
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-gray-100 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500">
                                ⚕️ <strong>Disclaimer:</strong> AI-generated suggestions for clinical consideration only.
                                Requires physician review.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    {' • '}
                    <span className="text-amber-600">Requires physician review before clinical use</span>
                </div>
            </div>
        </div>
    );
}
