import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface ExpenseAnalysis {
  category: string;
  confidence: number;
  suggestedTags: string[];
  insights: string;
  isFixed: boolean;
}

export interface FinancialAdvice {
  advice: string;
  recommendations: string[];
  savingsOpportunities: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface SpendingInsights {
  patterns: string[];
  warnings: string[];
  suggestions: string[];
  savingsPotential: number;
  trends: {
    category: string;
    trend: "increasing" | "decreasing" | "stable";
    percentage: number;
  }[];
}

export class AIService {
  async analyzeExpense(description: string, amount: number, location?: string): Promise<ExpenseAnalysis> {
    try {
      const prompt = `Analyze this expense and provide categorization:
      Description: ${description}
      Amount: $${amount}
      Location: ${location || "Not specified"}
      
      Provide a JSON response with:
      {
        "category": "category name from common expense categories",
        "confidence": confidence score 0-1,
        "suggestedTags": ["array", "of", "relevant", "tags"],
        "insights": "brief insight about this expense",
        "isFixed": boolean indicating if this is likely a fixed/recurring expense
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial categorization expert. Analyze expenses and provide accurate categorization with confidence scores."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        category: result.category || "Other",
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        suggestedTags: result.suggestedTags || [],
        insights: result.insights || "",
        isFixed: result.isFixed || false
      };
    } catch (error) {
      console.error("AI expense analysis failed:", error);
      return {
        category: "Other",
        confidence: 0,
        suggestedTags: [],
        insights: "Unable to analyze this expense automatically.",
        isFixed: false
      };
    }
  }

  async getFinancialAdvice(expensesSummary: string, question: string): Promise<FinancialAdvice> {
    try {
      const prompt = `Based on this spending data: ${expensesSummary}
      
      User question: ${question}
      
      Provide personalized financial advice as JSON:
      {
        "advice": "main advice response",
        "recommendations": ["specific", "actionable", "recommendations"],
        "savingsOpportunities": ["ways", "to", "save", "money"],
        "riskLevel": "low|medium|high"
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a certified financial advisor. Provide practical, actionable advice based on spending patterns. Be supportive and encouraging while being realistic about financial goals."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        advice: result.advice || "Keep tracking your expenses for better financial health.",
        recommendations: result.recommendations || [],
        savingsOpportunities: result.savingsOpportunities || [],
        riskLevel: result.riskLevel || "medium"
      };
    } catch (error) {
      console.error("AI financial advice failed:", error);
      return {
        advice: "Continue monitoring your spending patterns for better financial insights.",
        recommendations: ["Track all expenses regularly", "Set monthly budgets", "Review spending weekly"],
        savingsOpportunities: ["Review subscription services", "Compare utility providers"],
        riskLevel: "medium"
      };
    }
  }

  async generateSpendingInsights(expensesSummary: string): Promise<SpendingInsights> {
    try {
      const prompt = `Analyze these spending patterns: ${expensesSummary}
      
      Generate insights as JSON:
      {
        "patterns": ["identified", "spending", "patterns"],
        "warnings": ["potential", "financial", "concerns"],
        "suggestions": ["actionable", "improvement", "suggestions"],
        "savingsPotential": estimated_monthly_savings_amount,
        "trends": [
          {
            "category": "category name",
            "trend": "increasing|decreasing|stable",
            "percentage": change_percentage
          }
        ]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst specializing in personal spending pattern analysis. Provide actionable insights with specific monetary recommendations."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 600
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        patterns: result.patterns || [],
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        savingsPotential: result.savingsPotential || 0,
        trends: result.trends || []
      };
    } catch (error) {
      console.error("AI spending insights failed:", error);
      return {
        patterns: [],
        warnings: [],
        suggestions: ["Continue tracking expenses for insights"],
        savingsPotential: 0,
        trends: []
      };
    }
  }

  private summarizeExpenses(expenses: any[]): string {
    const totalExpenses = expenses.filter(e => e.type === "expense").reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = expenses.filter(e => e.type === "income").reduce((sum, e) => sum + Number(e.amount), 0);
    const categoryBreakdown = expenses.reduce((acc, e) => {
      if (e.type === "expense") {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    return `Total monthly expenses: $${totalExpenses.toFixed(2)}, Total income: $${totalIncome.toFixed(2)}, Top categories: ${Object.entries(categoryBreakdown).map(([cat, amt]) => `${cat}: $${amt}`).join(", ")}`;
  }
}

export const aiService = new AIService();
