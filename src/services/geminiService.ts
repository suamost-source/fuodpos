
import { GoogleGenAI } from "@google/genai";
import { Transaction, Product } from "../types";

// Helper to check if API key is available
const isGeminiAvailable = (): boolean => {
  return !!process.env.API_KEY;
};

export const generateReceiptNote = async (items: string[]): Promise<string> => {
  if (!isGeminiAvailable()) return "Thank you for your business!";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Write a very short, warm, and witty receipt footer message (max 15 words) for a customer who bought: ${items.join(', ')}.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "Thank you! Come again soon.";
  } catch (error) {
    console.error("Gemini receipt generation failed", error);
    return "Thank you! Come again soon.";
  }
};

export const analyzeSalesTrends = async (transactions: Transaction[]): Promise<string> => {
  if (!isGeminiAvailable()) return "AI Analysis unavailable without API Key.";
  if (transactions.length === 0) return "No transactions to analyze.";

  try {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const getStats = (startTime: number, endTime: number) => {
        const filtered = transactions.filter(t => t.timestamp >= startTime && t.timestamp < endTime);
        const total = filtered.reduce((sum, t) => sum + t.total, 0);
        const count = filtered.length;
        const itemCounts: Record<string, number> = {};
        filtered.forEach(t => t.items.forEach(i => itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity));
        const topItems = Object.entries(itemCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(e => e[0])
            .join(', ');
        
        return { total, count, topItems };
    };

    const thisWeek = getStats(now - oneWeek, now);
    const lastWeek = getStats(now - (2 * oneWeek), now - oneWeek);
    
    const thisMonth = getStats(now - oneMonth, now);
    const lastMonth = getStats(now - (2 * oneMonth), now - oneMonth);

    const calcGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100%" : "0%";
        const percent = ((current - previous) / previous) * 100;
        return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
    };

    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    transactions.slice(0, 100).forEach(t => {
        const hour = new Date(t.timestamp).getHours();
        if (hour < 12) timeDistribution.morning++;
        else if (hour < 17) timeDistribution.afternoon++;
        else timeDistribution.evening++;
    });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Act as a senior business analyst for a retail shop. Analyze the following sales data compared to previous periods.
      
      DATA SUMMARY:
      
      WEEKLY PERFORMANCE:
      - Current Week Sales: $${thisWeek.total.toFixed(2)} (${thisWeek.count} orders). Top Items: ${thisWeek.topItems || 'None'}
      - Previous Week Sales: $${lastWeek.total.toFixed(2)} (${lastWeek.count} orders). Top Items: ${lastWeek.topItems || 'None'}
      - Week-over-Week Growth: ${calcGrowth(thisWeek.total, lastWeek.total)} revenue, ${calcGrowth(thisWeek.count, lastWeek.count)} volume.

      MONTHLY PERFORMANCE:
      - Current Month Sales: $${thisMonth.total.toFixed(2)}
      - Previous Month Sales: $${lastMonth.total.toFixed(2)}
      - Month-over-Month Growth: ${calcGrowth(thisMonth.total, lastMonth.total)}

      CONTEXT:
      - Peak Trading Times (Sample): Morning: ${timeDistribution.morning}, Afternoon: ${timeDistribution.afternoon}, Evening: ${timeDistribution.evening}

      TASK:
      Provide 3 distinct, actionable insights.
      1. **Trend Analysis**: Compare the current week/month to previous ones. Is the trend positive or negative?
      2. **Reasoning**: Deduce *why* changes might have occurred based on the "Top Items" and volume changes.
      3. **Recommendation**: Give a specific tip to improve sales based on the time-of-day data or item popularity.

      Keep the tone professional, encouraging, and concise. Use bullet points.
    `;

    // Upgraded to gemini-3-pro-preview for complex business reasoning
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "Analysis generated no text.";
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "Could not perform AI analysis at this time.";
  }
};

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
    if (!isGeminiAvailable()) return "";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Write a short, appetizing 1-sentence description for a product named "${productName}" in the category "${category}".`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        return response.text?.trim() || "";
    } catch (error) {
        return "";
    }
};

/**
 * Translates the entire product data including modifiers/addons.
 */
export const translateProductInfo = async (product: Product, targetLanguage: string): Promise<any> => {
    if (!isGeminiAvailable() || !targetLanguage) return product;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Translate the following product information into ${targetLanguage}. 
        Keep the technical IDs same. Translate name, description, and all addon groups and option names.
        Return ONLY a JSON object matching this structure:
        {
          "name": "translated name",
          "description": "translated description",
          "addons": [
            {
              "id": "original_id",
              "name": "translated group name",
              "options": [
                { "id": "original_id", "name": "translated option name" }
              ]
            }
          ]
        }

        DATA TO TRANSLATE:
        Name: "${product.name}"
        Description: "${product.description || ''}"
        Addons: ${JSON.stringify(product.addons || [])}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Translation failed", error);
        return null;
    }
};
