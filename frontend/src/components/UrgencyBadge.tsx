'use client';

interface Symptom {
    name: string;
    severity: number | null;
    duration: string | null;
    notes: string | null;
}

interface UrgencyBadgeProps {
    symptoms: Symptom[];
    overallSeverity: number | null;
}

// Keywords that indicate higher urgency
const URGENT_KEYWORDS = [
    'chest pain', 'heart', 'breathing', 'shortness of breath',
    'unconscious', 'seizure', 'stroke', 'severe bleeding',
    'suicidal', 'self-harm', 'overdose'
];

const MODERATE_KEYWORDS = [
    'fever', 'high temperature', 'vomiting', 'diarrhea',
    'infection', 'swelling', 'severe pain', 'head injury',
    'allergic', 'rash spreading'
];

export function calculateUrgency(symptoms: Symptom[], overallSeverity: number | null): {
    level: 'routine' | 'soon' | 'urgent';
    score: number;
    reason: string;
} {
    let score = 0;
    let reasons: string[] = [];

    // Check for urgent keywords
    for (const symptom of symptoms) {
        const symptomLower = symptom.name.toLowerCase();
        const notesLower = (symptom.notes || '').toLowerCase();

        for (const keyword of URGENT_KEYWORDS) {
            if (symptomLower.includes(keyword) || notesLower.includes(keyword)) {
                score += 30;
                reasons.push(`"${keyword}" detected`);
            }
        }

        for (const keyword of MODERATE_KEYWORDS) {
            if (symptomLower.includes(keyword) || notesLower.includes(keyword)) {
                score += 15;
            }
        }

        // High severity symptoms
        if (symptom.severity !== null) {
            if (symptom.severity >= 9) {
                score += 25;
                reasons.push(`Severity ${symptom.severity}/10`);
            } else if (symptom.severity >= 7) {
                score += 15;
            } else if (symptom.severity >= 5) {
                score += 5;
            }
        }
    }

    // Factor in overall severity
    if (overallSeverity !== null) {
        if (overallSeverity >= 9) score += 20;
        else if (overallSeverity >= 7) score += 10;
    }

    // Multiple symptoms increase urgency
    if (symptoms.length >= 4) {
        score += 10;
        reasons.push('Multiple symptoms');
    }

    // Determine level
    let level: 'routine' | 'soon' | 'urgent';
    if (score >= 50) {
        level = 'urgent';
    } else if (score >= 25) {
        level = 'soon';
    } else {
        level = 'routine';
    }

    return {
        level,
        score,
        reason: reasons.length > 0 ? reasons.slice(0, 2).join(', ') : 'Standard intake'
    };
}

export default function UrgencyBadge({ symptoms, overallSeverity }: UrgencyBadgeProps) {
    const urgency = calculateUrgency(symptoms, overallSeverity);

    const config = {
        routine: {
            bg: 'bg-green-100',
            border: 'border-green-300',
            text: 'text-green-800',
            icon: '🟢',
            label: 'Routine',
            description: 'Standard scheduling'
        },
        soon: {
            bg: 'bg-yellow-100',
            border: 'border-yellow-300',
            text: 'text-yellow-800',
            icon: '🟡',
            label: 'Soon',
            description: 'Schedule within 24-48 hrs'
        },
        urgent: {
            bg: 'bg-red-100',
            border: 'border-red-300',
            text: 'text-red-800',
            icon: '🔴',
            label: 'Urgent',
            description: 'Needs immediate attention'
        }
    };

    const c = config[urgency.level];

    return (
        <div className={`${c.bg} ${c.border} border-2 rounded-xl p-4`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                        <div className={`font-bold text-lg ${c.text}`}>
                            {c.label}
                        </div>
                        <div className="text-xs text-gray-600">
                            {c.description}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-sm font-medium ${c.text}`}>
                        Triage Score: {urgency.score}
                    </div>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate">
                        {urgency.reason}
                    </div>
                </div>
            </div>
        </div>
    );
}
