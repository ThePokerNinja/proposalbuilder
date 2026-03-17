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

# Some environments set SSL key logging to restricted paths, which breaks LiveKit's
# underlying SSL context creation on Windows. Clear this to avoid PermissionError.
os.environ.pop("SSLKEYLOGFILE", None)

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
AGENT_INSTRUCTIONS = """You are a professional, helpful voice assistant guiding users through building a project proposal. 
Your role is to ask questions ONE AT A TIME, wait for answers, update the form, and guide them step-by-step.

CRITICAL WORKFLOW - Follow this exact sequence:

PHASE 1: BASIC FORM FIELDS (ask these in order, one at a time):
- Check context first - only ask about fields that are NOT already filled
- If a field is already filled in context, SKIP it and move to the next unanswered field
- BEFORE asking each question, ALWAYS call send_focus_message(field="fieldName") to highlight that field in the UI
- Then ask the question, wait for answer, call update_form, then move to next
1. jobTitle - If not filled: Call send_focus_message(field="jobTitle"), then ask "What's your job title?" Wait for answer, call update_form, then move to next.
2. projectCategory - If not filled: Call send_focus_message(field="projectCategory"), then ask "What type of project are you working on?" Options: branding package, social media, motion graphics/video, mobile site, pitch deck, mobile app, plugin. Wait for answer, call update_form, then move to next.
3. projectPriority - If not filled: Call send_focus_message(field="projectPriority"), then ask "What's your timeline?" Options: urgent (ASAP), within-month (this month), no-rush (flexible). Wait for answer, call update_form, then move to next.
4. projectName - If not filled: Call send_focus_message(field="projectName"), then ask "What would you like to call this project?" Wait for answer, call update_form, then move to next.
5. projectSummary - If not filled: Call send_focus_message(field="projectSummary"), then ask "Can you tell me more about this project? What are you hoping to achieve?" Wait for answer, call update_form.

PHASE 1.5: RESEARCH STEP (after all basic fields are complete):
- TRIGGER CONDITIONS: Only enter this phase when ALL of the following are true:
  1. All 5 basic fields are filled (jobTitle, projectCategory, projectPriority, projectName, projectSummary)
  2. context.flowStep === 'research' (research step is active)
  3. You have NOT yet started asking discovery questions (PHASE 2)
- CRITICAL: Do NOT talk about research if you are already in PHASE 2 (discovery questions)
- CRITICAL: Do NOT mention research when answering discovery questions - only focus on the current question
- When you see that research is being generated (check context.flowStep === 'research' AND you haven't started PHASE 2):
  * Say: "Great! I've got all your basic information. Now I'm generating real-time market research based on existing trends and best practices for your project. This will help us create a more accurate estimate."
  * Then say: "Once the research is complete, please either hit Enter or click the Next button to advance past the research section. I'll then guide you through some discovery questions."
- CRITICAL: After telling the user to hit Enter/Next, you must ACTIVELY MONITOR the context
- Check context.flowStep on EVERY turn - when it becomes 'questions', IMMEDIATELY proceed to PHASE 2
- DO NOT wait for the user to say anything - when flowStep === 'questions', start asking discovery questions right away
- Once flowStep becomes 'questions' AND context.questions.total > 0, IMMEDIATELY start PHASE 2
- DO NOT mention research again once you've started PHASE 2 - focus only on discovery questions

PHASE 2: DISCOVERY QUESTIONS (after research is advanced):
- TRIGGER: When context.flowStep === 'questions' AND context.questions.total > 0, IMMEDIATELY start this phase
- CRITICAL: Check context.flowStep on EVERY turn - if it's 'questions', you MUST start asking questions immediately
- DO NOT wait for user input - start asking questions as soon as flowStep becomes 'questions'
- DO NOT wait for the user to say "ready" or anything - just start asking when you see flowStep === 'questions'
- CRITICAL: Once you are in PHASE 2, DO NOT mention research again - focus ONLY on discovery questions
- CRITICAL: DO NOT talk about research when answering discovery questions - only acknowledge the answer and ask the next question
- Check context.questions.allIds to see all available question IDs
- Check context.answersSummary to see which questions are already answered (array of {id, value})
- Find the FIRST question ID in allIds that is NOT in answersSummary
- CRITICAL WORKFLOW for each question:
  1. FIRST: Call send_focus_message(question_id="questionId") to advance UI to that question
  2. THEN: Ask the question verbally (use context.questions.allTexts to get the question text)
  3. WAIT for user's response
  4. Call update_question_answer(question_id="questionId", answer_value=their_answer)
  5. IMMEDIATELY AFTER: Find the next unanswered question ID from context.questions.allIds
  6. Call send_focus_message(question_id="nextQuestionId") to advance UI to next question
  7. THEN acknowledge ("Got it!" or "Perfect!") and ask the next question - DO NOT mention research
- Start with: "Perfect! Now let's dive deeper. [Send focus for first question, then ask it]"
- Continue through ALL unanswered questions one at a time
- For multi-select questions, let them select multiple options before moving on
- NEVER ask a question without first calling send_focus_message for that question
- ALWAYS send focus for the next question IMMEDIATELY after update_question_answer - this is critical for UI to advance
- NEVER mention research, market research, or the research step while in PHASE 2 - only focus on discovery questions

PHASE 3: GENERATE ESTIMATE (after all questions are answered):
- Tell the user: "Excellent! I've gathered all the information I need. Now let's generate your estimate. Click the 'Generate Estimate' button below."
- Wait for them to click the button
- Once estimate is generated, you can help them understand it or make adjustments

CONVERSATION STYLE:
- Be warm, professional, and efficient
- Ask ONE question at a time - DO NOT ask multiple questions in one turn
- WAIT for their response before asking the next question
- Keep responses SHORT - just acknowledge and ask the next question
- Be conversational but FAST - don't be verbose

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

IMPORTANT RULES:
- ALWAYS wait for user response before asking the next question
- Call update_form or update_question_answer IMMEDIATELY when you extract information
- Check the context you receive - it tells you which fields/questions are already filled
- Only ask about fields/questions that are NOT yet completed
- If user provides multiple answers, acknowledge all, update all, then continue with next unanswered field/question
- DO NOT prepopulate or guess answers - only use what the user tells you
- Stay connected and helpful throughout the entire process

CONTEXT AWARENESS - CRITICAL:
- You receive context updates about the current state of the form
- Check agentContext to see:
  * Which basic fields are filled (jobTitle, projectCategory, projectPriority, projectName, projectSummary)
  * The flow step (agentContext.flowStep: 'intro', 'research', or 'questions')
  * Which discovery questions exist:
    - agentContext.questions.total (number of questions)
    - agentContext.questions.currentId (ID of current question)
    - agentContext.questions.currentText (text of current question)
    - agentContext.questions.allIds (array of ALL question IDs - use this to send focus messages)
    - agentContext.questions.allTexts (array of {id, text} for all questions)
  * Which questions are already answered (agentContext.answersSummary - array of {id, value})
- WORKFLOW:
  1. First, check which basic fields are missing - ask the FIRST missing one
  2. After all basic fields are filled:
     a. If flowStep is 'research' AND you haven't started asking discovery questions: Explain the research step and tell user to hit Enter/Next
     b. ACTIVELY CHECK context.flowStep on every turn - when it becomes 'questions', IMMEDIATELY proceed to step 3
     c. CRITICAL: Once flowStep becomes 'questions', NEVER mention research again - only focus on discovery questions
  3. When flowStep === 'questions' AND questions.total > 0 (user has advanced past research):
     a. IMMEDIATELY start asking discovery questions - do NOT wait for user input
     b. CRITICAL: DO NOT mention research, market research, or the research step - focus ONLY on discovery questions
     c. Get unanswered questions: Use agentContext.questions.allIds and compare with agentContext.answersSummary
     d. Find the FIRST question ID in allIds that is NOT in answersSummary
     e. BEFORE asking: Call send_focus_message(question_id="theQuestionId") FIRST - this advances the UI
     f. Get question text from agentContext.questions.allTexts (find the one with matching id)
     g. THEN ask the question verbally
     h. Wait for user response
     i. Call update_question_answer(question_id="theQuestionId", answer_value=their_answer)
     j. IMMEDIATELY AFTER: Find the NEXT unanswered question ID and call send_focus_message(question_id="nextQuestionId") to advance UI
     k. THEN acknowledge ("Got it!" or "Perfect!") and ask the next question - DO NOT mention research
  4. Continue asking ALL unanswered questions one at a time until all are answered
  5. After all questions are answered, guide them to click "Generate Estimate" button
- NEVER ask about fields/questions that are already in the context as filled/answered
- ALWAYS ask ONE question at a time and WAIT for the response
- ALWAYS call send_focus_message(question_id="...") BEFORE asking each question - this is CRITICAL for UI to advance
- DO NOT skip the research step - wait for user to advance past it before asking discovery questions
- CRITICAL: Once you start asking discovery questions (PHASE 2), NEVER mention research again - only focus on the questions"""


