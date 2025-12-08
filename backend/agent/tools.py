"""
Agent Tools - LLM Function Tools

This module contains the function tools that the LLM can call
to update patient records during the voice intake conversation.
"""

import logging
from typing import Annotated, Optional

from livekit.agents import function_tool

from .models import PatientRecord
from .session import (
    get_patient_record,
    set_patient_context,
    broadcast_update,
    broadcast_session_end,
)

logger = logging.getLogger("voice-intake")


@function_tool
async def update_patient_record(
    name: Annotated[Optional[str], "Patient's full name"] = None,
    age: Annotated[Optional[int], "Patient's age in years. Calculate this from DOB when DOB is provided."] = None,
    gender: Annotated[Optional[str], "Patient's gender (Male, Female, Other, or Prefer not to say)"] = None,
    dob: Annotated[Optional[str], "Patient's date of birth. MUST be formatted as MM-DD-YYYY (e.g., '03-15-1990' for March 15, 1990). When patient provides DOB, also calculate and pass age."] = None,
    symptom: Annotated[Optional[str], "A symptom the patient is experiencing"] = None,
    symptom_severity: Annotated[Optional[int], "Severity for the specific symptom just mentioned (1-10). Use this when rating a single symptom."] = None,
    symptom_duration: Annotated[Optional[str], "Duration for the specific symptom just mentioned, e.g. '3 days'. Use this when a symptom has its own duration."] = None,
    symptom_notes: Annotated[Optional[str], "Additional notes about a symptom, e.g. 'fever was 102°F two days ago, now 100°F'. Use this for tracking changes or details."] = None,
    overall_severity: Annotated[Optional[int], "Overall severity when patient gives a single rating for all symptoms (1-10). Applied to symptoms without individual ratings."] = None,
    overall_duration: Annotated[Optional[str], "Overall duration when patient gives a single duration for all symptoms, e.g. '2 weeks'. Applied to symptoms without individual durations."] = None,
    medication: Annotated[Optional[str], "A medication the patient is currently taking"] = None,
) -> str:
    """
    Update the patient's medical record with extracted information.
    Call this immediately when the patient provides any relevant information.
    
    For symptoms, severity, duration, and notes:
    - When a patient reports a symptom WITH its severity/duration/notes, use symptom + symptom_severity + symptom_duration + symptom_notes together
    - When a patient gives ONE severity/duration for ALL symptoms, use overall_severity and/or overall_duration
    - The overall values will be applied to any symptoms that don't have individual ratings
    - Use symptom_notes for additional details like temperature readings, changes over time, etc.
    """
    record = get_patient_record()
    updates = []
    patient_context_message = None
    
    if name is not None:
        record.name = name
        updates.append(f"name: {name}")
        
        # Check for returning patient
        try:
            from patient_db import get_patient_context as db_get_context
            context = db_get_context(name)
            if context.get("is_returning") and context.get("previous_visits", 0) > 0:
                set_patient_context(context)
                patient_context_message = context.get("message")
                logger.info(f"Found returning patient: {name} with {context.get('previous_visits')} previous visits")
        except Exception as e:
            logger.warning(f"Could not check patient history: {e}")
    
    if dob is not None:
        # LLM is instructed to format as MM-DD-YYYY and calculate age
        record.dob = dob
        updates.append(f"dob: {dob}")
    
    if age is not None:
        record.age = age
        updates.append(f"age: {age}")
    
    if gender is not None:
        # Normalize gender variations to standard values
        gender_lower = gender.lower().strip()
        if gender_lower in ['male', 'man', 'guy', 'boy', 'm']:
            normalized_gender = 'Male'
        elif gender_lower in ['female', 'woman', 'girl', 'lady', 'f']:
            normalized_gender = 'Female'
        elif gender_lower in ['non-binary', 'nonbinary', 'nb', 'other', 'they']:
            normalized_gender = 'Other'
        elif gender_lower in ['prefer not to say', 'prefer not', 'rather not say', 'private']:
            normalized_gender = 'Prefer not to say'
        else:
            normalized_gender = gender  # Keep original if not recognized
        record.gender = normalized_gender
        updates.append(f"gender: {normalized_gender}")
    
    if symptom is not None:
        # Add symptom with optional per-symptom severity, duration, and notes
        added = record.add_symptom(symptom, symptom_severity, symptom_duration, symptom_notes)
        if added:
            details = []
            if symptom_severity:
                details.append(f"severity: {symptom_severity}/10")
            if symptom_duration:
                details.append(f"duration: {symptom_duration}")
            if symptom_notes:
                details.append(f"notes: {symptom_notes}")
            if details:
                updates.append(f"symptom: {symptom} ({', '.join(details)})")
            else:
                updates.append(f"symptom: {symptom}")
        else:
            # Symptom existed, but we updated its properties
            if symptom_severity:
                updates.append(f"updated severity for {symptom}: {symptom_severity}/10")
            if symptom_duration:
                record.set_symptom_duration(symptom, symptom_duration)
                updates.append(f"updated duration for {symptom}: {symptom_duration}")
            if symptom_notes:
                record.set_symptom_notes(symptom, symptom_notes)
                updates.append(f"added notes for {symptom}: {symptom_notes}")
    
    if overall_severity is not None:
        record.overall_severity = min(max(overall_severity, 1), 10)
        record.apply_overall_severity()
        updates.append(f"overall severity: {overall_severity}/10 (applied to unrated symptoms)")
    
    if overall_duration is not None:
        record.overall_duration = overall_duration
        record.apply_overall_duration()
        updates.append(f"overall duration: {overall_duration} (applied to symptoms without duration)")
    
    if medication is not None and medication not in record.medications:
        record.medications.append(medication)
        updates.append(f"medication: {medication}")
    
    # Broadcast to frontend
    await broadcast_update()
    
    logger.info(f"Patient record updated: {updates}")
    return f"Record updated: {', '.join(updates)}"


@function_tool
async def end_session() -> str:
    """
    End the intake session when all information has been gathered.
    """
    await broadcast_session_end()
    return "Session ended. Generating clinician summary..."
