"""
Patient Database Module

Handles patient storage, retrieval, and visit history tracking.
Each patient is stored as a separate JSON file named by their name.
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict, field
import re

# Data directory for patient files (in root data folder)
# backend/patient_db.py -> backend -> root -> data
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)


@dataclass
class Visit:
    """Represents a single patient visit."""
    visit_id: str
    date: str
    symptoms: List[Dict[str, Any]]
    medications: List[str]
    summary: str = ""
    differential_diagnoses: List[Dict[str, Any]] = field(default_factory=list)
    urgency: Optional[Dict[str, Any]] = None
    related_to_previous: Optional[bool] = None
    notes: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass 
class Patient:
    """Represents a patient with their visit history."""
    id: str
    name: str
    dob: str  # Date of Birth in MM-DD-YYYY format
    age: Optional[int] = None
    gender: Optional[str] = None
    language_preference: str = "en"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    visits: List[Visit] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['visits'] = [v.to_dict() if isinstance(v, Visit) else v for v in self.visits]
        return data
    
    def get_last_visit(self) -> Optional[Visit]:
        """Get the most recent visit."""
        if self.visits:
            return self.visits[-1] if isinstance(self.visits[-1], Visit) else Visit(**self.visits[-1])
        return None
    
    def get_visit_summary(self) -> str:
        """Get a brief summary of visit history."""
        if not self.visits:
            return "No previous visits on record."
        
        last = self.visits[-1] if isinstance(self.visits[-1], dict) else self.visits[-1].to_dict()
        symptoms = [s.get('name', s) if isinstance(s, dict) else s for s in last.get('symptoms', [])]
        
        return f"Last visited on {last.get('date', 'unknown date')} for {', '.join(symptoms[:3]) if symptoms else 'a consultation'}."


def name_to_filename(name: str) -> str:
    """Convert patient name to safe filename."""
    # Lowercase, replace spaces with underscores, remove special chars
    safe_name = re.sub(r'[^\w\s-]', '', name.lower())
    safe_name = re.sub(r'[\s-]+', '_', safe_name)
    return f"{safe_name}.json"


def get_patient_filepath(name: str) -> str:
    """Get the full file path for a patient."""
    return os.path.join(DATA_DIR, name_to_filename(name))


def patient_exists(name: str) -> bool:
    """Check if a patient file exists."""
    return os.path.exists(get_patient_filepath(name))


def load_patient(name: str) -> Optional[Patient]:
    """Load a patient from their JSON file."""
    filepath = get_patient_filepath(name)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Convert visits back to Visit objects
        visits = []
        for v in data.get('visits', []):
            if isinstance(v, dict):
                visits.append(Visit(**v))
            else:
                visits.append(v)
        
        return Patient(
            id=data.get('id', name_to_filename(name).replace('.json', '')),
            name=data.get('name', name),
            dob=data.get('dob', ''),
            age=data.get('age'),
            gender=data.get('gender'),
            language_preference=data.get('language_preference', 'en'),
            created_at=data.get('created_at', datetime.now().isoformat()),
            updated_at=data.get('updated_at', datetime.now().isoformat()),
            visits=visits
        )
    except Exception as e:
        print(f"Error loading patient {name}: {e}")
        return None


def save_patient(patient: Patient) -> bool:
    """Save a patient to their JSON file."""
    filepath = get_patient_filepath(patient.name)
    
    try:
        patient.updated_at = datetime.now().isoformat()
        with open(filepath, 'w') as f:
            json.dump(patient.to_dict(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving patient {patient.name}: {e}")
        return False


def create_patient(name: str, dob: str = "", age: Optional[int] = None, 
                   gender: Optional[str] = None, language: str = "en") -> Patient:
    """
    Create a new patient or update existing one.
    If patient exists, updates their demographic info instead of creating new.
    """
    if patient_exists(name):
        return update_patient_info(name, age=age, gender=gender, dob=dob, language=language)

    patient_id = name_to_filename(name).replace('.json', '')
    
    patient = Patient(
        id=patient_id,
        name=name,
        dob=dob,
        age=age,
        gender=gender,
        language_preference=language,
        visits=[]
    )
    
    save_patient(patient)
    return patient


def add_visit_to_patient(name: str, symptoms: List[Dict], medications: List[str],
                         summary: str = "", differential_diagnoses: List[Dict] = None,
                         urgency: Dict = None, related_to_previous: bool = None,
                         date: str = None) -> Optional[Visit]:
    """Add a new visit to an existing patient."""
    patient = load_patient(name)
    
    if not patient:
        return None
    
    # Generate visit ID
    visit_count = len(patient.visits) + 1
    visit_id = f"v_{datetime.now().strftime('%Y%m%d')}_{visit_count:03d}"
    
    # Use current date if not provided
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')
    
    visit = Visit(
        visit_id=visit_id,
        date=date,
        symptoms=symptoms,
        medications=medications,
        summary=summary,
        differential_diagnoses=differential_diagnoses or [],
        urgency=urgency,
        related_to_previous=related_to_previous
    )
    
    patient.visits.append(visit)
    save_patient(patient)
    
    return visit


def update_patient_info(name: str, age: int = None, gender: str = None,
                        dob: str = None, language: str = None) -> Optional[Patient]:
    """Update patient demographic information."""
    patient = load_patient(name)
    
    if not patient:
        return None
    
    if age is not None:
        patient.age = age
    if gender is not None:
        patient.gender = gender
    if dob is not None:
        patient.dob = dob
    if language is not None:
        patient.language_preference = language
    
    save_patient(patient)
    return patient


def search_patients(query: str) -> List[Patient]:
    """Search for patients by name (partial match)."""
    results = []
    query_lower = query.lower()
    
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            # Check if query matches filename
            if query_lower in filename.lower():
                patient = load_patient(filename.replace('.json', '').replace('_', ' '))
                if patient:
                    results.append(patient)
    
    return results


def get_all_patients() -> List[Patient]:
    """Get all patients in the database."""
    patients = []
    
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(DATA_DIR, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                patients.append(Patient(**data))
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    
    return patients


def get_patient_context(name: str) -> Dict[str, Any]:
    """Get context about a patient for the agent."""
    patient = load_patient(name)
    
    if not patient:
        return {
            "is_returning": False,
            "message": None
        }
    
    last_visit = patient.get_last_visit()
    
    if not last_visit:
        return {
            "is_returning": True,
            "patient": patient.to_dict(),
            "message": f"I found your record, {patient.name}. This appears to be your first visit with us.",
            "previous_visits": 0
        }
    
    # Get symptoms from last visit
    last_symptoms = [s.get('name', str(s)) if isinstance(s, dict) else str(s) 
                     for s in (last_visit.symptoms if isinstance(last_visit, Visit) 
                               else last_visit.get('symptoms', []))]
    
    last_date = last_visit.date if isinstance(last_visit, Visit) else last_visit.get('date', 'recently')
    
    return {
        "is_returning": True,
        "patient": patient.to_dict(),
        "previous_visits": len(patient.visits),
        "last_visit_date": last_date,
        "last_symptoms": last_symptoms[:3],
        "message": f"Welcome back, {patient.name}! I see you visited us on {last_date} for {', '.join(last_symptoms[:2]) if last_symptoms else 'a consultation'}. Is today's visit related to that, or is this something new?"
    }
