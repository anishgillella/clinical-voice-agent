# Phase 4: Guardrails & Conversation Management

## Goals
- Prevent the agent from getting distracted by off-topic chatter.
- Ensure the agent doesn't hallucinate medical data from irrelevant context.
- Implement a "polite redirect" strategy.

## Time Estimate
- **2-3 Hours**

## Technical Approach

### 1. System Prompt Engineering
The most effective guardrail is a robust system prompt.

**Key Instructions to Add:**
> "You are strictly a medical intake assistant.
> IF the user talks about unrelated topics (weather, sports, news), politely acknowledge it ONCE, then immediately steer back to their health.
> Example: 'I hear you, the weather has been crazy. But to help the doctor, could you tell me more about that pain?'
> NEVER invent symptoms that weren't explicitly stated."

### 2. Hallucination Prevention
- **Constraint:** In the `update_patient_record` function, use `enum` for fields like "Severity" (Low, Medium, High) or strict integer ranges.
- **Verification:** If the user says "I feel like a million bucks," ensure the agent doesn't log "Wealth: $1M" or "Mood: Manic" unless clinically relevant.

### 3. Emergency Keywords (Basic)
We can add a simple keyword spotter in the Python agent loop.

```python
EMERGENCY_KEYWORDS = ["suicide", "kill myself", "chest pain", "can't breathe"]

# In the agent loop
if any(keyword in transcript.lower() for keyword in EMERGENCY_KEYWORDS):
    # 1. Trigger visual alert on frontend
    await send_alert_to_frontend("EMERGENCY_DETECTED")
    # 2. Agent response override
    await agent.say("I am concerned about what you just said. Please seek immediate medical attention.")
```

## Testing Checklist
- [ ] **Off-topic Test:** Talk about the weather for 3 turns. Agent should bring it back to medical topics.
- [ ] **Hallucination Test:** Tell a joke. Agent should not add "Joking" to the symptom list.
- [ ] **Emergency Test:** Say "I'm having chest pain." Verify the response is appropriate.

## Common Pitfalls
- **Being too rude:** The redirect should be empathetic, not robotic.
- **Getting stuck:** Ensure the agent doesn't loop "Let's get back to medical info" if the user *is* trying to explain a complex symptom in a roundabout way.
