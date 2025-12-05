export interface Symptom {
    name: string;
    severity: number | null;
    duration: string | null;
}

export interface PatientRecord {
    name: string | null;
    age: number | null;
    gender: string | null;
    symptoms: Symptom[];
    overall_severity: number | null;
    overall_duration: string | null;
    medications: string[];
}

export interface LockedFields {
    name: boolean;
    age: boolean;
    gender: boolean;
    symptoms: boolean;
    severity: boolean;
    duration: boolean;
    medications: boolean;
}

export interface DataMessage {
    type: 'UPDATE_RECORD' | 'SESSION_END';
    data: PatientRecord;
}
