"""
Summary generation module for clinical summaries.

This module provides utilities for generating and parsing clinical summaries
from patient intake data. The actual LLM-based summary generation is now
handled by the frontend API, but this module provides helper functions
and data structures.
"""

import json
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any


SUMMARY_SYSTEM_PROMPT = """You are a medical scribe assistant. Generate a structured clinical SOAP note from patient intake data.

FORMAT:
## Patient Information
- Name, Age, relevant demographics

## Chief Complaint
Primary reason for visit

## Subjective
Patient's description of symptoms in their own words

## Objective
Observable findings, measurements, reported symptoms

## Assessment
Clinical impression based on reported information

## Plan
Recommended next steps

RULES:
- Use professional medical terminology
- Only include information explicitly provided
- Do NOT invent or assume medical details
- Note that this is AI-generated and requires physician review
- For any medication interactions or serious symptoms, flag for healthcare provider attention
"""


@dataclass
class ClinicalSummary:
    """Structured clinical summary from patient intake."""
    patient_name: str
    patient_age: Optional[int]
    chief_complaint: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    raw_markdown: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


def generate_quick_summary(patient_data: Dict[str, Any]) -> str:
    """
    Generate a quick offline summary from patient data.
    Used as fallback when LLM is not available.
    """
    name = patient_data.get("name") or "Unknown Patient"
    age = patient_data.get("age") or "Unknown"
    symptoms = patient_data.get("symptoms") or []
    severity = patient_data.get("severity") or patient_data.get("overall_severity")
    duration = patient_data.get("duration") or patient_data.get("overall_duration")
    medications = patient_data.get("medications") or []
    gender = patient_data.get("gender") or "Not specified"
    
    # Handle symptoms as objects or strings
    if symptoms and isinstance(symptoms[0], dict):
        symptom_list = [s.get("name", str(s)) for s in symptoms]
    else:
        symptom_list = symptoms
    
    chief_complaint = symptom_list[0] if symptom_list else "Not specified"
    
    return f"""## Patient Information
- **Name:** {name}
- **Age:** {age}
- **Gender:** {gender}

## Chief Complaint
{chief_complaint}

## Subjective
Patient presents with: {', '.join(symptom_list) if symptom_list else 'No symptoms reported'}.
{f'Severity rated as {severity}/10.' if severity else ''}
{f'Duration: {duration}.' if duration else ''}

## Objective
- Reported symptoms: {', '.join(symptom_list) if symptom_list else 'None'}
- Current medications: {', '.join(medications) if medications else 'None reported'}

## Assessment
Patient presents with {chief_complaint if chief_complaint != 'Not specified' else 'unspecified complaints'}.
Further evaluation recommended. This is a preliminary assessment pending physician review.

## Plan
1. Review symptoms with attending physician
2. Consider diagnostic workup based on presenting complaints
3. Follow up as clinically indicated

---
*Auto-generated intake summary - requires physician review*
"""


def parse_summary_markdown(markdown: str, patient_data: Dict[str, Any]) -> ClinicalSummary:
    """
    Parse a markdown summary into structured ClinicalSummary object.
    """
    def extract_section(text: str, section_name: str) -> str:
        """Extract content between section headers."""
        lines = text.split('\n')
        in_section = False
        content = []
        
        for line in lines:
            if line.startswith('##'):
                if section_name.lower() in line.lower():
                    in_section = True
                    continue
                elif in_section:
                    break
            elif in_section:
                content.append(line)
        
        return '\n'.join(content).strip()
    
    name = patient_data.get("name") or "Unknown"
    age = patient_data.get("age")
    
    # Extract symptoms for chief complaint
    symptoms = patient_data.get("symptoms") or []
    if symptoms and isinstance(symptoms[0], dict):
        chief = symptoms[0].get("name", "Not specified")
    elif symptoms:
        chief = symptoms[0]
    else:
        chief = extract_section(markdown, "Chief Complaint") or "Not specified"
    
    return ClinicalSummary(
        patient_name=name,
        patient_age=age,
        chief_complaint=chief,
        subjective=extract_section(markdown, "Subjective") or "See patient interview",
        objective=extract_section(markdown, "Objective") or "See reported symptoms",
        assessment=extract_section(markdown, "Assessment") or "Pending physician evaluation",
        plan=extract_section(markdown, "Plan") or "To be determined",
        raw_markdown=markdown
    )
