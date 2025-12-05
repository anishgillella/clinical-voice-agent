'use client';

import { PatientRecord, LockedFields } from '@/types/patient';
import { Lock, Unlock } from 'lucide-react';

interface PatientFormProps {
    record: PatientRecord;
    lockedFields: LockedFields;
    onFieldChange: (field: keyof PatientRecord, value: string | number | string[]) => void;
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

            {/* Symptoms */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Symptoms</label>
                    <button
                        onClick={() => onLockToggle('symptoms')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('symptoms')}
                    </button>
                </div>
                <div className={`w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[60px] ${getHighlightClass('symptoms')} ${lockedFields.symptoms ? 'bg-amber-50 border-amber-200' : ''}`}>
                    {record.symptoms.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {record.symptoms.map((symptom, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                >
                                    {symptom}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400">No symptoms recorded</span>
                    )}
                </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Severity (1-10)</label>
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
                        value={record.severity || 5}
                        onChange={(e) => onFieldChange('severity', parseInt(e.target.value))}
                        className={`flex-1 ${lockedFields.severity ? 'opacity-50' : ''}`}
                        disabled={lockedFields.severity}
                    />
                    <span className={`px-4 py-2 rounded-lg font-bold min-w-[60px] text-center ${(record.severity || 0) <= 3 ? 'bg-green-100 text-green-700' :
                            (record.severity || 0) <= 6 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                        } ${getHighlightClass('severity')}`}>
                        {record.severity || '-'}
                    </span>
                </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Duration</label>
                    <button
                        onClick={() => onLockToggle('duration')}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {getLockIcon('duration')}
                    </button>
                </div>
                <input
                    type="text"
                    value={record.duration || ''}
                    onChange={(e) => onFieldChange('duration', e.target.value)}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${getHighlightClass('duration')} ${lockedFields.duration ? 'bg-amber-50 border-amber-200' : ''}`}
                    placeholder="e.g., 3 days, 2 weeks..."
                />
            </div>

            {/* Medications */}
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
                <div className={`w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[60px] ${getHighlightClass('medications')} ${lockedFields.medications ? 'bg-amber-50 border-amber-200' : ''}`}>
                    {record.medications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {record.medications.map((med, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                                >
                                    {med}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400">No medications recorded</span>
                    )}
                </div>
            </div>
        </div>
    );
}
