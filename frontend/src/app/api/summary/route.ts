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
            return NextResponse.json({
                summary: quickSummary,
                urgencyLevel: 'routine',
                differentialDiagnoses: []
            });
        }

        const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
        const url = isOpenRouter
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        // Format symptoms properly with all details
        const symptomsText = formatSymptoms(patientData.symptoms || []);

        // Format transcript if available
        const transcriptText = transcript && transcript.length > 0
            ? '\n\nFull Conversation Transcript:\n' + transcript.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n')
            : '';

        const systemPrompt = `You are an expert medical scribe and clinical decision support system. Generate a comprehensive clinical report that includes:

1. A SOAP note
2. Urgency assessment
3. Differential diagnoses with reasoning

FORMAT YOUR RESPONSE AS VALID JSON:
{
    "soapNote": {
        "patientInfo": {
            "name": "...",
            "age": "...",
            "gender": "..."
        },
        "chiefComplaint": "Main reason for visit",
        "subjective": "Patient's description including all symptoms, notes, and context from the conversation",
        "objective": "All reported symptoms with severity, duration, notes. Current medications.",
        "assessment": "Clinical impression and urgency level",
        "plan": ["Step 1", "Step 2", "Step 3"]
    },
    "urgency": {
        "level": "routine|soon|urgent|emergent",
        "reasoning": "Why this urgency level was assigned",
        "timeframe": "e.g., 'routine scheduling', 'within 24-48 hours', 'same day', 'immediate'"
    },
    "differentialDiagnoses": [
        {
            "condition": "Most likely condition",
            "probability": 65,
            "reasoning": "Detailed clinical reasoning explaining why this is considered...",
            "keyFactors": ["Factor 1", "Factor 2"],
            "redFlags": ["What to watch for"],
            "recommendedTests": ["Test 1", "Test 2"]
        }
    ],
    "clinicalNotes": "Any additional context or caveats for the physician"
}

RULES:
- Use professional medical terminology
- Extract ALL details from symptoms, especially the notes field which contains important context
- Include 3-5 differential diagnoses ranked by probability
- Probabilities should sum to approximately 100%
- Be specific in reasoning - reference actual patient data
- For urgency, consider symptom severity, red flags, and overall clinical picture`;

        const userContent = `Generate a comprehensive clinical report for this patient:

Patient Data:
- Name: ${patientData.name || 'Not provided'}
- Age: ${patientData.age || 'Not provided'}
- Gender: ${patientData.gender || 'Not provided'}            
- Symptoms: ${symptomsText}
- Overall Severity: ${patientData.overall_severity || 'See individual symptoms'}/10
- Overall Duration: ${patientData.overall_duration || 'See individual symptoms'}
- Current Medications: ${patientData.medications?.join(', ') || 'None reported'}${transcriptText}`;

        console.log('Sending comprehensive request to LLM:', userContent);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.3,
                max_tokens: 3000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LLM API error:', errorText);
            const quickSummary = generateQuickSummary(patientData);
            return NextResponse.json({
                summary: quickSummary,
                urgencyLevel: 'routine',
                differentialDiagnoses: []
            });
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        try {
            const parsed = JSON.parse(content);

            // Format SOAP note as markdown for display
            const formattedSummary = formatSoapNoteMarkdown(parsed);

            return NextResponse.json({
                summary: formattedSummary,
                urgency: parsed.urgency,
                differentialDiagnoses: parsed.differentialDiagnoses,
                clinicalNotes: parsed.clinicalNotes,
                raw: parsed
            });
        } catch {
            console.error('Failed to parse JSON, returning raw content');
            return NextResponse.json({
                summary: content,
                urgencyLevel: 'routine',
                differentialDiagnoses: []
            });
        }

    } catch (error) {
        console.error('Summary generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
}

function formatSoapNoteMarkdown(parsed: Record<string, unknown>): string {
    const soap = parsed.soapNote as Record<string, unknown> || {};
    const patientInfo = soap.patientInfo as Record<string, string> || {};
    const plan = soap.plan as string[] || [];

    return `## Patient Information
- **Name:** ${patientInfo.name || 'Not provided'}
- **Age:** ${patientInfo.age || 'Not provided'}
- **Gender:** ${patientInfo.gender || 'Not provided'}

## Chief Complaint
${soap.chiefComplaint || 'Not specified'}

## Subjective
${soap.subjective || 'Not reported'}

## Objective
${soap.objective || 'Not reported'}

## Assessment
${soap.assessment || 'Pending physician evaluation'}

## Plan
${plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---
*Auto-generated from patient intake - requires physician review*`;
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
