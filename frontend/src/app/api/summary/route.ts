import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patientData, conversationHistory } = body;

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

        const systemPrompt = `You are an expert medical scribe. Generate a professional SOAP note from the patient intake data.

FORMAT YOUR RESPONSE EXACTLY AS:

## Patient Information
- **Name:** [patient name]
- **Age:** [age]

## Chief Complaint
[Main reason for visit in 1-2 sentences]

## Subjective
[Patient's description of symptoms, duration, severity, and relevant history.]

## Objective
[Observable/reported data: symptoms, severity rating, medications]

## Assessment
[Clinical impression based on reported symptoms. Note: Preliminary pending physician evaluation.]

## Plan
[Recommended next steps: further evaluation, tests to consider, follow-up]

---
*Auto-generated from patient intake - requires physician review*

RULES:
- Use professional medical terminology
- Only include information explicitly provided
- Do NOT invent medical details
- If information was not provided, write "Not reported"`;

        const userContent = `Generate a clinical SOAP note for this patient:

Patient Data:
- Name: ${patientData.name || 'Not provided'}
- Age: ${patientData.age || 'Not provided'}
- Symptoms: ${patientData.symptoms?.join(', ') || 'Not reported'}
- Severity: ${patientData.severity || 'Not reported'}/10
- Duration: ${patientData.duration || 'Not reported'}
- Current Medications: ${patientData.medications?.join(', ') || 'None reported'}`;

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
                max_tokens: 1500
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

function generateQuickSummary(patientData: {
    name?: string;
    age?: number;
    symptoms?: string[];
    severity?: number;
    duration?: string;
    medications?: string[];
}): string {
    const name = patientData.name || 'Unknown Patient';
    const age = patientData.age || 'Unknown';
    const symptoms = patientData.symptoms || [];
    const severity = patientData.severity;
    const duration = patientData.duration || 'Not reported';
    const medications = patientData.medications || [];

    return `## Patient Information
- **Name:** ${name}
- **Age:** ${age}

## Chief Complaint
${symptoms[0] || 'Not specified'}

## Subjective
Patient reports experiencing ${symptoms.length > 0 ? symptoms.join(', ') : 'unspecified symptoms'}.
Severity rated as ${severity || 'not specified'}/10.
Duration: ${duration}.

## Objective
- Reported symptoms: ${symptoms.length > 0 ? symptoms.join(', ') : 'None reported'}
- Pain/severity level: ${severity || 'Not reported'}/10
- Current medications: ${medications.length > 0 ? medications.join(', ') : 'None reported'}

## Assessment
Patient presents with ${symptoms.length > 0 ? symptoms.join(', ') : 'unspecified complaints'} for ${duration}. 
Severity is ${severity && severity > 5 ? 'moderate to high' : 'mild to moderate'}.
Further evaluation recommended.

## Plan
1. Review symptoms with attending physician
2. Consider diagnostic workup based on presenting complaints
3. Follow up as clinically indicated

---
*Auto-generated intake summary - pending physician review*`;
}
