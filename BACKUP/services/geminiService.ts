/**
 * Gemini Service
 * AI content generation service supporting multiple LLM providers (Gemini, OpenRouter)
 */

import { User } from '../types';
import { getSettings } from './settingsService';

// Fallback interface for OpenRouter response
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    }
  }[];
  error?: {
    message: string;
  };
}

/**
 * CORE AI FUNCTION: Handles Provider Logic (Gemini vs OpenRouter)
 */
export const generateAIContent = async (systemInstruction: string, prompt: string, model: string = 'gemini-1.5-flash-latest'): Promise<string> => {
  try {
    // 1. Load Configuration from DB
    const settings = await getSettings(['llm_provider', 'gemini_key', 'openrouter_key']);
    // FORCE OPENROUTER as requested by user ("apenas api key de open router gratuita")
    const provider: string = 'openrouter';

    // 2. Strategy: Google Gemini (Legacy / Fallback)
    if (provider === 'gemini') {
      const apiKey = settings['gemini_key'] || import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        console.warn("Gemini API Key missing.");
        return "Erro: Chave API Gemini não configurada.";
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", response.status, errorText);
        return `Erro Gemini API (${response.status}): ${errorText}`;
      }

      const data = await response.json();
      if (import.meta.env.DEV) console.log("[LeoAI] Gemini Response:", data);
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpa, não consegui gerar uma resposta neste momento.";
    }

    // 3. Strategy: OpenRouter (OpenAI Compatible)
    else if (provider === 'openrouter') {
      // Try to get key from env var OR settings (env var takes precedence)
      const rawKey = import.meta.env.VITE_OPENROUTER_API_KEY || settings['openrouter_key'];
      const apiKey = rawKey ? rawKey.trim() : '';

      if (!apiKey) {
        console.error("[LeoAI] OpenRouter Key is empty!");
        return "Erro: Chave API OpenRouter não configurada. Por favor adicione a chave nas definições.";
      }

      // Simple Fetch with credentials: 'omit' is CRITICAL to avoid 401 cookie errors
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        credentials: "omit",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "MyPortal LEO"
        },
        body: JSON.stringify({
          // Use a FREE model as requested and limit max tokens to avoid 402 errors
          model: "openrouter/free",
          max_tokens: 8000,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", response.status, errorText);
        return `Erro API (${response.status}): ${errorText}`;
      }

      const data: OpenRouterResponse = await response.json();

      if (data.error) {
        console.error("OpenRouter Error:", data.error);
        return `Erro OpenRouter: ${data.error.message}`;
      }
      return data.choices?.[0]?.message?.content || "Sem resposta do OpenRouter.";
    }

    return "Erro: Provider AI desconhecido.";

  } catch (error) {
    console.error("AI Generation Critical Error:", error);
    return "Desculpe, ocorreu um erro ao comunicar com a inteligência artificial.";
  }
};


// ==========================================
// LEGACY HELPERS (Refactored to use Core)
// ==========================================

export const generateBio = async (user: User): Promise<string> => {
  const prompt = `
      Create a professional, short (max 3 sentences) HR summary bio for an employee at SEMRUMO Group.
      Employee Data:
      Name: ${user.name}
      Role: ${user.role}
      Department: ${user.department}
      Years Active since: ${user.admissionDate}
      
      Tone: Professional, encouraging, and corporate suitable for an internal profile.
    `;

  return generateAIContent("You are an HR Assistant.", prompt);
};

export const generateWelcomeEmail = async (user: User): Promise<string> => {
  const prompt = `
      Draft a warm welcome email for a new employee at SEMRUMO.
      Name: ${user.name}
      Role: ${user.role}
      Department: ${user.department}
      Start Date: ${user.admissionDate}
      
      The email should be from "The HR Team". Keep it concise and formatted.
    `;

  return generateAIContent("You are an HR Assistant.", prompt);
};

export const generateAttendanceReminder = async (user: User, date: string): Promise<string> => {
  const prompt = `
      Write a polite, automated internal notification (in Portuguese) to an employee who forgot to clock out (Check-out).
      Employee: ${user.name}
      Date of incident: ${date}
      
      Tone: Professional, gentle reminder, asking them to justify the anomaly in the "My Profile" portal.
      Keep it short (max 2 sentences).
    `;

  return generateAIContent("You are an HR Assistant.", prompt);
};