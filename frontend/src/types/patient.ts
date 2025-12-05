export interface PatientRecord {
    name: string | null;
    age: number | null;
    symptoms: string[];
    severity: number | null;
    duration: string | null;
    medications: string[];
}

export interface LockedFields {
    name: boolean;
    age: boolean;
    symptoms: boolean;
    severity: boolean;
    duration: boolean;
    medications: boolean;
}

export interface DataMessage {
    type: 'UPDATE_RECORD' | 'SESSION_END';
    data: PatientRecord;
}
