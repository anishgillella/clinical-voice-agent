# Architecture Overview

## System Diagram

```mermaid
graph TD
    User[Patient] -->|Voice| Frontend[Next.js Frontend]
    Frontend -->|WebRTC| LiveKit[LiveKit Server]
    LiveKit -->|Audio Stream| Agent[Python Voice Agent]
    
    subgraph "Voice Infrastructure"
        LiveKit
        STT[Deepgram STT]
        TTS[ElevenLabs TTS]
    end
    
    Agent <-->|Text/Audio| LiveKit
    Agent -->|Audio| STT
    Agent <--|Text| STT
    Agent -->|Text| TTS
    Agent <--|Audio| TTS
    
    subgraph "Intelligence & State"
        Agent <-->|Function Calling| LLM[OpenAI GPT-4o Mini]
        Agent -->|Socket/RPC| Frontend
    end
    
    Frontend -->|Review| Clinician[Clinician View]
```

## Tech Stack Choices

### 1. Voice Infrastructure: **LiveKit**
- **Why:** Industry standard for real-time AI agents. Handles WebRTC complexity (echo cancellation, turn-taking, interruption handling) out of the box.
- **Components:**
  - `livekit-server`: Handles media transport.
  - `livekit-agents`: Python framework for building the agent logic.

### 2. AI Model: **OpenAI GPT-4o Mini**
- **Why:** Best balance of speed (~300ms latency), cost, and function calling reliability for this specific task.
- **Role:** Handles conversation flow, extracts entities (Name, Age, Symptoms) via function calling.

### 3. Speech Services
- **STT: Deepgram Nova-2**
  - **Why:** Lowest latency (~200ms) and high medical vocabulary accuracy.
- **TTS: ElevenLabs Turbo v2**
  - **Why:** Most natural-sounding human voices, critical for patient comfort.

### 4. Frontend: **Next.js 14 (App Router)**
- **Why:** Modern React framework, easy API routes, good performance.
- **State Sync:** Uses LiveKit's data channels or WebSockets to receive real-time updates from the Python agent.

### 5. Backend: **Python**
- **Why:** Native language for LiveKit Agents and most AI libraries.
- **Structure:** Runs the agent worker that connects to the LiveKit room.

### 6. Database: **SQLite + Prisma**
- **Why:** Simple, file-based database perfect for local demos but supports structured queries.
- **Role:** Persists patient sessions, extracted data, and clinician summaries.

## Data Flow

1. **Voice Input:** Patient speaks → Browser captures audio → Sends to LiveKit via WebRTC.
2. **Transcription:** LiveKit forwards audio to Deepgram → Returns text to Python Agent.
3. **Reasoning:** Python Agent sends text to GPT-4o Mini with current context + function definitions.
4. **Action:** 
   - If data detected: GPT-4o calls `update_patient_record`.
   - Agent executes function → Sends update to Frontend via Data Channel.
   - Frontend updates UI state (React).
5. **Response:** GPT-4o generates text response → ElevenLabs converts to audio → Played back to patient.
