"""
Agent Package - Voice Intake Agent

This package provides the AI voice agent for medical patient intake.
It handles real-time data extraction, session management, and
LLM function calling for populating patient records.

Usage:
    from agent import create_agent, set_room, reset_session, SYSTEM_PROMPT, add_to_transcript
"""

from livekit.agents import Agent

from .models import Symptom, PatientRecord
from .prompts import SYSTEM_PROMPT
from .session import (
    set_room,
    get_room,
    get_patient_record,
    set_patient_record,
    get_transcript,
    add_to_transcript,
    get_patient_context,
    set_patient_context,
    reset_session,
    broadcast_update,
    broadcast_session_end,
    get_symptom_follow_up,
    get_related_symptoms,
    SYMPTOM_GRAPH,
)
from .tools import update_patient_record, end_session


def create_agent() -> Agent:
    """
    Create and configure the voice agent.
    
    Returns:
        Configured Agent instance with tools and system prompt.
    """
    agent = Agent(
        instructions=SYSTEM_PROMPT,
        tools=[update_patient_record, end_session],
    )
    return agent


# Backward compatibility alias
reset_patient_record = reset_session


__all__ = [
    # Agent creation
    "create_agent",
    
    # Models
    "Symptom",
    "PatientRecord",
    
    # Prompt
    "SYSTEM_PROMPT",
    
    # Session management
    "set_room",
    "get_room",
    "get_patient_record",
    "set_patient_record",
    "get_transcript",
    "add_to_transcript",
    "get_patient_context",
    "set_patient_context",
    "reset_session",
    "reset_patient_record",  # Backward compat
    
    # Broadcasting
    "broadcast_update",
    "broadcast_session_end",
    
    # Symptom graph
    "get_symptom_follow_up",
    "get_related_symptoms",
    "SYMPTOM_GRAPH",
    
    # Tools
    "update_patient_record",
    "end_session",
]