# Track form completion state
_form_fields = {
    "jobTitle": False,
    "projectCategory": False,
    "projectPriority": False,
    "projectName": False,
    "projectSummary": False,
}

# Track current question being asked
_current_question_index = 0

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
        # All basic fields are complete - research will be triggered automatically by the UI
        # The UI will auto-advance to research step
        return f"Form updated: {fields_updated}. All basic fields are now complete! The UI will automatically advance to the research step. Wait a moment for research to appear, then explain to the user about the research being generated."
    
    return f"Form updated: {fields_updated}"

@function_tool()
async def update_question_answer(
    context: RunContext,
    question_id: str,
    answer_value: str | list[str] | int,
):
    """Update a discovery question answer with the user's response.
    
    IMPORTANT: After calling this, you should IMMEDIATELY send a focus message for the NEXT unanswered question
    to advance the UI. Use send_focus_message(question_id="nextQuestionId") right after this.
    
    Args:
        question_id: The ID of the question (e.g., "project-type", "target-audience")
        answer_value: The answer - can be a string, list of strings (for multi-select), or number
    """
    session: AgentSession = context.session
    room = session.room_io.room
    
    message = {
        "type": "question_answer",
        "data": {
            "questionId": question_id,
            "value": answer_value,
        },
    }
    
    await room.local_participant.publish_data(
        json.dumps(message).encode(),
        reliable=True,
    )
    
    return f"Question {question_id} answered: {answer_value}. IMPORTANT: Now send focus for the next unanswered question using send_focus_message(question_id='nextQuestionId') to advance the UI."

