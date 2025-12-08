# AI Voice Intake & Clinician Review

## Overview

A real-time voice intake system that screens patients through conversational AI, visualizes data as it's gathered, and generates structured clinical summaries for healthcare providers.

## The Challenge

Build a prototype of a **"Live Voice Intake Agent"** that:
- Screens patients through natural conversation
- Visualizes collected data in real-time
- Generates structured summaries for clinician review

---

## Core Components

### Part 1: The Patient Experience (Real-Time Function Calling & Editing)

Build a voice interface where an AI agent conducts patient interviews with live data extraction and visualization.

#### Live Session Summary

As the patient speaks, the application must extract relevant data points and update a visible form on the screen **in real-time**.

**Data to Gather:**
- **Basic Demographics**: Name, Age, Gender
- **Medical Complaint**: Symptom List, Duration, Severity, Medication History

#### The Mechanism: Real-Time Function Calling

Do **not** wait until the end of the call to parse data. Use **LLM Function Calling (Tool Use)** during the conversation flow to trigger UI updates.

**Example Flow:**
1. **Agent**: "Could you tell me your name and how old you are?"
2. **Patient**: "I'm Sarah, and I'm 34."
3. **System Action**: Triggers `update_patient_record(name="Sarah", age=34)`
4. **UI Action**: The "Name" and "Age" fields on the screen automatically populate

#### Interactive Editing

- Patients must be able to **view** the information as the call is happening
- Patients can **manually edit** fields on the screen (e.g., fixing a name spelling or changing severity level) while continuing to talk
- State must remain **synchronized** between voice input and manual edits

#### Guardrails

The agent must be resilient to off-topic conversations:
- If the patient discusses irrelevant topics (e.g., weather, pets), the agent should politely acknowledge
- Steer the conversation back to medical intake
- **Never hallucinate** medical data from off-topic chatter

### Part 2: The Clinician Experience (Automated Summarization)

Once intake is complete, the application switches to **"Clinician Mode."**

#### Summarization

Automatically generate a **structured clinical note** from the session for clinician review, including:
- Patient demographics
- Chief complaint
- Symptom details
- Medical history
- Any other relevant information gathered

---

## Technical Requirements

### 1. Voice Stack

**Allowed:**
- Any STT (Speech-to-Text) provider: Deepgram, OpenAI Whisper, Google Cloud
- Any TTS (Text-to-Speech) provider: ElevenLabs, OpenAI, Google Cloud
- Browser-native APIs

**Required:**
- Core **Voice Agent Infrastructure** must be implemented **in-house**:
  - Orchestration
  - State management
  - Turn-taking logic
- May use custom code or open-source libraries (e.g., **LiveKit** or alternatives)

**Not Allowed:**
- Fully managed "Voice-as-a-Service" platforms (e.g., Vapi, Bland AI) that abstract away engineering challenges

### 2. LLM Orchestration

Use an LLM capable of **reliable function calling**:
- OpenAI
- Anthropic
- Open source alternatives

### 3. Frontend

A web interface demonstrating:
- Live Session Summary updates
- User editing capabilities
- Clinician summary view

---

## Submission Requirements

### 1. Code Repository
- **GitHub link** to your source code
- Clean, well-organized codebase
- Follow best practices

### 2. Demo Video (2-3 minutes)

A screen recording showing:

1. **Live Data Population**: You speaking as a patient with fields (Name, Age, Symptoms, etc.) populating in real-time
2. **Interactive Editing**: You manually editing a field (e.g., correcting the Name) while the call is still active
3. **Clinician Summary**: The structured summary report generated for clinician review

### 3. README Documentation

Include:
- Brief explanation of the **tech stack**
- Clear instructions on **how to run the application locally**
- Any prerequisites or dependencies
- Environment setup guide

---

## Getting Started

### Prerequisites

```bash
# Node.js version 18+ (for frontend)
# Python version 3.12+ (for backend)
# FFmpeg (for audio processing)

# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Installation

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configuration

**Environment Variables:**

Create `.env` file in the root directory:
```bash
# LLM Provider (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key

# LiveKit (Voice Infrastructure)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Frontend (Next.js)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# Speech Services (automatically configured)
# Deepgram STT - Uses LiveKit's Deepgram integration
# ElevenLabs TTS - Uses LiveKit's ElevenLabs integration
```

**API Key Setup:**
1. **OpenRouter**: Get API key from [https://openrouter.ai/](https://openrouter.ai/)
2. **LiveKit**: Create account at [https://livekit.io/](https://livekit.io/) → Get API credentials

### Running Locally

**Terminal 1 - Backend (Voice Agent):**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py dev
```

