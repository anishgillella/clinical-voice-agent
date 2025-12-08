"""
Agent Session - State Management and Broadcasting

This module handles session state, room management, transcript collection,
and data broadcasting for the voice intake agent.
"""

import json
import logging
import os
from typing import Optional

from livekit import rtc

from .models import PatientRecord

logger = logging.getLogger("voice-intake")

# Global session state
_patient_record: PatientRecord = PatientRecord()
_room: Optional[rtc.Room] = None
_transcript: list[dict] = []
_patient_context: dict = {}

# Load symptom knowledge graph
SYMPTOM_GRAPH: dict = {}
_symptom_graph_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'symptom_graph.json')
if os.path.exists(_symptom_graph_path):
    with open(_symptom_graph_path, 'r') as f:
        SYMPTOM_GRAPH = json.load(f)
    logger.info(f"Loaded symptom graph with {len(SYMPTOM_GRAPH)} symptoms")


def set_room(room: rtc.Room) -> None:
    """Set the room for data broadcasting."""
    global _room
    _room = room


def get_room() -> Optional[rtc.Room]:
    """Get the current room."""
    return _room


def get_patient_record() -> PatientRecord:
    """Get the current patient record."""
    return _patient_record


def set_patient_record(record: PatientRecord) -> None:
    """Set the patient record."""
    global _patient_record
    _patient_record = record


def get_transcript() -> list[dict]:
    """Get the conversation transcript."""
    return _transcript


def add_to_transcript(role: str, content: str) -> None:
    """Add a message to the transcript."""
    _transcript.append({"role": role, "content": content})


def get_patient_context() -> dict:
    """Get context about returning patient."""
    return _patient_context


def set_patient_context(context: dict) -> None:
    """Set context for returning patient."""
    global _patient_context
    _patient_context = context


def reset_session() -> None:
    """Reset the session state for a new patient."""
    global _patient_record, _transcript, _patient_context
    _patient_record = PatientRecord()
    _transcript = []
    _patient_context = {}


def get_symptom_follow_up(symptom_name: str) -> Optional[str]:
    """Get follow-up question for a symptom from the knowledge graph."""
    symptom_lower = symptom_name.lower()
    for key, data in SYMPTOM_GRAPH.items():
        if key in symptom_lower or symptom_lower in key:
            return data.get("follow_up")
    return None


def get_related_symptoms(symptom_name: str) -> list[str]:
    """Get related symptoms from the knowledge graph."""
    symptom_lower = symptom_name.lower()
    for key, data in SYMPTOM_GRAPH.items():
        if key in symptom_lower or symptom_lower in key:
            return data.get("related", [])
    return []


async def broadcast_update() -> None:
    """Send the current patient record to all participants via data channel."""
    if _room is None:
        logger.warning("Room not set, cannot broadcast update")
        return
        
    message = json.dumps({
        "type": "UPDATE_RECORD",
        "data": _patient_record.to_dict(),
        "transcript": _transcript
    })
    
    await _room.local_participant.publish_data(
        message.encode(),
        reliable=True,
    )
    logger.info(f"Broadcast update: {message}")


async def broadcast_session_end() -> None:
    """Broadcast session end to all participants."""
    if _room is None:
        logger.warning("Room not set, cannot broadcast session end")
        return
        
    message = json.dumps({
        "type": "SESSION_END",
        "data": _patient_record.to_dict()
    })
    
    await _room.local_participant.publish_data(
        message.encode(),
        reliable=True,
    )
    logger.info("Session ended, summary requested")
