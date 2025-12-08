"""
Agent Models - Data Structures for Patient Records

This module contains the Pydantic-style dataclasses for structured
patient data during voice intake sessions.
"""

import json
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class Symptom:
    """A symptom with its own severity, duration, and notes."""
    name: str
    severity: Optional[int] = None  # 1-10 scale, None if not yet rated
    duration: Optional[str] = None  # e.g., "3 days", "2 weeks"
    notes: Optional[str] = None  # e.g., "102°F two days ago, now 100°F"
    
    def to_dict(self) -> dict:
        return {
            "name": self.name, 
            "severity": self.severity, 
            "duration": self.duration,
            "notes": self.notes
        }


@dataclass
class PatientRecord:
    """Structured patient data extracted during the conversation."""
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # Male, Female, Other, Prefer not to say
    dob: Optional[str] = None  # Date of Birth in MM-DD-YYYY format
    symptoms: list[Symptom] = field(default_factory=list)
    overall_severity: Optional[int] = None  # Fallback if patient gives single rating
    overall_duration: Optional[str] = None  # Fallback if patient gives single duration
    medications: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "dob": self.dob,
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
    
    def add_symptom(self, name: str, severity: Optional[int] = None, 
                    duration: Optional[str] = None, notes: Optional[str] = None) -> bool:
        """Add a symptom if not already present. Returns True if added."""
        # Check if symptom already exists
        for s in self.symptoms:
            if s.name.lower() == name.lower():
                # Update severity/duration/notes if provided
                if severity is not None:
                    s.severity = min(max(severity, 1), 10)
                if duration is not None:
                    s.duration = duration
                if notes is not None:
                    # Only append if not already present (avoid duplicates)
                    if s.notes:
                        if notes.lower() not in s.notes.lower():
                            s.notes = f"{s.notes}; {notes}"
                    else:
                        s.notes = notes
                return False
        # Add new symptom
        self.symptoms.append(Symptom(
            name=name, 
            severity=min(max(severity, 1), 10) if severity else None,
            duration=duration,
            notes=notes
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
    
    def set_symptom_notes(self, symptom_name: str, notes: str) -> bool:
        """Set or append notes for a specific symptom. Returns True if found."""
        for s in self.symptoms:
            if s.name.lower() == symptom_name.lower():
                if s.notes:
                    # Only append if not already present (avoid duplicates)
                    if notes.lower() not in s.notes.lower():
                        s.notes = f"{s.notes}; {notes}"
                else:
                    s.notes = notes
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
