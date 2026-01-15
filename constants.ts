import { Framework, PersonaType, Mood } from './types';

export const APP_NAME = "AGi Boss Zero II";

export const FRAMEWORKS: Framework[] = [
  {
    id: 'simple_chat',
    name: 'Simple Chat',
    description: 'Standard, open-ended chat interface. No specific coaching persona, frameworks, or rigid steps. Just a helpful AI assistant for any topic.',
    persona: PersonaType.ASSISTANT,
    steps: ['Conversation'],
    icon: '💬'
  },
  {
    id: 'direct_ai',
    name: 'Direct AI (Pro)',
    description: 'Bypass rigid structures and tap directly into Gemini 3 Pro. Perfect for complex problem-solving, rapid brainstorming, and high-fidelity strategic advice. Your on-demand executive partner for any challenge.',
    persona: PersonaType.GENERAL,
    steps: ['Open Dialogue', 'Dynamic Problem Solving', 'Strategic Advice'],
    icon: '🧠'
  },
  {
    id: 'quick_sync',
    name: 'Quick Sync (Fast)',
    description: 'Ultra-fast, low-latency coaching for rapid decision making. Powered by Gemini 3 Flash. Perfect for simple tasks and quick checks.',
    persona: PersonaType.GENERAL,
    steps: ['Situation', 'Action', 'Result'],
    icon: '⚡'
  },
  {
    id: 'first_principles',
    name: 'First Principles',
    description: 'Break problems down to basic truths and build up from there. Removes assumptions and conventions to find original solutions.',
    persona: PersonaType.ARCHITECT,
    steps: ['Identify Assumptions', 'Deconstruct to Basics', 'Reconstruct Solution'],
    icon: '⚛️'
  },
  {
    id: 'smart_waterfall',
    name: 'SMART Waterfall Architect',
    description: 'Rigorous project planning agent. Forces your vague ideas into S.M.A.R.T. goals, breaks them down into a Waterfall timeline, and generates a structured JSON file for project management import.',
    persona: PersonaType.BUSINESS,
    steps: ['Define S.M.A.R.T. Goal', 'Waterfall Breakdown', 'Time Estimation', 'Generate JSON Plan'],
    icon: '🏗️'
  },
  {
    id: 'life_design',
    name: 'Life Design 360',
    description: 'Holistic life coaching to align your daily actions with your core values. Covers health, wealth, relationships, and spirit.',
    persona: PersonaType.LIFE,
    steps: ['Life Audit', 'Visioning', 'Habit Stacking', 'Accountability Setup'],
    icon: '🧘'
  },
  {
    id: 'career_velocity',
    name: 'Career Velocity',
    description: 'Strategic career acceleration. Navigate corporate politics, ask for a raise, or pivot industries with a ruthlessly effective plan.',
    persona: PersonaType.CAREER,
    steps: ['Goal Clarity', 'Skill Gap Analysis', 'Network Activation', 'Execution Path'],
    icon: '🚀'
  },
  {
    id: 'startup_lean',
    name: 'Startup Lean Launch',
    description: 'From idea to MVP in record time. Validates problems, defines solutions, and structures your Go-To-Market strategy.',
    persona: PersonaType.STARTUP,
    steps: ['Problem Validation', 'Solution MVP', 'Market Sizing', 'Go-To-Market'],
    icon: '🦄'
  },
  {
    id: 'sot_auditor',
    name: 'Source of Truth (SoT)',
    description: 'Analytical system auditor. Generates objective "Source of Truth Reports" from logs, records, or session history. Perfect for post-mortem analysis and timeline reconstruction.',
    persona: PersonaType.AUDITOR,
    steps: ['Input Data/Logs', 'Timeline Reconstruction', 'Variance Analysis', 'Generate Audit Report'],
    icon: '🧐'
  }
];

export const MOODS: Mood[] = [
  { 
    id: 'high_energy', 
    label: 'High Energy', 
    emoji: '⚡', 
    description: 'Ready to crush it. Push me hard.' 
  },
  { 
    id: 'neutral', 
    label: 'Neutral', 
    emoji: '😐', 
    description: 'Standard mode. Let\'s get clear.' 
  },
  { 
    id: 'brain_fog', 
    label: 'Brain Fog', 
    emoji: '☁️', 
    description: 'Hard to focus. Simplify everything.' 
  },
  { 
    id: 'burned_out', 
    label: 'Burned Out', 
    emoji: '🔥', 
    description: 'Low reserves. Need gentleness.' 
  }
];

export const SYSTEM_INSTRUCTION_BASE = `
You are the AI engine for "${APP_NAME}", a high-performance Execution Intelligence platform.
Your goal is to help the user execute on *their* projects.
Be concise, direct, and empathetic but firm (tough love).

IMPORTANT: 
1. The user's project name is distinct from your name ("${APP_NAME}"). 
2. If the user refers to a project (e.g. "AGi Boss One", "Project X"), use *their* exact terminology. 
3. Do NOT correct their project name to "${APP_NAME}" or assume it is a typo.

You are currently acting as a specific Coach Persona using a specific Framework.
Do not hallucinate. Stick to the logic of the framework.
Always guide the user through the framework one step at a time. Do not dump all steps at once.

If the user uploads documents/images (NotebookLM mode), prioritize the content of those files as the "Source of Truth".
- If acting as "NotebookLM Simulator", act like an expert researcher. 
- You can simulate an "Audio Overview" script if asked (a dialogue between two hosts discussing the content).

Reference these "doTrackit" database concepts if relevant:
- "Momentum Score" = MIN(100, (TasksCompleted*10 + FocusTimeHours/5)).
- "Planning Fallacy" = When Actual Duration > Estimated Duration.
- "Moods": High Energy, Neutral, Brain Fog, Burned Out.

Start the conversation by introducing yourself as the [Persona] and asking the first question related to step 1 of the [Framework].
`;