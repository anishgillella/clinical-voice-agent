"""
AI Voice Intake Agent - Core Agent Logic

This module contains the voice agent configuration, system prompt,
and function definitions for real-time data extraction.
"""

import json
import logging
from typing import Annotated, Optional
from dataclasses import dataclass, field, asdict

from livekit.agents import llm, function_tool, Agent, AgentSession, RoomInputOptions
from livekit.agents import stt as agents_stt, tts as agents_tts
from livekit.plugins import deepgram, openai, silero
from livekit import rtc

logger = logging.getLogger("voice-intake")

# System prompt that defines the agent's behavior
SYSTEM_PROMPT = """You are a professional and empathetic medical intake assistant. Your goal is to gather essential patient information through natural conversation.

INFORMATION TO GATHER:
- Patient's full name
- Age
- Gender
- Current symptoms (what they're experiencing)
- Severity of each symptom (on a scale of 1-10)
- Duration of each symptom (how long they've had them)
- Any current medications

CRITICAL RULES:
1. ALWAYS call the `update_patient_record` function IMMEDIATELY when the patient provides any of the above information.
2. Be conversational and warm. Don't ask for everything at once.
3. NEVER invent or assume medical information that wasn't explicitly stated.
4. If unsure about something, ask for clarification.

SYMPTOM SEVERITY & DURATION HANDLING:
- When a patient mentions a symptom WITH its severity and/or duration, use: symptom="headache", symptom_severity=7, symptom_duration="3 days"
- When a patient gives ONE severity/duration for ALL symptoms, use: overall_severity=6, overall_duration="2 weeks"
- If patient has multiple symptoms, ask: "Would you like to rate each symptom separately, or give me an overall rating?"
- Example: "For your headache specifically, how long have you had it?"
- If they give one value for all: use overall_severity or overall_duration parameters

OFF-TOPIC HANDLING (GUARDRAILS):
When the patient discusses topics unrelated to their medical intake (examples: weather, sports, politics, personal stories, hobbies, pets, work complaints), you must:

1. BRIEFLY acknowledge what they said (one sentence max)
2. IMMEDIATELY redirect back to medical intake
3. NEVER extract medical information from off-topic conversation
4. NEVER pretend off-topic content contains symptoms

Example off-topic redirections:
- "That sounds nice! Now, to help the doctor better serve you, could you tell me about your symptoms?"
- "I understand. Let's focus on why you're here today - what health concerns brought you in?"
- "That's interesting! But let's get back to your medical information so the doctor can help you."
- "I hear you. For now, let's make sure we capture your health details correctly."

SAFETY PROTOCOLS:
- If patient mentions self-harm, suicidal thoughts, or immediate danger, express concern and suggest calling emergency services (911)
- Do not provide medical diagnoses or treatment recommendations
- Do not prescribe or recommend specific medications
- If patient asks for medical advice, say: "I'm here to gather information for your doctor. They'll be able to discuss treatment options with you."

DATA INTEGRITY:
- Only update_patient_record with information EXPLICITLY provided by the patient
- If patient says something ambiguous, ask for clarification before recording
- Symptoms mentioned in jokes or hypotheticals should NOT be recorded
- Example: If patient says "Haha, at this rate I'll get a headache" - do NOT record headache as a symptom

CONVERSATION FLOW:
1. Greet and ask for name
2. Ask for age and gender (can ask together naturally: "And how old are you?" then "For our records, how would you like me to note your gender?")
3. Ask about current symptoms/concerns
4. For each symptom, ask about:
   - Severity (1-10) - offer to rate each separately or overall
   - Duration (how long) - offer to specify each separately or overall
5. Ask about current medications
6. Confirm all information and end session

When all required information is gathered, call the `end_session` function.
"""


@dataclass
class Symptom:
    """A symptom with its own severity and duration."""
    name: str
    severity: Optional[int] = None  # 1-10 scale, None if not yet rated
    duration: Optional[str] = None  # e.g., "3 days", "2 weeks"
    
    def to_dict(self) -> dict:
        return {"name": self.name, "severity": self.severity, "duration": self.duration}


@dataclass
class PatientRecord:
    """Structured patient data extracted during the conversation."""
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # Male, Female, Other, Prefer not to say
    symptoms: list[Symptom] = field(default_factory=list)
    overall_severity: Optional[int] = None  # Fallback if patient gives single rating
    overall_duration: Optional[str] = None  # Fallback if patient gives single duration
    medications: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "symptoms": [s.to_dict() for s in self.symptoms],
            "overall_severity": self.overall_severity,
            "overall_duration": self.overall_duration,
            "medications": self.medications
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())
    
    def get_symptom_names(self) -> list[str]:
        """Get list of symptom names for backward compatibility."""
        return [s.name for s in self.symptoms]
    
    def add_symptom(self, name: str, severity: Optional[int] = None, duration: Optional[str] = None) -> bool:
        """Add a symptom if not already present. Returns True if added."""
        # Check if symptom already exists
        for s in self.symptoms:
            if s.name.lower() == name.lower():
                # Update severity/duration if provided
                if severity is not None:
                    s.severity = min(max(severity, 1), 10)
                if duration is not None:
                    s.duration = duration
                return False
        # Add new symptom
        self.symptoms.append(Symptom(
            name=name, 
            severity=min(max(severity, 1), 10) if severity else None,
            duration=duration
        ))
        return True
    
    def set_symptom_severity(self, symptom_name: str, severity: int) -> bool:
        """Set severity for a specific symptom. Returns True if found."""
        for s in self.symptoms:
            if s.name.lower() == symptom_name.lower():
                s.severity = min(max(severity, 1), 10)
                return True
        return False
    
    def set_symptom_duration(self, symptom_name: str, duration: str) -> bool:
        """Set duration for a specific symptom. Returns True if found."""
        for s in self.symptoms:
            if s.name.lower() == symptom_name.lower():
                s.duration = duration
                return True
        return False
    
    def apply_overall_severity(self):
        """Apply overall_severity to any symptoms without individual ratings."""
        if self.overall_severity is not None:
            for s in self.symptoms:
                if s.severity is None:
                    s.severity = self.overall_severity
    
    def apply_overall_duration(self):
        """Apply overall_duration to any symptoms without individual durations."""
        if self.overall_duration is not None:
            for s in self.symptoms:
                if s.duration is None:
                    s.duration = self.overall_duration


