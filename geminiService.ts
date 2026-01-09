
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LanguageCode } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeResume(
  resumeText: string, 
  jobDescription: string, 
  jobUrl?: string,
  targetLanguage?: LanguageCode
): Promise<AnalysisResult> {
  const model = jobUrl ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  
  const languageNames: Record<LanguageCode, string> = {
    'en': 'English',
    'pt-BR': 'Portuguese (Brazil)',
    'es': 'Spanish',
    'it': 'Italian',
    'fr': 'French',
    'de': 'German',
    'ar': 'Arabic'
  };

  const targetLangName = targetLanguage ? languageNames[targetLanguage] : 'the original language of the CV';

  const prompt = `
    Você é um especialista sênior em Recrutamento e Seleção e sistemas de ATS (Applicant Tracking Systems). 
    Sua tarefa é analisar o currículo abaixo de forma CRÍTICA e RIGOROSA em relação à vaga pretendida.
    
    Currículo:
    ${resumeText}
    
    Descrição da Vaga:
    ${jobDescription}
    
    DIRETRIZES DE ANÁLISE E PONTUAÇÃO (TOTAL 100 PONTOS):
    Você DEVE dividir a análise em EXATAMENTE 4 categorias, cada uma valendo no máximo 25 pontos.
    A nota final (score) DEVE ser a soma exata desses 4 valores.
    
    1. Palavras-chave (Máx 25 pts): 
       - Avalie a densidade e relevância dos termos técnicos cruciais da vaga no currículo. 
       - 0 pts se não houver termos; 25 pts se o currículo estiver perfeitamente otimizado.
    
    2. Experiência (Máx 25 pts): 
       - Avalie se as experiências são relevantes e descritas com resultados quantificáveis. 
       - 0 pts se irrelevante; 25 pts se houver conquistas de alto impacto alinhadas à senioridade.
    
    3. Educação (Máx 25 pts): 
       - Avalie o alinhamento acadêmico e certificações técnicas exigidas ou desejáveis. 
       - 0 pts se não atender requisitos básicos; 25 pts se superar expectativas.
    
    4. Formatação (Máx 25 pts): 
       - Avalie a legibilidade para robôs ATS (sem gráficos/tabelas complexas) e a clareza para humanos. 
       - 0 pts se for confuso ou ilegível para ATS; 25 pts se for um padrão ouro de estrutura.

    IMPORTANTE:
    - O score final DEVE ser a soma de (Palavras-chave + Experiência + Educação + Formatação).
    - Se houver idioma de destino (${targetLangName}), traduza TODO o conteúdo gerado.
    - O currículo otimizado deve ser profissional, usando verbos de ação e técnica STAR.

    RETORNE EM JSON seguindo estritamente o esquema fornecido.
  `;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Soma das 4 categorias (0 a 100)" },
        suggestions: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Lista de melhorias críticas"
        },
        missingKeywords: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Termos técnicos ausentes"
        },
        strengths: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Pontos positivos encontrados"
        },
        optimizedContent: { 
          type: Type.STRING, 
          description: "Conteúdo reescrito em Markdown"
        },
        scoreBreakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Nome da categoria (Palavras-chave, Experiência, Educação, Formatação)" },
              score: { type: Type.NUMBER, description: "Pontos (0-25)" },
              maxScore: { type: Type.NUMBER, description: "Sempre 25" },
              details: { type: Type.STRING, description: "Justificativa da nota" }
            },
            required: ["category", "score", "maxScore", "details"]
          }
        },
        linkedinOptimization: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            about: { type: Type.STRING }
          },
          required: ["headline", "about"]
        }
      },
      required: ["score", "suggestions", "missingKeywords", "strengths", "optimizedContent", "linkedinOptimization", "scoreBreakdown"]
    }
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: config
  });

  try {
    const text = response.text || "{}";
    const result = JSON.parse(text);
    
    // Garantia de consistência matemática
    const calculatedScore = result.scoreBreakdown.reduce((acc: number, item: any) => acc + item.score, 0);
    result.score = Math.min(100, Math.max(0, Math.round(calculatedScore)));
    
    return result as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error("Erro na análise técnica. Tente reenviar os dados.");
  }
}
