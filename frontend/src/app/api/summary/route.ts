import { NextRequest, NextResponse } from 'next/server';

interface Symptom {
    name: string;
    severity: number | null;
    duration: string | null;
    notes: string | null;
}

interface PatientData {
    name?: string;
    age?: number;
    gender?: string;
    symptoms?: Symptom[];
    overall_severity?: number;
    overall_duration?: string;
    medications?: string[];
}

interface TranscriptEntry {
    role: 'patient' | 'agent';
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patientData, transcript } = body as { patientData: PatientData; transcript?: TranscriptEntry[] };

        if (!patientData) {
            return NextResponse.json(
                { error: 'Patient data is required' },
                { status: 400 }
            );
        }

        // Use OpenRouter for summary generation
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // Return a quick local summary if no API key
            const quickSummary = generateQuickSummary(patientData);
            return NextResponse.json({ summary: quickSummary });
        }

        const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
        const url = isOpenRouter
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        // Format symptoms properly with all details
        const symptomsText = formatSymptoms(patientData.symptoms || []);

        const systemPrompt = `You are an expert medical scribe. Generate a professional SOAP note from the patient intake data.

FORMAT YOUR RESPONSE EXACTLY AS:

## Patient Information
- **Name:** [patient name]
- **Age:** [age]
- **Gender:** [gender]

## Chief Complaint
[Main reason for visit - use the first symptom listed]

## Subjective
[Patient's description of symptoms, including severity, duration, and any notes for each symptom. Be specific and detailed.]

## Objective
[List all symptoms with their severity ratings, durations, and notes. List all medications.]

## Assessment
[Clinical impression based on reported symptoms. Note: Preliminary pending physician evaluation.]

## Plan
[Recommended next steps: further evaluation, tests to consider, follow-up]

---
*Auto-generated from patient intake - requires physician review*

RULES:
- Use professional medical terminology
- INCLUDE ALL symptom details provided (severity, duration, notes)
- Only include information explicitly provided
- Do NOT invent medical details`;

        // Format transcript if available
        const transcriptText = transcript && transcript.length > 0
            ? '\n\nFull Conversation Transcript:\n' + transcript.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n')
            : '';

        const userContent = `Generate a clinical SOAP note for this patient:

Patient Data:
- Name: ${patientData.name || 'Not provided'}
- Age: ${patientData.age || 'Not provided'}
- Gender: ${patientData.gender || 'Not provided'}            
- Symptoms: ${symptomsText}
- Overall Severity: ${patientData.overall_severity || 'See individual symptoms'}/10
- Overall Duration: ${patientData.overall_duration || 'See individual symptoms'}
- Current Medications: ${patientData.medications?.join(', ') || 'None reported'}${transcriptText}`;

        console.log('Sending to LLM:', userContent);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: isOpenRouter ? 'qwen/qwen-2.5-coder-32b-instruct' : 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LLM API error:', errorText);
            // Fallback to quick summary
            const quickSummary = generateQuickSummary(patientData);
            return NextResponse.json({ summary: quickSummary });
        }

        const result = await response.json();
        const summary = result.choices[0].message.content;

        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Summary generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
}

function formatSymptoms(symptoms: Symptom[]): string {
    if (!symptoms || symptoms.length === 0) {
        return 'No symptoms reported';
    }

    return symptoms.map(s => {
        let text = s.name;
        if (s.severity !== null) text += ` (Severity: ${s.severity}/10)`;
        if (s.duration) text += ` (Duration: ${s.duration})`;
        if (s.notes) text += ` - Notes: ${s.notes}`;
        return text;
    }).join('; ');
}

function generateQuickSummary(patientData: PatientData): string {
    const name = patientData.name || 'Unknown Patient';
    const age = patientData.age || 'Unknown';
    const gender = patientData.gender || 'Not specified';
    const symptoms = patientData.symptoms || [];
    const medications = patientData.medications || [];

    const symptomsText = formatSymptoms(symptoms);
    const chiefComplaint = symptoms.length > 0 ? symptoms[0].name : 'Not specified';

    return `## Patient Information
- **Name:** ${name}
- **Age:** ${age}
- **Gender:** ${gender}

## Chief Complaint
${chiefComplaint}

## Subjective
Patient reports: ${symptomsText}.
${patientData.overall_severity ? `Overall severity rated as ${patientData.overall_severity}/10.` : ''}
${patientData.overall_duration ? `Overall duration: ${patientData.overall_duration}.` : ''}

## Objective
- Reported symptoms: ${symptomsText}
- Current medications: ${medications.length > 0 ? medications.join(', ') : 'None reported'}

## Assessment
Patient presents with ${symptoms.length > 0 ? symptoms.map(s => s.name).join(', ') : 'unspecified complaints'}. 
Further evaluation recommended.

## Plan
1. Review symptoms with attending physician
2. Consider diagnostic workup based on presenting complaints
3. Follow up as clinically indicated

---
*Auto-generated intake summary - pending physician review*`;
}
