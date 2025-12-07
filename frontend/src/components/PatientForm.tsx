'use client';

import { useState } from 'react';
import { PatientRecord, LockedFields, Symptom } from '@/types/patient';
import { Lock, Unlock, X, Plus } from 'lucide-react';

interface PatientFormProps {
    record: PatientRecord;
    lockedFields: LockedFields;
    onFieldChange: (field: keyof PatientRecord, value: string | number | Symptom[] | string[] | null) => void;
    onLockToggle: (field: keyof LockedFields) => void;
    highlightedField: string | null;
}

export default function PatientForm({
    record,
    lockedFields,
    onFieldChange,
    onLockToggle,
    highlightedField,
}: PatientFormProps) {
    const [newMedication, setNewMedication] = useState('');

    const getHighlightClass = (field: string) => {
        if (highlightedField === field) {
            return 'ring-2 ring-green-400 bg-green-50 transition-all duration-300';
        }
        return '';
    };

    const getLockIcon = (field: keyof LockedFields) => {
        return lockedFields[field] ? (
            <Lock className="w-4 h-4 text-amber-500" />
        ) : (
            <Unlock className="w-4 h-4 text-gray-400" />
        );
    };

    const getSeverityColor = (severity: number | null) => {
        if (severity === null) return 'bg-gray-100 text-gray-500';
        if (severity <= 3) return 'bg-green-100 text-green-700';
        if (severity <= 6) return 'bg-yellow-100 text-yellow-700';
        return 'bg-red-100 text-red-700';
    };

    const handleAddMedication = () => {
        if (newMedication.trim() && !record.medications.includes(newMedication.trim())) {
            onFieldChange('medications', [...record.medications, newMedication.trim()]);
            setNewMedication('');
        }
    };

    const handleRemoveMedication = (index: number) => {
        const updated = record.medications.filter((_, i) => i !== index);
        onFieldChange('medications', updated);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddMedication();
        }
    };

    return (
        <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Patient Name</label>
                    <button
                        onClick={() => onLockToggle('name')}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={lockedFields.name ? 'Unlock field' : 'Lock field'}
                    >
                        {getLockIcon('name')}
                    </button>
                </div>
                <input
                    type="text"
                    value={record.name || ''}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${getHighlightClass('name')} ${lockedFields.name ? 'bg-amber-50 border-amber-200' : ''}`}
                    placeholder="Enter patient name..."
                />
            </div>

            {/* Age */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Age</label>
                    <button
                        onClick={() => onLockToggle('age')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('age')}
                    </button>
                </div>
                <input
                    type="number"
                    value={record.age || ''}
                    onChange={(e) => onFieldChange('age', parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${getHighlightClass('age')} ${lockedFields.age ? 'bg-amber-50 border-amber-200' : ''}`}
                    placeholder="Enter age..."
                />
            </div>

            {/* Gender */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    <button
                        onClick={() => onLockToggle('gender')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('gender')}
                    </button>
                </div>
                <input
                    type="text"
                    value={record.gender || ''}
                    onChange={(e) => onFieldChange('gender', e.target.value || null)}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${getHighlightClass('gender')} ${lockedFields.gender ? 'bg-amber-50 border-amber-200' : ''}`}
                    placeholder="Enter gender..."
                    disabled={lockedFields.gender}
                />
            </div>

            {/* Symptoms with Per-Symptom Severity & Duration */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Symptoms (Severity & Duration)</label>
                    <button
                        onClick={() => onLockToggle('symptoms')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('symptoms')}
                    </button>
                </div>
                <div className={`w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[100px] ${getHighlightClass('symptoms')} ${lockedFields.symptoms ? 'bg-amber-50 border-amber-200' : ''}`}>
                    {record.symptoms.length > 0 ? (
                        <div className="space-y-3">
                            {record.symptoms.map((symptom, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-gray-800">{symptom.name}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(symptom.severity)}`}>
                                            {symptom.severity !== null ? `${symptom.severity}/10` : 'Not rated'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-1">
                                        <div className="inline-flex items-center gap-1">
                                            ⏱️ Duration:
                                            <span className="font-medium text-gray-700">
                                                {symptom.duration || 'Not specified'}
                                            </span>
                                        </div>
                                        {symptom.notes && (
                                            <div className="mt-2 bg-blue-50 p-2 rounded-md text-blue-700">
                                                📝 <span className="font-medium">Notes:</span> {symptom.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400">No symptoms recorded</span>
                    )}
                </div>
            </div>

            {/* Overall Severity (if applicable) */}
            {record.overall_severity !== null && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Overall Severity</label>
                        <button
                            onClick={() => onLockToggle('severity')}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            {getLockIcon('severity')}
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={record.overall_severity || 5}
                            onChange={(e) => onFieldChange('overall_severity' as keyof PatientRecord, parseInt(e.target.value))}
                            className={`flex-1 ${lockedFields.severity ? 'opacity-50' : ''}`}
                            disabled={lockedFields.severity}
                        />
                        <span className={`px-4 py-2 rounded-lg font-bold min-w-[60px] text-center ${getSeverityColor(record.overall_severity)} ${getHighlightClass('severity')}`}>
                            {record.overall_severity || '-'}
                        </span>
                    </div>
                </div>
            )}

            {/* Overall Duration (if applicable) */}
            {record.overall_duration !== null && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Overall Duration</label>
                        <button
                            onClick={() => onLockToggle('duration')}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            {getLockIcon('duration')}
                        </button>
                    </div>
                    <input
                        type="text"
                        value={record.overall_duration || ''}
                        onChange={(e) => onFieldChange('overall_duration' as keyof PatientRecord, e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${getHighlightClass('duration')} ${lockedFields.duration ? 'bg-amber-50 border-amber-200' : ''}`}
                        placeholder="e.g., 3 days, 2 weeks..."
                        disabled={lockedFields.duration}
                    />
                </div>
            )}

            {/* Medications - Editable */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Current Medications</label>
                    <button
                        onClick={() => onLockToggle('medications')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('medications')}
                    </button>
                </div>
                <div className={`w-full border border-gray-200 rounded-xl ${getHighlightClass('medications')} ${lockedFields.medications ? 'bg-amber-50 border-amber-200' : ''}`}>
                    {/* Medication Tags */}
                    <div className="p-3 min-h-[60px]">
                        {record.medications.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {record.medications.map((med, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm group"
                                    >
                                        {med}
                                        {!lockedFields.medications && (
                                            <button
                                                onClick={() => handleRemoveMedication(idx)}
                                                className="ml-1 p-0.5 hover:bg-purple-200 rounded-full transition-colors"
                                                title="Remove medication"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-gray-400">No medications recorded</span>
                        )}
                    </div>

                    {/* Add Medication Input */}
                    {!lockedFields.medications && (
                        <div className="border-t border-gray-100 p-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMedication}
                                    onChange={(e) => setNewMedication(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Add medication..."
                                />
                                <button
                                    onClick={handleAddMedication}
                                    disabled={!newMedication.trim()}
                                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
