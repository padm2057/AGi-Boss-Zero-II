import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { Framework, Message, Mood, Attachment } from "../types";
import { SYSTEM_INSTRUCTION_BASE } from "../constants";

let chatInstance: Chat | null = null;

// --- API KEY MANAGEMENT ---

const getApiKey = (): string | undefined => {
  // Check process.env first (Standard/System Preference)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  // Check Vite specific env vars (Client-side fallback)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
       // @ts-ignore
       if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {}

  return undefined;
};

// --- AUDIO PLAYER STATE MANAGEMENT ---
interface AudioPlayerState {
  audioCtx: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  currentText: string | null;
  startTime: number;     // When the current playback segment started (context time)
  pausedAt: number;      // How much audio has already been played (seconds)
  isPaused: boolean;
  activeCallbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onEnd?: () => void;
  } | null;
}

const playerState: AudioPlayerState = {
  audioCtx: null,
  sourceNode: null,
  audioBuffer: null,
  currentText: null,
  startTime: 0,
  pausedAt: 0,
  isPaused: false,
  activeCallbacks: null
};

// --- COACHING LOGIC ---

export const initializeCoachingSession = (
  framework: Framework, 
  mood: Mood | null, 
  historyMessages: Message[] = [],
  userMemoryContext: string = ""
) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your .env file or deployment settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let behaviorInstruction = "";
    if (mood) {
      switch (mood.id) {
        case 'high_energy':
          behaviorInstruction = "USER STATE: HIGH ENERGY. Strategy: Be aggressive, fast-paced, and push for stretch goals. Use 'Tough Love'. Tolerance for excuses is zero.";
          break;
        case 'neutral':
          behaviorInstruction = "USER STATE: NEUTRAL. Strategy: Balance empathy with accountability. Focus on clarity and steady progress.";
          break;
        case 'brain_fog':
          behaviorInstruction = "USER STATE: BRAIN FOG. Strategy: Simplify everything. Break complex tasks into tiny, singular steps. Do not overwhelm. Be the 'external pre-frontal cortex'.";
          break;
        case 'burned_out':
          behaviorInstruction = "USER STATE: BURNED OUT. Strategy: High Empathy. Focus on 'Minimum Viable Progress'. Prioritize recovery and removing friction. Validate feelings over output.";
          break;
      }
    }

    let frameworkSpecificInstruction = "";

    // --- FRAMEWORK SPECIFIC LOGIC ---
    if (framework.id === 'smart_waterfall') {
      frameworkSpecificInstruction = `
        FRAMEWORK PROTOCOL: SMART WATERFALL ARCHITECT
        
        PHASE 1: DEFINE S.M.A.R.T. GOAL
        - You must NOT proceed to planning until the user's goal is rigidly defined.
        - Critique their input against:
          * S: Specific (Who, what, where, why)
          * M: Measurable (Metrics, numbers)
          * A: Achievable (Realistic resource check)
          * R: Relevant (Aligns with broader objectives)
          * T: Time-bound (Deadlines)
        - If the goal is vague, reject it gently and ask for the missing component.

        PHASE 2: WATERFALL BREAKDOWN & TASK IDENTIFICATION
        - Once the goal is confirmed SMART, break it down into sequential Waterfall phases (e.g., Requirements, Design, Implementation, Verification, Deployment).
        - List the specific tasks required for each phase.
        - Ask the user to confirm if the breakdown of tasks looks correct before discussing time.

        PHASE 3: TIME ESTIMATION & NEGOTIATION
        - PROPOSE an estimated duration (in hours) for each task identified in Phase 2. Use your knowledge of the task complexity to guess.
        - Present a list: "Task Name: [AI Proposed Time]"
        - Explicitly ask the user: "Do you accept these estimated times, or would you like to override any specific task?"
        - If the user provides an override (e.g., "Make design 4 hours"), update the plan.
        - Mention the "Planning Fallacy" if the user's estimates seem too optimistic.

        PHASE 4: GENERATE JSON PLAN
        - The final output of the session MUST be a JSON code block.
        - Do not just chat about it. Provide the actual JSON data.
        - IMPORTANT: Wrap the JSON in triple backticks with 'json' identifier: \`\`\`json ... \`\`\`
        - Structure:
        \`\`\`json
        {
          "smart_goal": "The final definition",
          "total_estimated_duration_hours": 0,
          "tasks": [
            {
              "id": "1",
              "phase": "Requirements",
              "task_name": "Task Name",
              "duration_hours": 4,
              "predecessors": [] // Array of IDs that must finish before this starts
            },
            {
              "id": "2",
              "phase": "Design",
              "task_name": "Task Name",
              "duration_hours": 8,
              "predecessors": ["1"]
            }
          ]
        }
        \`\`\`
      `;
    } else if (framework.id === 'sot_auditor') {
      frameworkSpecificInstruction = `
        FRAMEWORK PROTOCOL: SOURCE OF TRUTH AUDITOR
        
        You are an analytical system auditor.
        Your task is to generate a structured "Source of Truth Report" that objectively summarizes everything that has occurred based on the data you receive.

        Goals:
        1. Reconstruct the full sequence of events.
        2. Identify key actions, changes, or outcomes.
        3. Provide interpretation and insights without guessing beyond the data.

        Input:
        You will receive structured or semi-structured logs, records, database entries, or user actions. These may include timestamps, user actions, workflow runs, task status changes, messages, or metadata.
        If the user provides text or files, treat them as the raw audit logs.

        Output Format (Do NOT skip any section):

        ### Source of Truth Report
        **Date Range Covered:**  
        **Data Sources Reviewed:**  

        ### 1. Executive Summary
        Provide a concise summary of what happened.

        ### 2. Event Timeline (Chronological)
        List all relevant events in order:
        - Timestamp —
        - Actor/User —
        - Action —
        - Object/Entity affected —
        - Result/Outcome —

        Only use facts present in the data.

        ### 3. Key Activities Observed
        Summarize major categories of actions (e.g., task creation, goal updates, workflow execution, user activity).

        ### 4. Variances / Exceptions
        Identify:
        - Failed executions
        - Delays vs expected timing
        - Missing data
        - Conflicts
        - Retries
        - Irregular behavior

        ### 5. State Changes
        Describe BEFORE → AFTER where applicable.

        ### 6. Metrics Summary
        Examples (only if present in data):
        - Total actions
        - Success vs failure count
        - Active users
        - Completed workflows
        - Execution latency

        ### 7. Insights & Interpretation
        Explain:
        - What the patterns indicate
        - Where attention is needed
        - Potential root causes
        Do NOT invent information. Base insight only on observable data.

        ### 8. Risks / Alerts
        Flag anything operationally important.

        ### 9. Open Questions
        List areas where data is insufficient.

        ### 10. Recommended Next Actions
        Provide practical operational recommendations.

        Tone:
        - Objective
        - Analytical
        - No speculation beyond facts
        - Business-grade reporting

        If data is incomplete, state explicitly what cannot be concluded.
      `;
    } else if (framework.id === 'first_principles') {
      frameworkSpecificInstruction = `
        FRAMEWORK PROTOCOL: FIRST PRINCIPLES THINKING
        
        PHASE 1: DECONSTRUCTION & ASSUMPTION CHECK
        - The user will present a problem.
        - You must identify every assumption (hidden or explicit) in their statement.
        - Challenge these assumptions. Ask: "Is this a law of physics or just a convention?"
        - Do not accept "because that's how it's done" as an answer.

        PHASE 2: REDUCTION TO BASICS
        - Drill down to the fundamental truths (e.g., cost of materials, physical laws, core economic constraints).
        - Discard reasoning by analogy ("We do it this way because X does it").
        - Identify the absolute floor or ceiling of what is possible.

        PHASE 3: RECONSTRUCTION
        - Build a solution from the ground up using ONLY the verified basic truths.
        - Focus on the theoretical limit of what is possible.
        - Propose a path that ignores tradition in favor of efficiency or truth.
        - Be radical if the logic supports it.
      `;
    }

    const systemInstruction = `
      ${SYSTEM_INSTRUCTION_BASE}
      
      ${userMemoryContext ? `
      🧠 LONG-TERM MEMORY (CONTEXT FROM PAST SESSIONS):
      The following is a summary of past interactions with this user. Use this to personalize advice, reference past goals, and maintain continuity.
      ${userMemoryContext}
      ` : ''}

      CURRENT CONTEXT:
      - Persona: ${framework.persona}
      - Framework: ${framework.name}
      - Steps to follow: ${framework.steps.join(', ')}
      
      ${behaviorInstruction}

      ${frameworkSpecificInstruction}
      
      INSTRUCTIONS:
      1. Start immediately with the first step.
      2. Wait for user input before moving to the next step.
      3. If the user goes off-track, gently bring them back to the framework.
      4. At the end, summarize the session as a structured Action Plan.
      5. TOOL USE: You have access to the 'googleSearch' tool.
         - If the user provides a URL, USE the tool to read it.
         - If the user asks for current information (news, stocks, updates), USE the tool.
         - Do not guess if external data is required.
    `;

    // Convert app messages to Gemini history format
    const history = historyMessages.map(msg => ({
      role: msg.role,
      parts: [
        { text: msg.text },
        ...(msg.attachments?.length ? [{ text: `[User attached ${msg.attachments.length} files]` }] : [])
      ]
    }));

    // Use gemini-3-flash-preview for search grounding features as requested.
    const modelName = 'gemini-3-flash-preview';

    chatInstance = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }], // ENABLE GOOGLE SEARCH GROUNDING
      },
      history: history
    });

    return chatInstance;
  } catch (error) {
    console.error("Failed to initialize coaching session:", error);
    chatInstance = null;
    throw error; // Re-throw to let App.tsx handle it
  }
};

