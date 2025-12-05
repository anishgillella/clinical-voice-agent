# Phase 2: Real-Time Function Calling

## Goals
- Define the data schema for patient intake.
- Implement OpenAI function calling to extract data.
- Transmit extracted data to the frontend in real-time.

## Time Estimate
- **4-6 Hours**

## Technical Approach

### 1. Data Schema
We need a structured Pydantic model to define what we want to extract.

```python
class PatientData(pydantic.BaseModel):
    name: str | None
    age: int | None
    symptoms: list[str]
    pain_level: int | None # 1-10
    duration: str | None
```

### 2. Function Definition
We will register a function `update_patient_record` that the LLM can call.

```python
# agent.py extension

fnc_ctx = llm.FunctionContext()

@fnc_ctx.ai_callable(description="Update the patient's medical record based on conversation")
async def update_patient_record(
    name: Annotated[str, llm.TypeInfo(description="Patient's full name")] = None,
    age: Annotated[int, llm.TypeInfo(description="Patient's age")] = None,
    # ... other fields
):
    # 1. Update local state
    current_state.update({k: v for k, v in locals().items() if v is not None})
    
    # 2. Broadcast to frontend via LiveKit Data Packet
    await ctx.room.local_participant.publish_data(
        json.dumps({"type": "UPDATE_RECORD", "data": current_state}),
        reliable=True
    )
```

### 3. Prompt Engineering
The system prompt must encourage the agent to call the function **immediately** when it hears relevant info, not wait.

**System Prompt:**
> "You are a medical intake assistant. Your goal is to gather the patient's Name, Age, and Symptoms.
> IMPORTANT: Whenever the patient provides this information, you MUST call the `update_patient_record` tool immediately.
> Do not ask for everything at once. Be conversational."

### 4. State Management & Conflict Resolution ("User Wins")
- **The Problem:** If the user manually edits "Headache" to "Migraine", the AI shouldn't overwrite it back to "Headache" just because the patient mentioned it again.
- **The Solution:** Implement a **Field Locking Mechanism**.
    - When `update_patient_record` is called, the frontend checks if a field has been manually edited by the user (is "dirty").
    - If `dirty == true`, the AI update for that specific field is **ignored**.
    - Visual cue: "Locked" icon next to user-edited fields.

### 5. Database Persistence
We will use **Prisma** with **SQLite** to save sessions.

**Schema:**
```prisma
model Session {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  
  // Extracted Data
  patientName String?
  patientAge  Int?
  symptoms    String? // JSON string
  
  // Full Transcript
  transcript  String?
  
  // Final Summary
  clinicalSummary String?
}
```

- **Auto-Save:** The Python agent should periodically (or on change) save the current state to the DB.


## Testing Checklist
- [ ] Speak to the agent: "My name is John and I'm 45."
- [ ] Verify in console logs that `update_patient_record` was called with `name="John", age=45`.
- [ ] Verify the agent continues the conversation naturally after calling the function.
- [ ] Test partial updates: "I have a headache" (should update symptoms without erasing name).

## Common Pitfalls
- **Hallucinations:** GPT-4o Mini might guess values. Use strict descriptions in `TypeInfo`.
- **Latency:** Function calling adds a small delay. Ensure the agent doesn't pause awkwardly.
- **Over-calling:** Ensure the agent doesn't call the function if no *new* info is added.
