# Challenges & Solutions Log

This document tracks challenges encountered during development and their solutions.

---

## Challenge 1: Gemini Function Calling Compatibility

### Issue
When switching from `openai/gpt-4o-mini` to `google/gemini-2.5-flash` via OpenRouter for the voice agent, the agent failed with `ValidationError`.

### Root Cause
Gemini's function calling implementation doesn't properly handle optional parameters. When a function parameter is optional (e.g., `symptom: Optional[str] = None`), Gemini doesn't send `null` values for unused parameters, causing Pydantic validation to fail.

### Solution
Reverted to `openai/gpt-4o-mini` via OpenRouter for the voice agent. OpenAI's models correctly pass `null` for optional parameters that aren't being used.

### Lesson Learned
Not all LLMs handle function calling identically. Test function calling thoroughly before switching models.

---

## Challenge 2: Duplicate Notes in Symptom Tracking

### Issue
When the agent called `update_patient_record` multiple times with the same symptom notes, the notes would be appended repeatedly:
```
Notes: temperature was 104°F; temperature was 104°F; temperature was 104°F
```

### Root Cause
The `set_symptom_notes` and `add_symptom` methods were blindly appending notes without checking for duplicates.

### Solution
Added duplicate detection before appending:
```python
if notes is not None:
    if s.notes:
        if notes.lower() not in s.notes.lower():
            s.notes = f"{s.notes}; {notes}"
    else:
        s.notes = notes
```

### Lesson Learned
LLMs may call the same function multiple times during a conversation. Make functions idempotent where possible.

---

## Challenge 3: Summary Not Including All Symptom Details

### Issue
The clinician summary was not showing symptom severity, duration, or notes - only the symptom name.

### Root Cause
The frontend API route (`/api/summary/route.ts`) was formatting symptoms incorrectly. It was treating symptoms as strings instead of objects with `name`, `severity`, `duration`, and `notes` properties.

### Solution
Updated the symptom formatting in the API:
```typescript
const symptomsText = symptoms.map(s => {
    let text = s.name;
    if (s.severity) text += ` (Severity: ${s.severity}/10)`;
    if (s.duration) text += ` (Duration: ${s.duration})`;
    if (s.notes) text += ` - Notes: ${s.notes}`;
    return text;
}).join('; ');
```

### Lesson Learned
When data structures change (symptoms from strings to objects), trace the entire data flow through all layers.

---

## Challenge 4: Gender Normalization

### Issue
When users said "I'm a man" or "I'm a woman", the gender field stored the raw input instead of normalized values like "Male" or "Female".

### Root Cause
No normalization logic in the `update_patient_record` function.

### Solution
Added normalization mapping:
```python
if gender is not None:
    gender_lower = gender.lower().strip()
    gender_map = {
        'male': 'Male', 'man': 'Male', 'guy': 'Male', 'm': 'Male',
        'female': 'Female', 'woman': 'Female', 'girl': 'Female', 'f': 'Female',
        'other': 'Other', 'non-binary': 'Other', 'nb': 'Other',
        'prefer not to say': 'Prefer not to say'
    }
    _patient_record.gender = gender_map.get(gender_lower, gender)
```

### Lesson Learned
User input is variable. Normalize at the point of data entry.

---

## Challenge 5: Transcript Not Being Collected

### Issue
The `transcript` array was always empty when generating summaries, even though conversations were happening.

### Root Cause
The LiveKit `AgentSession` event handlers for `user_speech_committed` and `agent_speech_committed` were not being triggered, or the transcript wasn't being properly stored.

### Solution
Added transcript collection in `main.py`:
```python
@session.on("user_speech_committed")
def on_user_speech(msg):
    if hasattr(msg, 'transcript') and msg.transcript:
        add_to_transcript("patient", msg.transcript)
```

And included transcript in the broadcast:
```python
message = json.dumps({
    "type": "UPDATE_RECORD",
    "data": _patient_record.to_dict(),
    "transcript": _transcript
})
```

### Status
Infrastructure in place. Requires testing with live session.

---

## Challenge 6: Session Disconnect on Summary Generation

### Issue
Users expected the "Generate Summary" button to end the voice session, but the session remained active.

### Root Cause
The button only generated the summary without disconnecting from LiveKit.

### Solution
Updated `handleGenerateSummary` to disconnect first:
```typescript
if (roomRef.current) {
    roomRef.current.disconnect();
    roomRef.current = null;
}
setStatus('disconnected');
setSessionEnded(true);
// Then generate summary
```

### Lesson Learned
Consider the full user flow. "Generate Summary" implies finality.

---

## Challenge 7: UI Complexity Overload

### Issue
Initial implementation added many UI components:
- Voice waveform visualizer
- Urgency badge (during intake)
- Live transcript display
- Separate differential diagnosis panel

User feedback: Too cluttered. Features should appear contextually.

### Solution
Removed standalone components from intake view. Consolidated everything into the summary view:
- Urgency assessment shown in summary
- Differential diagnosis shown in summary
- Voice waveform removed entirely
- Live transcript removed

### Lesson Learned
Start minimal. Add features to the appropriate context (intake vs. summary).

---

## Challenge 8: Test Compatibility After Refactoring

### Issue
After removing `backend/summary.py`, 13 tests failed because they imported from that module.

### Root Cause
Tests were written against the backend module, but summary generation moved to frontend API.

### Solution
Recreated a minimal `summary.py` with the required classes and functions:
- `ClinicalSummary` dataclass
- `generate_quick_summary()` function
- `parse_summary_markdown()` function
- `SUMMARY_SYSTEM_PROMPT` constant

### Lesson Learned
When refactoring, check test dependencies. Consider whether to update tests or maintain backward compatibility.

---

## Challenge 9: OpenRouter Model Configuration

### Issue
Needed to use different models for different purposes:
- Voice agent: Fast, good at function calling
- Summary generation: Good at structured output

### Root Cause
Single model configuration doesn't fit all use cases.

### Solution
Configured different models per use case:
- Voice agent: `openai/gpt-4o-mini` (reliable function calling)
- Summary: `openai/gpt-4o-mini` with JSON response format

Also tried `qwen/qwen-2.5-coder-32b-instruct` for summaries but reverted for consistency.

### Lesson Learned
Match model capabilities to task requirements.

---

## Challenge 10: Real-time Form Updates vs. Corrections

### Issue
When a patient corrects information ("Actually, I'm 25, not 24"), the form might not update if the field is locked or if the function wasn't called.

### Root Cause
Real-time function calling doesn't have full conversation context. Each call is independent.

### Proposed Solution (Not Yet Implemented)
Hybrid reparse system:
1. Real-time function calls for immediate updates
2. Periodic full-transcript reparse for corrections
3. Merge logic that respects locked fields

### Status
Documented for future implementation.

---

## Best Practices Identified

1. **Idempotent Functions** - Functions should handle repeated calls gracefully
2. **Data Normalization** - Normalize user input at entry point
3. **Model Selection** - Match model to task (function calling vs. generation)
4. **Minimal UI** - Start sparse, add contextually
5. **End-to-End Testing** - Trace data through all layers when debugging
6. **Test Compatibility** - Consider test dependencies during refactoring
7. **Session Lifecycle** - Clear user actions should have clear system responses
