"""
Clinician Summary Generation

This module generates structured clinical notes from patient intake sessions.
"""

import os
import json
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger("voice-intake")


@dataclass
class ClinicalSummary:
    """Structured clinical summary from intake session."""
    patient_name: str
    patient_age: Optional[int]
    chief_complaint: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    raw_markdown: str
    
    def to_dict(self) -> dict:
        return {
            "patient_name": self.patient_name,
            "patient_age": self.patient_age,
            "chief_complaint": self.chief_complaint,
            "subjective": self.subjective,
            "objective": self.objective,
            "assessment": self.assessment,
            "plan": self.plan,
            "raw_markdown": self.raw_markdown
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())


SUMMARY_SYSTEM_PROMPT = """You are an expert medical scribe. Generate a professional SOAP note from the patient intake data.

FORMAT YOUR RESPONSE EXACTLY AS:

## Patient Information
- **Name:** [patient name]
- **Age:** [age]

## Chief Complaint
[Main reason for visit in 1-2 sentences]

## Subjective
[Patient's description of symptoms, duration, severity, and relevant history. Use first-person quotes where appropriate.]

## Objective
[Observable/reported data: vital signs if mentioned, physical findings, measurable symptoms]

## Assessment
[Clinical impression based on reported symptoms. Note: This is preliminary pending physician evaluation.]

## Plan
[Recommended next steps: further evaluation needed, tests to consider, follow-up recommendations]

---
*Note: This summary was auto-generated from the patient intake interview and should be reviewed by a licensed healthcare provider.*

RULES:
- Use professional medical terminology
- Only include information explicitly provided by the patient
- Do NOT invent or assume any medical details
- If information was not provided, write "Not reported" 
- Be concise but thorough
"""


async def generate_clinical_summary(
    patient_data: dict,
    conversation_history: Optional[list] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> ClinicalSummary:
    """
    Generate a clinical summary from patient data.
    
    Args:
        patient_data: Dictionary with name, age, symptoms, severity, duration, medications
        conversation_history: Optional list of conversation messages
        api_key: API key for LLM (uses env var if not provided)
        base_url: Base URL for LLM API (for OpenRouter)
    
    Returns:
        ClinicalSummary object with structured summary data
    """
    import httpx
    
    # Use OpenRouter with Qwen for fast summary generation
    openrouter_key = api_key or os.getenv("OPENROUTER_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if openrouter_key:
        url = base_url or "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json"
        }
        # Use Qwen 2.5 Coder for structured output (fast and accurate)
        model = "qwen/qwen-2.5-coder-32b-instruct"
    elif openai_key:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }
        model = "gpt-4o-mini"
    else:
        raise ValueError("No API key found. Set OPENROUTER_API_KEY or OPENAI_API_KEY")
    
    # Build the user message with patient data
    # Format symptoms properly from the new structure
    symptoms_list = patient_data.get('symptoms', [])
    if symptoms_list and isinstance(symptoms_list[0], dict):
        # New format: list of symptom objects
        formatted_symptoms = []
        for s in symptoms_list:
            symptom_str = s.get('name', 'Unknown')
            if s.get('severity'):
                symptom_str += f" (Severity: {s['severity']}/10)"
            if s.get('duration'):
                symptom_str += f" (Duration: {s['duration']})"
            if s.get('notes'):
                symptom_str += f" - Notes: {s['notes']}"
            formatted_symptoms.append(symptom_str)
        symptoms_text = '; '.join(formatted_symptoms) if formatted_symptoms else 'Not reported'
    else:
        # Old format: list of strings
        symptoms_text = ', '.join(symptoms_list) if symptoms_list else 'Not reported'
    
    user_content = f"""Generate a clinical SOAP note for this patient:

Patient Data:
- Name: {patient_data.get('name', 'Not provided')}
- Age: {patient_data.get('age', 'Not provided')}
- Gender: {patient_data.get('gender', 'Not provided')}
- Symptoms: {symptoms_text}
- Overall Severity: {patient_data.get('overall_severity', 'See individual symptoms')}/10
- Overall Duration: {patient_data.get('overall_duration', 'See individual symptoms')}
- Current Medications: {', '.join(patient_data.get('medications', [])) or 'None reported'}
"""
    
    if conversation_history:
        user_content += f"\n\nConversation Summary:\n{json.dumps(conversation_history, indent=2)}"
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent output
        "max_tokens": 1500
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        result = response.json()
    
    raw_markdown = result["choices"][0]["message"]["content"]
    
    # Parse the markdown to extract sections
    summary = parse_summary_markdown(raw_markdown, patient_data)
    
    return summary


def parse_summary_markdown(markdown: str, patient_data: dict) -> ClinicalSummary:
    """Parse the markdown summary into structured sections."""
    
    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": ""
    }
    
    current_section = None
    lines = markdown.split("\n")
    
    for line in lines:
        line_lower = line.lower().strip()
        
        if "## subjective" in line_lower or "**subjective**" in line_lower:
            current_section = "subjective"
        elif "## objective" in line_lower or "**objective**" in line_lower:
            current_section = "objective"
        elif "## assessment" in line_lower or "**assessment**" in line_lower:
            current_section = "assessment"
        elif "## plan" in line_lower or "**plan**" in line_lower:
            current_section = "plan"
        elif line.startswith("## ") or line.startswith("---"):
            current_section = None
        elif current_section and line.strip():
            sections[current_section] += line + "\n"
    
    # Extract chief complaint from symptoms
    symptoms = patient_data.get('symptoms', [])
    chief_complaint = symptoms[0] if symptoms else "Not specified"
    
    return ClinicalSummary(
        patient_name=patient_data.get('name', 'Unknown'),
        patient_age=patient_data.get('age'),
        chief_complaint=chief_complaint,
        subjective=sections["subjective"].strip(),
        objective=sections["objective"].strip(),
        assessment=sections["assessment"].strip(),
        plan=sections["plan"].strip(),
        raw_markdown=markdown
    )


def generate_quick_summary(patient_data: dict) -> str:
    """
    Generate a simple summary without LLM (for offline/quick use).
    
    Args:
        patient_data: Dictionary with patient information
    
    Returns:
        Formatted markdown string
    """
    name = patient_data.get('name', 'Unknown Patient')
    age = patient_data.get('age', 'Unknown')
    symptoms = patient_data.get('symptoms', [])
    severity = patient_data.get('severity', 'Not reported')
    duration = patient_data.get('duration', 'Not reported')
    medications = patient_data.get('medications', [])
    
    summary = f"""## Patient Information
- **Name:** {name}
- **Age:** {age}

## Chief Complaint
{symptoms[0] if symptoms else 'Not specified'}

## Subjective
Patient reports experiencing {', '.join(symptoms) if symptoms else 'unspecified symptoms'}.
Severity rated as {severity}/10.
Duration: {duration}.

## Objective
- Reported symptoms: {', '.join(symptoms) if symptoms else 'None reported'}
- Pain/severity level: {severity}/10
- Current medications: {', '.join(medications) if medications else 'None reported'}

## Assessment
Patient presents with {', '.join(symptoms) if symptoms else 'unspecified complaints'} 
for {duration}. Severity is {'moderate to high' if isinstance(severity, (int, float)) and severity > 5 else 'mild to moderate' if isinstance(severity, (int, float)) else 'unspecified'}.
Further evaluation recommended.

## Plan
1. Review symptoms with attending physician
2. Consider diagnostic workup based on presenting complaints
3. Follow up as clinically indicated

---
*Auto-generated intake summary - pending physician review*
"""
    return summary
