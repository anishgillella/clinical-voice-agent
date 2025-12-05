'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Edit, Save, Download, ArrowLeft } from 'lucide-react';

interface ClinicianSummaryProps {
    summary: string;
    patientName: string;
    onBack: () => void;
    onSave?: (editedSummary: string) => void;
}

export default function ClinicianSummary({
    summary,
    patientName,
    onBack,
    onSave,
}: ClinicianSummaryProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSummary, setEditedSummary] = useState(summary);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsEditing(false);
        setIsSaved(true);
        onSave?.(editedSummary);

        // Reset saved indicator after 2 seconds
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
            <div className="max-w-4xl mx-auto">
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
                            <span className="text-green-600 text-sm animate-pulse">
                                ✓ Saved
                            </span>
                        )}

                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Summary
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

                {/* Summary Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Title Bar */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-white" />
                        <h1 className="text-xl font-semibold text-white">
                            Clinical Summary - {patientName || 'Patient'}
                        </h1>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isEditing ? (
                            <textarea
                                value={editedSummary}
                                onChange={(e) => setEditedSummary(e.target.value)}
                                className="w-full h-[600px] p-4 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                                            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">
                                                {children}
                                            </h3>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="text-gray-900">{children}</strong>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {children}
                                            </ul>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700">
                                                {children}
                                            </ol>
                                        ),
                                        p: ({ children }) => (
                                            <p className="text-gray-700 leading-relaxed">{children}</p>
                                        ),
                                        hr: () => (
                                            <hr className="my-6 border-gray-200" />
                                        ),
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

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500 text-center">
                            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                            {' • '}
                            <span className="text-amber-600">Requires physician review before clinical use</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
