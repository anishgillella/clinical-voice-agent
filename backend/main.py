"""
AI Voice Intake Agent - Main Entry Point

This module initializes and runs the LiveKit voice agent for patient intake.
"""

import os
import asyncio
import logging
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.agents.voice import AgentSession
from livekit.plugins import deepgram, openai, silero, elevenlabs

from agent import create_agent, set_room, reset_patient_record, SYSTEM_PROMPT

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-intake")


def prewarm(proc: JobProcess):
    """Prewarm the agent with VAD model."""
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for the voice agent.
    
    This function is called when a new room is created and the agent joins.
    """
    logger.info(f"Connecting to room: {ctx.room.name}")
    
    # Connect to the room (audio only - we don't need video)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for a participant to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Set up room for data broadcasting and reset patient record
    set_room(ctx.room)
    reset_patient_record()
    
    # Create the agent
    agent = create_agent()

    # Use OpenRouter for LLM
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    # Create LLM client - GPT-4o-mini handles optional function params correctly
    if openrouter_key:
        logger.info("Using OpenRouter with GPT-4o-mini for LLM")
        llm_client = openai.LLM(
            model="openai/gpt-4o-mini",
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
        )
    else:
        logger.info("Using OpenAI for LLM")
        llm_client = openai.LLM(model="gpt-4o-mini")

    # Create the agent session with voice components
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=llm_client,
        tts=elevenlabs.TTS(),
    )

    # Import transcript collector
    from agent import add_to_transcript
    
    # Collect transcript from user speech
    @session.on("user_speech_committed")
    def on_user_speech(msg):
        if hasattr(msg, 'transcript') and msg.transcript:
            add_to_transcript("patient", msg.transcript)
            logger.info(f"Patient said: {msg.transcript}")
    
    # Collect transcript from agent speech
    @session.on("agent_speech_committed")  
    def on_agent_speech(msg):
        if hasattr(msg, 'content') and msg.content:
            add_to_transcript("agent", msg.content)

    # Start the session
    await session.start(
        room=ctx.room,
        agent=agent,
    )
    
    logger.info("Agent session started successfully")

    # Send initial greeting
    await session.say(
        "Hello! I'm your medical intake assistant. Could you please start by telling me your name?",
        allow_interruptions=True
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
