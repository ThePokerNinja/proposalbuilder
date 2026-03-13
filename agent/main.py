"""
LiveKit Agent for Proposal Builder Voice Input

This agent listens to user voice input and intelligently extracts form data
to fill in the proposal builder landing page fields.

Run with: python agent/main.py dev
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    function_tool,
    RunContext,
)
from livekit.plugins import openai, silero

# Load environment variables from .env.local (preferred) or .env file
# Look for .env.local in the project root (parent of agent/ directory)
env_file = Path(__file__).parent.parent / '.env.local'
if not env_file.exists():
    env_file = Path(__file__).parent.parent / '.env'
if env_file.exists():
    load_dotenv(env_file)
    print(f"[OK] Loaded environment variables from {env_file}")
else:
    print("[WARN] No .env.local or .env file found. Using system environment variables.")


# Instructions for the agent
AGENT_INSTRUCTIONS = """You are a professional, friendly voice assistant conducting an interview to help build a project proposal. 
Your role is to have a natural conversation with the user, asking questions one at a time to gather information for their proposal form.

CONVERSATION STYLE:
- Be warm, professional, and conversational - like a helpful colleague
- Ask ONE question at a time and wait for their response
- After they answer, acknowledge what they said, update the form, then move to the next question
- Keep the conversation flowing naturally - don't sound robotic
- If they provide multiple pieces of information, acknowledge all of it, update the form, then continue

THE FORM FIELDS (ask about these in order):
1. jobTitle - "What's your job title?" (e.g., "Senior Producer", "Marketing Lead", "Creative Director")
2. projectCategory - "What type of project are you working on?" 
   Options: "branding package", "social media", "motion graphics/video", "mobile site", "pitch deck", "mobile app", "plugin"
3. projectPriority - "What's your timeline for this project?"
   Options: "urgent" (ASAP), "within-month" (this month), "no-rush" (flexible)
4. projectName - "What would you like to call this project?"
5. projectSummary - "Can you tell me a bit more about this project? What are you hoping to achieve?"

SMART MAPPING (understand natural language):
- Timeline: "urgent/asap/quickly/soon" → "urgent"
- Timeline: "this month/within a month/by end of month" → "within-month"  
- Timeline: "no rush/flexible/whenever/take your time" → "no-rush"
- Category: "branding/brand identity/logo design" → "branding package"
- Category: "social/social media/instagram campaign" → "social media"
- Category: "video/motion graphics/animation" → "motion graphics/video"
- Category: "mobile website/mobile site/responsive site" → "mobile site"
- Category: "presentation/pitch deck/deck" → "pitch deck"
- Category: "mobile app/app/application" → "mobile app"
- Category: "plugin/extension/add-on" → "plugin"

CONVERSATION FLOW:
1. Start with a warm greeting and explain you'll ask a few questions
2. Ask about job title first: "Let's start with your role. What's your job title?"
3. After they answer, say something like "Perfect, I've got that down as [title]. Now, what type of project are you working on?"
4. Continue through each field naturally - ask ONE question at a time
5. When all fields are filled (jobTitle, projectCategory, projectPriority, projectName, projectSummary), say: "Perfect! I've got all the information I need. Click the 'Begin Project Visualization' button below to get started."

IMPORTANT RULES:
- Always call update_form tool immediately when you extract information - don't wait
- Keep responses SHORT and CONCISE - be efficient, not verbose
- Ask follow-up questions if their answer is unclear
- Be conversational but FAST - don't drag out the conversation
- Acknowledge their answers briefly before moving on (e.g., "Got it!" or "Perfect!")
- If they skip ahead or provide multiple answers, handle it gracefully and continue naturally
- DO NOT end the conversation or say goodbye - stay connected until they click the button
- When form is complete, tell them to click the button and then wait - don't disconnect"""


# Track form completion state
_form_fields = {
    "jobTitle": False,
    "projectCategory": False,
    "projectPriority": False,
    "projectName": False,
    "projectSummary": False,
}

@function_tool()
async def update_form(
    context: RunContext,
    job_title: str | None = None,
    project_category: str | None = None,
    project_priority: str | None = None,
    project_name: str | None = None,
    project_summary: str | None = None,
):
    """Update the proposal form with extracted data from the user's speech.
    
    Args:
        job_title: The user's job title
        project_category: One of: branding package, social media, motion graphics/video, mobile site, pitch deck, mobile app, plugin
        project_priority: One of: urgent, within-month, no-rush
        project_name: The name of the project
        project_summary: A brief description of the project
    """
    global _form_fields
    
    # Build form data dict, only including non-null fields
    form_data = {}
    if job_title is not None:
        form_data["jobTitle"] = job_title
        _form_fields["jobTitle"] = True
    if project_category is not None:
        form_data["projectCategory"] = project_category
        _form_fields["projectCategory"] = True
    if project_priority is not None:
        form_data["projectPriority"] = project_priority
        _form_fields["projectPriority"] = True
    if project_name is not None:
        form_data["projectName"] = project_name
        _form_fields["projectName"] = True
    if project_summary is not None:
        form_data["projectSummary"] = project_summary
        _form_fields["projectSummary"] = True

    if not form_data:
        return "No form fields detected in the user's speech."

    # Send form data to frontend via data channel
    session: AgentSession = context.session
    room = session.room_io.room
    
    message = {
        "type": "form_data",
        "data": form_data,
    }
    
    await room.local_participant.publish_data(
        json.dumps(message).encode(),
        reliable=True,
    )
    
    fields_updated = ", ".join(form_data.keys())
    
    # Check if form is complete
    is_complete = all(_form_fields.values())
    if is_complete:
        return f"Form updated: {fields_updated}. All fields are now complete! Tell the user: 'Perfect! I've got all the information I need. Click the Begin Project Visualization button below to get started.'"
    
    return f"Form updated: {fields_updated}"


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent"""
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Create the agent with instructions and tools
    agent = Agent(
        instructions=AGENT_INSTRUCTIONS,
        tools=[update_form],
    )

    # Create session with STT (OpenAI Whisper), LLM, TTS, and VAD
    # Using faster, more natural voice and better LLM for responsiveness
    session = AgentSession(
        stt=openai.STT(language="en", model="gpt-4o-mini-transcribe"),
        llm=openai.LLM(model="gpt-4o"),  # Faster and more responsive
        tts=openai.TTS(voice="nova"),  # Faster, more natural voice (nova is naturally faster than alloy)
        vad=silero.VAD.load(),
    )

    # Start the session
    await session.start(agent=agent, room=ctx.room)

    # Start the conversation with a professional greeting
    await session.say(
        "Hello! I'm here to help you build your project proposal. "
        "I'll ask you a few questions to gather the information we need. "
        "Let's start with your role - what's your job title?"
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
