# Phase 5: Clinician Summary Generation

## Goals
- Generate a structured professional summary after the call ends.
- Present it in a "Clinician View" on the frontend.
- Allow the user to review the final output.

## Time Estimate
- **2-3 Hours**

## Technical Approach

### 1. Triggering the Summary
We need a way to end the session.
- **User Action:** "End Call" button on frontend.
- **Agent Action:** Agent detects "I think that's everything" and calls `end_session()`.

### 2. Summary Generation (Backend)
When the session ends, we take the *entire conversation history* and the *final structured state* and ask the LLM to write a note.

**Prompt:**
> "Generate a SOAP note (Subjective, Objective, Assessment, Plan) based on this transcript and the extracted data.
> Use professional medical terminology.
> Format as Markdown."

```python
async def generate_summary(history, data):
    summary = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an expert scribe..."},
            {"role": "user", "content": f"History: {history}\nData: {data}"}
        ]
    )
    return summary.choices[0].message.content
```

### 3. Frontend Display & Editing
- **Editable Text Area:** The summary should appear in a large `<textarea>` or rich text editor.
- **Pre-fill:** The AI-generated text is the default value.
- **User Control:** The clinician can delete/rewrite sections.

### 4. Saving to Database
- Add a "Save to Record" button.
- On click, send the *final, edited* text to the backend API to update the `Session` record in SQLite.

## Testing Checklist
- [ ] Complete a full 2-minute interview.
- [ ] Click "End Call".
- [ ] Verify a summary appears within 5-10 seconds.
- [ ] **Edit Test:** Change the summary text manually.
- [ ] **Save Test:** Click "Save", refresh the page, and verify the edited version persists (if a "Past Sessions" view is implemented).