# Global patient record for the session
_patient_record = PatientRecord()
_room: Optional[rtc.Room] = None


def set_room(room: rtc.Room):
    """Set the room for data broadcasting."""
    global _room
    _room = room


def get_patient_record() -> PatientRecord:
    """Get the current patient record."""
    return _patient_record


def reset_patient_record():
    """Reset the patient record for a new session."""
    global _patient_record
    _patient_record = PatientRecord()


async def _broadcast_update():
    """Send the current patient record to all participants via data channel."""
    if _room is None:
        logger.warning("Room not set, cannot broadcast update")
        return
        
    message = json.dumps({
        "type": "UPDATE_RECORD",
        "data": _patient_record.to_dict()
    })
    
    await _room.local_participant.publish_data(
        message.encode(),
        reliable=True,
    )
    logger.info(f"Broadcast update: {message}")


@function_tool
async def update_patient_record(
    name: Annotated[Optional[str], "Patient's full name"] = None,
    age: Annotated[Optional[int], "Patient's age in years"] = None,
    gender: Annotated[Optional[str], "Patient's gender (Male, Female, Other, or Prefer not to say)"] = None,
    symptom: Annotated[Optional[str], "A symptom the patient is experiencing"] = None,
    symptom_severity: Annotated[Optional[int], "Severity for the specific symptom just mentioned (1-10). Use this when rating a single symptom."] = None,
    symptom_duration: Annotated[Optional[str], "Duration for the specific symptom just mentioned, e.g. '3 days'. Use this when a symptom has its own duration."] = None,
    overall_severity: Annotated[Optional[int], "Overall severity when patient gives a single rating for all symptoms (1-10). Applied to symptoms without individual ratings."] = None,
    overall_duration: Annotated[Optional[str], "Overall duration when patient gives a single duration for all symptoms, e.g. '2 weeks'. Applied to symptoms without individual durations."] = None,
    medication: Annotated[Optional[str], "A medication the patient is currently taking"] = None,
) -> str:
    """
    Update the patient's medical record with extracted information.
    Call this immediately when the patient provides any relevant information.
    
    For symptoms, severity, and duration:
    - When a patient reports a symptom WITH its severity/duration, use symptom + symptom_severity + symptom_duration together
    - When a patient gives ONE severity/duration for ALL symptoms, use overall_severity and/or overall_duration
    - The overall values will be applied to any symptoms that don't have individual ratings
    """
    updates = []
    
    if name is not None:
        _patient_record.name = name
        updates.append(f"name: {name}")
    
    if age is not None:
        _patient_record.age = age
        updates.append(f"age: {age}")
    
    if gender is not None:
        _patient_record.gender = gender
        updates.append(f"gender: {gender}")
    
    if symptom is not None:
        # Add symptom with optional per-symptom severity and duration
        added = _patient_record.add_symptom(symptom, symptom_severity, symptom_duration)
        if added:
            details = []
            if symptom_severity:
                details.append(f"severity: {symptom_severity}/10")
            if symptom_duration:
                details.append(f"duration: {symptom_duration}")
            if details:
                updates.append(f"symptom: {symptom} ({', '.join(details)})")
            else:
                updates.append(f"symptom: {symptom}")
        else:
            # Symptom existed, but we updated its properties
            if symptom_severity:
                updates.append(f"updated severity for {symptom}: {symptom_severity}/10")
            if symptom_duration:
                _patient_record.set_symptom_duration(symptom, symptom_duration)
                updates.append(f"updated duration for {symptom}: {symptom_duration}")
    
    if overall_severity is not None:
        _patient_record.overall_severity = min(max(overall_severity, 1), 10)
        _patient_record.apply_overall_severity()
        updates.append(f"overall severity: {overall_severity}/10 (applied to unrated symptoms)")
    
    if overall_duration is not None:
        _patient_record.overall_duration = overall_duration
        _patient_record.apply_overall_duration()
        updates.append(f"overall duration: {overall_duration} (applied to symptoms without duration)")
    
    if medication is not None and medication not in _patient_record.medications:
        _patient_record.medications.append(medication)
        updates.append(f"medication: {medication}")
    
    # Broadcast to frontend
    await _broadcast_update()
    
    logger.info(f"Patient record updated: {updates}")
    return f"Record updated: {', '.join(updates)}"


@function_tool
async def end_session() -> str:
    """
    End the intake session when all information has been gathered.
    """
    if _room is None:
        return "Session ended (no room connection)."
        
    message = json.dumps({
        "type": "SESSION_END",
        "data": _patient_record.to_dict()
    })
    
    await _room.local_participant.publish_data(
        message.encode(),
        reliable=True,
    )
    
    logger.info("Session ended, summary requested")
    return "Session ended. Generating clinician summary..."


def create_agent() -> Agent:
    """
    Create and configure the voice agent.
    
    Returns:
        Configured Agent instance
    """
    # Create the agent with tools
    agent = Agent(
        instructions=SYSTEM_PROMPT,
        tools=[update_patient_record, end_session],
    )
    
    return agent
