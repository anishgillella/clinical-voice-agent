# Phase 1: Voice Infrastructure & Core Agent

## Goals
- Set up a local LiveKit environment.
- Implement a basic Python voice agent that can hear and speak.
- Integrate Deepgram (STT) and ElevenLabs (TTS).
- Verify end-to-end audio latency is under 1 second.

## Time Estimate
- **3-5 Hours**

## Technical Approach

### 1. LiveKit Setup
We will use the **LiveKit CLI** for local development to avoid cloud deployment complexity during the initial build.

```bash
# Install LiveKit CLI
brew install livekit

# Start local server
livekit-server --dev
```

### 2. Python Agent Structure
We will use the `livekit-agents` library.

**File Structure:**
```
backend/
  ├── main.py            # Entry point
  ├── agent.py           # Agent logic
  ├── requirements.txt   # Dependencies
  └── .env              # API Keys
```

**Dependencies:**
```text
livekit-agents
livekit-plugins-openai
livekit-plugins-deepgram
livekit-plugins-elevenlabs
python-dotenv
```

### 3. Agent Implementation
The agent will be a `VoicePipelineAgent` which pre-assembles STT, LLM, and TTS.

```python
# agent.py snippet
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.plugins import deepgram, elevenlabs, openai

async def entrypoint(ctx: JobContext):
    initial_ctx = llm.ChatContext().append(
        role="system",
        text="You are a medical intake assistant. Ask the patient for their name and symptoms."
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS(),
        chat_ctx=initial_ctx,
    )

    agent.start(ctx.room)
```

## Testing Checklist
- [ ] Run `livekit-server --dev`.
- [ ] Run `python main.py dev`.
- [ ] Connect to the local room using the [LiveKit Connection Tester](https://agents-playground.livekit.io/).
- [ ] Verify you can speak and the agent responds.
- [ ] Verify the voice sounds natural (ElevenLabs) and transcription is fast (Deepgram).

## Common Pitfalls
- **API Keys:** Ensure `.env` has `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`.
- **Audio Permissions:** Browser needs microphone permission.
- **VAD (Voice Activity Detection):** If the agent interrupts too much, tune the VAD sensitivity.