**Terminal 2 - Frontend (Web Interface):**
```bash
cd frontend
npm run dev
```

**Access:**
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend logs: View in Terminal 1

---

## Project Structure

```
clinical-voice-agent/
├── frontend/                      # Next.js web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main intake interface
│   │   │   └── api/
│   │   │       ├── token/        # LiveKit token generation
│   │   │       └── summary/      # Clinical summary generation
│   │   ├── components/
│   │   │   ├── PatientForm.tsx   # Real-time editable form
│   │   │   ├── ClinicianSummary.tsx  # Summary view
│   │   │   ├── LiveTranscript.tsx    # Conversation display
│   │   │   └── VoiceWaveform.tsx # Audio visualization
│   │   └── types/
│   │       └── patient.ts        # TypeScript interfaces
│   └── package.json
│
├── backend/                       # Python voice agent
│   ├── main.py                   # LiveKit worker entry point
│   ├── agent.py                  # LLM orchestration & function calling
│   ├── patient_db.py             # Patient data management
│   ├── data/
│   │   └── symptom_graph.json   # Medical knowledge graph
│   └── requirements.txt
│
├── data/                          # Patient records (auto-created)
│   └── [patient_name].json       # Individual patient files
│
├── docs/
│   ├── features.md               # Feature documentation
│   └── challenges.md             # Development challenges log
│
└── README.md
```

---

## Tech Stack

### Voice Infrastructure
- **LiveKit** - Real-time voice orchestration, state management, turn-taking logic
- **Custom Agent Implementation** - Proprietary LLM integration and function calling

### LLM Provider
- **OpenRouter** with **GPT-4o-mini** - Function calling and conversational AI
- Real-time `update_patient_record()` function calls during conversation

### Speech Services
- **STT**: Deepgram Nova-2 (via LiveKit plugin)
- **TTS**: ElevenLabs (via LiveKit plugin)
- **VAD**: Silero Voice Activity Detection

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Styling
- **LiveKit Client SDK** - Real-time audio and data channels

### Backend
- **Python 3.12** - Agent runtime
- **LiveKit Agents SDK** - Voice agent framework
- **JSON** - Patient database (file-based for demo)

---

## Features

### Core Requirements
- ✅ Real-time voice-to-text transcription (Deepgram)
- ✅ Live UI updates via LLM function calling
- ✅ Interactive patient record editing during call
- ✅ Conversation guardrails and topic steering
- ✅ Structured clinical note generation (SOAP format)
- ✅ Clinician review interface

### Enhanced Features
- ✅ **Patient History Tracking** - Persistent JSON database with visit history
- ✅ **Returning Patient Recognition** - Welcomes back patients with context
- ✅ **Symptom Knowledge Graph** - Intelligent follow-up questions
- ✅ **Urgency Assessment** - Automatic triage level calculation
- ✅ **Differential Diagnoses** - AI-powered probable conditions
- ✅ **Live Transcript** - Real-time conversation display
- ✅ **Voice Waveform** - Visual audio feedback
- ✅ **Lock/Unlock Fields** - Prevent or allow voice updates per field
- ✅ **Phone Number Collection** - Patient identification
- ✅ **Gender Recognition** - Normalizes various inputs

---

## Demo Checklist

### Required Demo Elements (2-3 minutes)
1. ✅ **Live Data Population**
   - Show voice conversation
   - Watch Name, Age, Symptoms populate in real-time
   - Demonstrate multiple symptom entries

2. ✅ **Interactive Editing**
   - Manually edit a field (e.g., correct name spelling)
   - Continue talking while edit persists
   - Lock a field to prevent voice updates

3. ✅ **Clinician Summary**
   - Generate structured SOAP note
   - Show urgency assessment
   - Display differential diagnoses

### Bonus Demo Elements
- Patient history (create patient → return later)
- Symptom follow-up questions
- Conversation guardrails (off-topic handling)

---

## Development Notes

### Running Tests
```bash
cd backend
pytest
```

### Patient Data Location
- Patient files stored in: `data/[patient_name].json`
- Auto-generated on first patient interaction
- Updated on subsequent visits

### Troubleshooting
**Backend won't start:**
- Check `.env` has all required variables
- Verify LiveKit credentials are correct
- Ensure port 8080 is available

**No audio in browser:**
- Check microphone permissions
- Verify LiveKit URL is accessible
- Check browser console for errors

**Fields not updating:**
- Check backend logs for function calls
- Verify WebSocket connection in Network tab
- Ensure fields are not locked

---

## License

MIT License - See LICENSE file for details

---

## Contact

For questions about this implementation, please open an issue in the repository.