export const sendMessageToCoach = async (
  text: string, 
  attachments: Attachment[] = [],
  onStreamChunk: (text: string) => void
): Promise<string> => {
  if (!chatInstance) {
    throw new Error("Coach not initialized. Please restart the session.");
  }

  let fullResponse = "";
  
  try {
    const parts: any[] = [{ text: text }];

    if (attachments.length > 0) {
      attachments.forEach(att => {
        const base64Data = att.data.includes('base64,') 
          ? att.data.split('base64,')[1] 
          : att.data;

        // 1. Check for Gemini-supported Inline types (PDF, Images, Audio, Video)
        const isInlineSupported = 
             att.mimeType.startsWith('image/') ||
             att.mimeType.startsWith('audio/') ||
             att.mimeType.startsWith('video/') ||
             att.mimeType === 'application/pdf';

        if (isInlineSupported) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: base64Data
              }
            });
        } 
        // 2. Check for Text-based types we can decode and inject as text
        else if (
            att.mimeType.startsWith('text/') || 
            att.mimeType === 'application/json' ||
            att.mimeType.includes('json') || 
            att.mimeType.includes('xml') ||
            att.mimeType.includes('csv') ||
            att.mimeType.includes('script') ||
            att.mimeType.includes('javascript') ||
            att.mimeType.includes('typescript')
        ) {
            try {
                // Decode base64 to text
                const binString = atob(base64Data);
                // Handle potential unicode issues in simple text files
                const bytes = Uint8Array.from(binString, c => c.charCodeAt(0));
                const textContent = new TextDecoder().decode(bytes);
                
                parts.push({ 
                    text: `\n\n--- ATTACHED FILE: ${att.name} (${att.mimeType}) ---\n${textContent}\n--- END ATTACHMENT ---\n` 
                });
            } catch (e) {
                console.warn(`Failed to decode text file ${att.name}`, e);
                parts.push({ text: `\n[System: Failed to decode attached text file "${att.name}".]\n` });
            }
        }
        // 3. Fallback for unsupported binary types (e.g. DOCX, XLSX)
        else {
             // We cannot send binary DOCX/XLSX/ZIP as inlineData or it will crash.
             // We inform the model and user.
             parts.push({ 
                 text: `\n[System: User attached file "${att.name}" (${att.mimeType}). The file content could not be read directly. Please ask the user to copy-paste the text or convert it to PDF/Image.]\n` 
             });
        }
      });
    }

    const responseStream = await chatInstance.sendMessageStream({ 
      message: parts.length > 1 ? parts : text 
    });

    let groundingMetadata: any = null;

    for await (const chunk of responseStream) {
      const chunkText = chunk.text; 
      if (chunkText) {
        fullResponse += chunkText;
        onStreamChunk(fullResponse);
      }
      
      // Capture grounding metadata from the candidate if available
      if (chunk.candidates?.[0]?.groundingMetadata) {
          groundingMetadata = chunk.candidates[0].groundingMetadata;
      }
    }

    // Process and append grounding sources if they exist
    if (groundingMetadata?.groundingChunks) {
        const sources = groundingMetadata.groundingChunks
            .map((c: any) => c.web ? { uri: c.web.uri, title: c.web.title } : null)
            .filter((s: any) => s && s.uri);

        if (sources.length > 0) {
            // Deduplicate sources by URI
            const uniqueSources = Array.from(new Map(sources.map((s:any) => [s.uri, s])).values());
            
            let sourceText = "\n\n🔍 **Sources:**\n";
            uniqueSources.forEach((s: any) => {
                sourceText += `- [${s.title || new URL(s.uri).hostname}](${s.uri})\n`;
            });
            
            fullResponse += sourceText;
            onStreamChunk(fullResponse);
        }
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMsg = " [Connection Error: Please check your internet or API Key.] ";
    if (JSON.stringify(error).includes("404")) {
        errorMsg = " [Error: Model not found or unavailable. Please try again later.] ";
    } else if (error.message) {
        // Expose specific API error if available (e.g. 400 Bad Request)
        errorMsg = ` [Error: ${error.message}] `;
    }
    
    // Only throw if we haven't streamed anything yet, otherwise append error
    if (fullResponse.length === 0) {
        throw error;
    } else {
        onStreamChunk(fullResponse + errorMsg);
    }
  }

  return fullResponse;
};

