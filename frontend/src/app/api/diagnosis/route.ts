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

interface Diagnosis {
    condition: string;
    probability: number;
    reasoning: string;
    keyFactors: string[];
    redFlags?: string[];
    recommendedTests?: string[];
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patientData } = body as { patientData: PatientData };

        if (!patientData) {
            return NextResponse.json(
                { error: 'Patient data is required' },
                { status: 400 }
            );
        }

        // Use OpenRouter for differential diagnosis
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // Return a fallback if no API key
            const fallback = generateFallbackDiagnosis(patientData);
            return NextResponse.json({ diagnoses: fallback });
        }

        const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
        const url = isOpenRouter
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        // Format symptoms for the prompt
        const symptomsText = patientData.symptoms?.map(s => {
            let text = s.name;
            if (s.severity) text += ` (severity: ${s.severity}/10)`;
            if (s.duration) text += ` (duration: ${s.duration})`;
            if (s.notes) text += ` - ${s.notes}`;
            return text;
        }).join('; ') || 'None reported';

        const systemPrompt = `You are an expert clinical decision support system. Based on patient demographics and symptoms, generate differential diagnoses ranked by probability.

IMPORTANT DISCLAIMERS:
- These are suggestions for clinical consideration only
- Not a substitute for professional medical judgment
- Requires physician review and clinical correlation

For each diagnosis, provide:
1. Condition name
2. Probability estimate (must sum to ~100%)
3. Clinical reasoning explaining why this diagnosis is considered
4. Key factors from the patient data supporting this diagnosis
5. Red flags to watch for (if applicable)
6. Recommended diagnostic tests (if applicable)

Respond in valid JSON format:
{
    "diagnoses": [
        {
            "condition": "Condition Name",
            "probability": 75,
            "reasoning": "Detailed clinical reasoning explaining the probability...",
            "keyFactors": ["Factor 1", "Factor 2"],
            "redFlags": ["Red flag 1"],
            "recommendedTests": ["Test 1", "Test 2"]
        }
    ],
    "clinicalNotes": "Any additional clinical context or caveats",
    "disclaimer": "For clinical consideration only - requires physician review"
}

Provide 3-5 differential diagnoses, ordered by probability.`;

        const userContent = `Generate differential diagnoses for this patient:

Patient Demographics:
- Age: ${patientData.age || 'Unknown'}
- Gender: ${patientData.gender || 'Unknown'}

Presenting Symptoms:
${symptomsText}

Current Medications:
${patientData.medications?.join(', ') || 'None reported'}

Overall Severity: ${patientData.overall_severity || 'Not specified'}/10
Duration of Symptoms: ${patientData.overall_duration || 'See individual symptoms'}`;

        console.log('Differential Diagnosis Request:', userContent);

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
                max_tokens: 2000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Differential diagnosis API error:', errorText);
            const fallback = generateFallbackDiagnosis(patientData);
            return NextResponse.json({ diagnoses: fallback });
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        try {
            const parsed = JSON.parse(content);
            return NextResponse.json(parsed);
        } catch {
            console.error('Failed to parse diagnosis JSON:', content);
            const fallback = generateFallbackDiagnosis(patientData);
            return NextResponse.json({ diagnoses: fallback });
        }

    } catch (error) {
        console.error('Differential diagnosis error:', error);
        return NextResponse.json(
            { error: 'Failed to generate differential diagnosis' },
            { status: 500 }
        );
    }
}

function generateFallbackDiagnosis(patientData: PatientData): Diagnosis[] {
    const symptoms = patientData.symptoms || [];
    const symptomNames = symptoms.map(s => s.name.toLowerCase());

    const diagnoses: Diagnosis[] = [];

    // Simple pattern matching for fallback
    if (symptomNames.some(s => s.includes('fever') || s.includes('temperature'))) {
        if (symptomNames.some(s => s.includes('cough') || s.includes('cold') || s.includes('throat'))) {
            diagnoses.push({
                condition: 'Viral Upper Respiratory Infection',
                probability: 70,
                reasoning: 'Combination of fever and respiratory symptoms is highly suggestive of a viral URI, which is the most common cause of these symptoms.',
                keyFactors: ['Fever present', 'Respiratory symptoms', 'Common seasonal presentation'],
                redFlags: ['High fever > 103°F', 'Difficulty breathing', 'Symptoms > 10 days'],
                recommendedTests: ['None typically needed', 'Consider rapid strep test if sore throat prominent']
            });
            diagnoses.push({
                condition: 'Bacterial Sinusitis',
                probability: 15,
                reasoning: 'If symptoms have persisted for more than 10 days or show biphasic pattern, bacterial sinusitis should be considered.',
                keyFactors: ['Prolonged symptoms', 'Nasal congestion', 'Facial pain/pressure'],
                recommendedTests: ['Clinical diagnosis', 'CT sinus if complicated']
            });
        } else {
            diagnoses.push({
                condition: 'Viral Syndrome',
                probability: 60,
                reasoning: 'Fever without localizing symptoms could indicate a systemic viral infection.',
                keyFactors: ['Fever', 'Age-appropriate presentation'],
                redFlags: ['Persistent high fever', 'Altered mental status', 'Signs of sepsis'],
                recommendedTests: ['CBC', 'CMP if indicated']
            });
        }
    }

    if (symptomNames.some(s => s.includes('back') || s.includes('pain'))) {
        diagnoses.push({
            condition: 'Musculoskeletal Strain',
            probability: diagnoses.length > 0 ? 10 : 50,
            reasoning: 'Back pain without neurological symptoms is most commonly musculoskeletal in origin.',
            keyFactors: ['Pain pattern', 'Activity history', 'No red flags for serious pathology'],
            redFlags: ['Weakness', 'Bowel/bladder changes', 'Saddle anesthesia', 'Trauma'],
            recommendedTests: ['None initially', 'X-ray if trauma', 'MRI if red flags present']
        });
    }

    // Add "Other" category to complete differential
    const totalProb = diagnoses.reduce((sum, d) => sum + d.probability, 0);
    if (totalProb < 100 && diagnoses.length > 0) {
        diagnoses.push({
            condition: 'Other Conditions',
            probability: 100 - totalProb,
            reasoning: 'Other less common conditions should be considered based on clinical presentation and response to treatment.',
            keyFactors: ['Atypical features', 'Treatment response', 'Patient history'],
            recommendedTests: ['Based on clinical suspicion']
        });
    }

    if (diagnoses.length === 0) {
        diagnoses.push({
            condition: 'Undifferentiated Presentation',
            probability: 100,
            reasoning: 'Insufficient symptom data for specific differential. Requires detailed history and physical examination.',
            keyFactors: ['Limited presenting information'],
            recommendedTests: ['Complete history and physical', 'Basic labs as indicated']
        });
    }

    return diagnoses;
}
