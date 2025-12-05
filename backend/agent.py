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
- Current symptoms (what they're experiencing)
- Severity of symptoms (on a scale of 1-10)
- Duration of symptoms (how long they've had them)
- Any current medications

CRITICAL RULES:
1. ALWAYS call the `update_patient_record` function IMMEDIATELY when the patient provides any of the above information.
2. Be conversational and warm. Don't ask for everything at once.
3. If the patient goes off-topic (weather, sports, etc.), politely acknowledge and redirect: "I understand! But to help the doctor best serve you, could you tell me more about your symptoms?"
4. NEVER invent or assume medical information that wasn't explicitly stated.
5. If unsure about something, ask for clarification.

EXAMPLE FLOW:
- "Could you start by telling me your name?"
- [Patient says name] -> Call update_patient_record(name="...")
- "Nice to meet you! And how old are you?"
- [Patient says age] -> Call update_patient_record(age=...)
- "What brings you in today? What symptoms are you experiencing?"
"""


@dataclass
class PatientRecord:
    """Structured patient data extracted during the conversation."""
    name: Optional[str] = None
    age: Optional[int] = None
    symptoms: list[str] = field(default_factory=list)
    severity: Optional[int] = None  # 1-10 scale
    duration: Optional[str] = None
    medications: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())


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
    symptom: Annotated[Optional[str], "A symptom the patient is experiencing"] = None,
    severity: Annotated[Optional[int], "Severity of symptoms on a scale of 1-10"] = None,
    duration: Annotated[Optional[str], "How long the patient has had the symptoms, e.g. '3 days', '2 weeks'"] = None,
    medication: Annotated[Optional[str], "A medication the patient is currently taking"] = None,
) -> str:
    """
    Update the patient's medical record with extracted information.
    Call this immediately when the patient provides any relevant information.
    """
    updates = []
    
    if name is not None:
        _patient_record.name = name
        updates.append(f"name: {name}")
    
    if age is not None:
        _patient_record.age = age
        updates.append(f"age: {age}")
    
    if symptom is not None and symptom not in _patient_record.symptoms:
        _patient_record.symptoms.append(symptom)
        updates.append(f"symptom: {symptom}")
    
    if severity is not None:
        _patient_record.severity = min(max(severity, 1), 10)  # Clamp to 1-10
        updates.append(f"severity: {severity}")
    
    if duration is not None:
        _patient_record.duration = duration
        updates.append(f"duration: {duration}")
    
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
