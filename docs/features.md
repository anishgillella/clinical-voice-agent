# Feature Documentation: Patient History & Multi-Language Support

## Overview

This document outlines the implementation of three major features:
1. **Patient Database & Visit History** - Track patients across visits
2. **Multi-Language Support** - Spanish and Hindi voice intake
3. **Symptom Knowledge Graph** - Smart follow-up questions

---

## 1. Patient Database & Visit History

### Purpose
Enable longitudinal patient care by tracking visits across time. When a returning patient calls, the system recognizes them and provides context from previous visits.

### Data Structure

#### File Organization
```
data/
├── anish_gillella.json
├── sarah_johnson.json
└── maria_garcia.json
```

#### Patient File Schema
```json
{
  "id": "anish_gillella",
  "name": "Anish Gillella",
  "phone": "555-123-4567",
  "age": 24,
  "gender": "Male",
  "language_preference": "en",
  "created_at": "2025-12-07T16:00:00Z",
  "updated_at": "2025-12-07T16:30:00Z",
  "visits": [
    {
      "visit_id": "v_20251207_001",
      "date": "2025-12-07",
      "editable_date": true,
      "symptoms": [
        {
          "name": "fever",
          "severity": 8,
          "duration": "2 weeks",
          "notes": "temperature was 104°F"
        }
      ],
      "medications": ["Tylenol"],
      "summary": "## Patient Information...",
      "differential_diagnoses": [
        {
          "condition": "Viral URI",
          "probability": 70,
          "reasoning": "..."
        }
      ],
      "urgency": {
        "level": "soon",
        "reasoning": "High fever warrants attention",
        "timeframe": "Within 24-48 hours"
      }
    }
  ]
}
```

### API Endpoints

#### Backend (agent.py)
- `lookup_patient(name: str)` - Find patient by name
- `create_patient(name, phone, age, gender)` - Create new patient file
- `add_visit(patient_id, visit_data)` - Append visit to patient history
- `get_patient_history(patient_id)` - Retrieve all visits

#### Frontend API Routes
- `GET /api/patients?name=<name>` - Search for patient
- `POST /api/patients` - Create new patient
- `POST /api/patients/<id>/visits` - Add visit to patient
- `PUT /api/patients/<id>/visits/<visit_id>` - Update visit (e.g., change date)

### Agent Flow

1. **Name Collection Phase**
   - Agent asks: "Could you tell me your name?"
   - On receiving name, system checks for existing patient file

2. **Returning Patient Detection**
   ```
   Agent: "Welcome back, Anish! I see you visited us on December 1st 
          for a fever and cold. Is today's visit related to that, 
          or is this something new?"
   ```

3. **New Patient Flow**
   - Agent asks for phone number
   - Creates new patient file
   - Proceeds with standard intake

4. **Visit Completion**
   - When summary is generated, visit is appended to patient file
   - Date defaults to current date (editable in UI)

---



---

## 3. Symptom Knowledge Graph

### Purpose
When a patient mentions a symptom, suggest related symptoms the provider should ask about. Improves data completeness and clinical value.

### Implementation

#### Symptom Relationships (symptom_graph.json)
```json
{
  "chest pain": {
    "related": ["shortness of breath", "sweating", "arm pain", "nausea", "jaw pain"],
    "red_flags": ["radiating to arm", "crushing", "with sweating"],
    "ask": "Do you have any shortness of breath, sweating, or pain in your arm?"
  },
  "headache": {
    "related": ["nausea", "light sensitivity", "vision changes", "neck stiffness"],
    "red_flags": ["worst headache of life", "sudden onset", "with fever"],
    "ask": "Have you noticed any nausea, sensitivity to light, or neck stiffness?"
  },
  "fever": {
    "related": ["chills", "body aches", "fatigue", "cough", "sore throat"],
    "red_flags": ["over 103°F", "persistent over 3 days", "with confusion"],
    "ask": "Do you have any chills, body aches, or cough along with the fever?"
  }
}
```

#### Agent Integration
When a symptom is extracted, the agent:
1. Looks up related symptoms
2. Asks follow-up question if not already covered
3. Flags red flag symptoms for urgency assessment

```python
# In update_patient_record function
if symptom:
    related = SYMPTOM_GRAPH.get(symptom.lower(), {}).get("related", [])
    follow_up = SYMPTOM_GRAPH.get(symptom.lower(), {}).get("ask", "")
    # Agent asks follow-up if not already answered
```

---

## UI/UX Changes

### Intake View
- Language selector (top of left panel)
- "Returning patient?" indicator when match found
- Previous visit summary collapsible section

### Summary View
- Visit date picker (defaults to today)
- Previous visits timeline
- "Save to Patient Record" button

---

## File Changes Required

### Backend
- `backend/patient_db.py` - Patient CRUD operations
- `backend/data/patients/` - Patient JSON files
- `backend/data/symptom_graph.json` - Symptom relationships
- `backend/agent.py` - Updated prompts and patient lookup
- `backend/main.py` - Language-aware STT configuration

### Frontend
- `frontend/src/app/page.tsx` - Language selector, patient context
- `frontend/src/app/api/patients/route.ts` - Patient API
- `frontend/src/components/ClinicianSummary.tsx` - Date picker, visit history
- `frontend/src/types/patient.ts` - Updated types

---

## Testing Plan

1. **Patient Matching**
   - Create patient → close → reopen → verify recognition
   - Multiple patients with similar names
   - Case insensitivity

2. **Multi-Language**
   - Full intake in Spanish
   - Full intake in Hindi
   - Verify summary in English

3. **Symptom Graph**
   - Mention chest pain → verify follow-up questions
   - Verify red flags increase urgency score

---

## Security Considerations

- Patient files contain PHI - would need encryption in production
- Phone numbers stored in plain text - consider hashing
- No authentication in demo - would need in production
- Local file storage - would use encrypted DB in production