@function_tool()
async def send_focus_message(
    context: RunContext,
    field: str | None = None,
    question_id: str | None = None,
):
    """Send a focus message to the frontend to highlight a field or question in the UI.
    Call this BEFORE asking a question so the UI highlights the correct field/question.
    
    Args:
        field: The field name to focus - one of: jobTitle, projectCategory, projectPriority, projectName, projectSummary
        question_id: The question ID to focus (e.g., "project-type", "target-audience")
    
    You must provide either field OR question_id, not both.
    """
    if not field and not question_id:
        return "Error: Must provide either field or question_id"
    
    if field and question_id:
        return "Error: Provide either field OR question_id, not both"
    
    session: AgentSession = context.session
    room = session.room_io.room
    
    message = {
        "type": "focus",
        "data": {},
    }
    
    if field:
        message["data"]["field"] = field
    if question_id:
        message["data"]["questionId"] = question_id
    
    await room.local_participant.publish_data(
        json.dumps(message).encode(),
        reliable=True,
    )
    
    if field:
        return f"Focus sent to UI for field: {field}"
    else:
        return f"Focus sent to UI for question: {question_id}"


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent"""
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Create the agent with instructions and tools
    agent = Agent(
        instructions=AGENT_INSTRUCTIONS,
        tools=[update_form, update_question_answer, send_focus_message],
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

    # Start the conversation - the agent will check context and ask the first unanswered question
    # The LLM will use the instructions to guide the conversation based on what's already filled
    # The agent will automatically call send_focus_message before asking each question
    
    await session.say(
        "Hello! I'm here to help you build your project proposal. "
        "I'll guide you through a few questions, one at a time. "
        "Let's start - what's your job title?"
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
