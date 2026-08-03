import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('Initializing Gemini AI Service...');
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not defined in environment variables. AI Code Review will be bypassed.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Run AI Code Review for a code submission
   * @param code The source code submitted by the candidate
   * @param language The programming language
   * @param problemTitle The title of the problem
   * @param problemDescription The problem description
   */
  async reviewCode(
    code: string,
    language: string,
    problemTitle: string,
    problemDescription: string,
  ): Promise<any> {
    if (!this.genAI) {
      this.logger.warn('Gemini AI Client is not initialized (missing API key). Skipping review.');
      return null;
    }

    try {
      this.logger.log(`Requesting AI review for problem: ${problemTitle}`);
      
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const prompt = `
You are a Staff Software Engineer and algorithms expert. Analyze the following candidate code submission for the coding problem "${problemTitle}".

Problem Description:
${problemDescription}

Candidate Submission (${language}):
\`\`\`${language}
${code}
\`\`\`

Analyze the code for:
1. Time Complexity (Big O notation with brief explanation).
2. Space Complexity (Big O notation with brief explanation).
3. Overall feedback on correctness, edge cases, and code style.
4. Actionable optimization suggestions.

You must return a valid JSON object matching the following structure:
{
  "timeComplexity": "string explaining time complexity",
  "spaceComplexity": "string explaining space complexity",
  "feedback": "string summarizing code quality and execution logic",
  "suggestions": ["suggestion 1", "suggestion 2"]
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up markdown block wrapping if the model ignored responseMimeType
      if (text.startsWith('```')) {
        text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      }

      const reviewData = JSON.parse(text);
      this.logger.log(`Successfully generated AI Code Review for problem: ${problemTitle}`);
      return reviewData;
    } catch (error: any) {
      this.logger.error(`Error running Gemini AI Code Review:`, error);
      return {
        timeComplexity: 'Unable to calculate',
        spaceComplexity: 'Unable to calculate',
        feedback: `AI Review failed: ${error.message}`,
        suggestions: ['Ensure your code complies with standard algorithms.'],
      };
    }
  }
}
