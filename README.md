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
# Add your prerequisites here
# Node.js version X.X.X
# Python version X.X.X
# etc.
```

### Installation

```bash
# Add installation steps
npm install
# or
pip install -r requirements.txt
```

### Configuration

```bash
# Add environment variables needed
cp .env.example .env
# Configure your API keys for:
# - LLM provider
# - STT provider
# - TTS provider
# - LiveKit or voice infrastructure
```

### Running Locally

```bash
# Add commands to run the application
npm run dev
# or
python main.py
```

---

## Project Structure

```
# Add your project structure here
├── frontend/          # Web interface
├── backend/           # Voice agent infrastructure
├── agent/             # LLM orchestration & function calling
└── README.md
```

---

## Tech Stack

### Voice Infrastructure
- [Your choice: LiveKit, custom implementation, etc.]

### LLM Provider
- [OpenAI, Anthropic, or open source]

### Speech Services
- **STT**: [Deepgram, Whisper, etc.]
- **TTS**: [ElevenLabs, OpenAI, etc.]

### Frontend
- [React, Next.js, Vue, etc.]

### Backend
- [Node.js, Python, etc.]

---

## Features

- ✅ Real-time voice-to-text transcription
- ✅ Live UI updates via LLM function calling
- ✅ Interactive patient record editing during call
- ✅ Conversation guardrails and topic steering
- ✅ Structured clinical note generation
- ✅ Clinician review interface

---

## License

[Add your license here]

---

## Contact

[Add your contact information]