export const generateSessionSummary = async (
  onStreamChunk: (text: string) => void
): Promise<string> => {
  const summaryPrompt = `
    Please provide a structured summary of our session so far.
    
    Use the following format clearly:
    
    📋 SESSION SUMMARY
    
    💡 KEY INSIGHTS
    • (List key realizations)
    
    ✅ DECISIONS MADE
    • (List agreements)
    
    📝 ACTION PLAN
    • (List actionable steps with implicit deadlines if discussed)
    
    🔮 NEXT STEPS
    • (What to focus on next session)
    
    Keep it professional, encouraging, and high-impact.
  `;
  
  return sendMessageToCoach(summaryPrompt, [], onStreamChunk);
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
        resolve(base64);
      };
    });
    reader.readAsDataURL(audioBlob);
    const base64Data = await base64Promise;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { 
              inlineData: { 
                  mimeType: audioBlob.type, 
                  data: base64Data 
              } 
          },
          { text: "Transcribe the spoken audio exactly into text. Do not add any conversational filler, intro, or outro." }
        ]
      }
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

// --- ADVANCED AUDIO CONTROLS ---

// Internal helper to get/create context
const getAudioContext = () => {
  if (!playerState.audioCtx) {
    playerState.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return playerState.audioCtx;
};

// Internal helper to play buffer from offset
const playBufferFromOffset = (offset: number) => {
  const ctx = getAudioContext();
  if (!playerState.audioBuffer) return;

  // Stop existing source if any
  if (playerState.sourceNode) {
    try { playerState.sourceNode.stop(); } catch(e) {}
    playerState.sourceNode = null;
  }

  // Create new source
  const source = ctx.createBufferSource();
  source.buffer = playerState.audioBuffer;
  source.connect(ctx.destination);

  // Start
  source.start(0, offset); // start(when, offset)
  
  playerState.sourceNode = source;
  playerState.startTime = ctx.currentTime;
  playerState.pausedAt = offset;
  playerState.isPaused = false;

  // Fire callback
  if (playerState.activeCallbacks?.onPlay) playerState.activeCallbacks.onPlay();

  // Handle End
  source.onended = () => {
    // Only fire onEnd if it wasn't a manual pause
    if (!playerState.isPaused && playerState.sourceNode === source) {
       // Reset state because it finished naturally
       playerState.pausedAt = 0;
       if (playerState.activeCallbacks?.onEnd) playerState.activeCallbacks.onEnd();
    }
  };
};

export const stopSpeech = () => {
  if (playerState.sourceNode) {
      try { playerState.sourceNode.stop(); } catch (e) {}
      playerState.sourceNode = null;
  }
  playerState.pausedAt = 0;
  playerState.isPaused = false;
  playerState.currentText = null;
  // Note: We don't clear audioBuffer here so we could restart if we wanted, 
  // but usually stop means "reset UI".
  if (playerState.activeCallbacks?.onEnd) playerState.activeCallbacks.onEnd();
};

export const pauseSpeech = () => {
  const ctx = getAudioContext();
  if (playerState.sourceNode && !playerState.isPaused) {
    // Calculate elapsed time since start
    const elapsed = ctx.currentTime - playerState.startTime;
    playerState.pausedAt += elapsed;
    playerState.isPaused = true;
    
    try { playerState.sourceNode.stop(); } catch(e) {}
    playerState.sourceNode = null;

    if (playerState.activeCallbacks?.onPause) playerState.activeCallbacks.onPause();
  }
};

export const resumeSpeech = () => {
  if (playerState.audioBuffer && playerState.isPaused) {
    // Resume from pausedAt
    playBufferFromOffset(playerState.pausedAt);
  }
};

export const restartSpeech = () => {
  if (playerState.audioBuffer) {
    playBufferFromOffset(0);
  }
};

export const playText = async (
    text: string, 
    callbacks: { onPlay?: () => void, onPause?: () => void, onEnd?: () => void }
) => {
  const ctx = getAudioContext();
  
  // Resume context if suspended
  if (ctx.state === 'suspended') await ctx.resume();

  // Check if we are playing the same text and it's paused
  if (playerState.currentText === text && playerState.isPaused && playerState.audioBuffer) {
     playerState.activeCallbacks = callbacks; // Update callbacks just in case
     resumeSpeech();
     return;
  }

  // If different text or not paused, we need to start over
  stopSpeech(); // Stop previous audio and trigger its cleanup
  playerState.currentText = text;
  playerState.activeCallbacks = callbacks;

  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
        }
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) {
        // Error handling
        if (callbacks.onEnd) callbacks.onEnd();
        return;
    }

    // Decode
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for(let i=0; i<dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    playerState.audioBuffer = buffer;
    
    // Play from start
    playBufferFromOffset(0);

  } catch (error) {
    console.error("TTS generation error:", error);
    if (callbacks.onEnd) callbacks.onEnd();
  }
};

// Deprecated wrapper for backward compatibility if needed, but we'll use playText in UI
export const generateAndPlaySpeech = async (text: string, onStart?: () => void, onEnd?: () => void) => {
    return playText(text, { onPlay: onStart, onEnd: onEnd });
};