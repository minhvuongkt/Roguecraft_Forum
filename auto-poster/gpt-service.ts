import OpenAI from 'openai';

export interface OptimizationResult {
  success: boolean;
  optimizedTitle?: string;
  optimizedContent?: string;
  error?: string;
}

export class GPTOptimizationService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async optimizeContentForSEO(title: string, content: string): Promise<OptimizationResult> {
    try {
      const prompt = `Please optimize the following article for SEO:

Title: ${title}
Content: ${content}

Requirements:
1. Optimize the title for SEO (should be 50-60 characters, compelling, include main keywords)
2. Optimize the content for SEO while maintaining readability
3. If the content is too short (less than 300 words), expand it based on the title and existing content
4. Use proper heading structure (H2, H3)
5. Include relevant keywords naturally
6. Make sure the content is engaging and informative
7. Maintain the original meaning and facts

Please respond in the following JSON format:
{
  "optimizedTitle": "Your optimized title here",
  "optimizedContent": "Your optimized content here with HTML formatting"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO content optimizer. You specialize in creating SEO-friendly titles and content while maintaining readability and engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from GPT API');
      }

      try {
        const parsedResponse = JSON.parse(responseContent);
        return {
          success: true,
          optimizedTitle: parsedResponse.optimizedTitle,
          optimizedContent: parsedResponse.optimizedContent
        };
      } catch (parseError) {
        // If JSON parsing fails, try to extract content manually
        const titleMatch = responseContent.match(/"optimizedTitle":\s*"([^"]+)"/);
        const contentMatch = responseContent.match(/"optimizedContent":\s*"([\s\S]*?)"/);

        if (titleMatch && contentMatch) {
          return {
            success: true,
            optimizedTitle: titleMatch[1],
            optimizedContent: contentMatch[1]
          };
        } else {
          throw new Error('Failed to parse GPT response');
        }
      }
    } catch (error) {
      console.error('Error optimizing content with GPT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateThreadsPost(title: string, content: string, wordpressUrl: string): Promise<OptimizationResult> {
    try {
      const prompt = `Create an engaging social media post for Threads based on this article:

Title: ${title}
Content: ${content}
WordPress URL: ${wordpressUrl}

Requirements:
1. Create a compelling post that will get engagement
2. Include relevant hashtags (3-5)
3. Keep it concise but informative
4. Include the WordPress URL at the end
5. Use emojis to make it more engaging
6. Maximum 500 characters

Please respond with just the social media post content, no additional formatting.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content creator. You specialize in creating engaging posts that drive traffic and engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const optimizedContent = response.choices[0]?.message?.content;
      if (!optimizedContent) {
        throw new Error('No response from GPT API');
      }

      return {
        success: true,
        optimizedContent: optimizedContent.trim()
      };
    } catch (error) {
      console.error('Error generating Threads post with GPT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async summarizeArticle(title: string, content: string): Promise<OptimizationResult> {
    try {
      const prompt = `Please create a concise summary of this article:

Title: ${title}
Content: ${content}

Requirements:
1. Create a 2-3 sentence summary
2. Capture the main points
3. Keep it engaging and informative
4. Maximum 150 words

Please respond with just the summary, no additional formatting.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content summarizer. You specialize in creating concise, engaging summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 200
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No response from GPT API');
      }

      return {
        success: true,
        optimizedContent: summary.trim()
      };
    } catch (error) {
      console.error('Error summarizing article with GPT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async improveContent(content: string, targetLength: number = 500): Promise<OptimizationResult> {
    try {
      const prompt = `Please improve and expand this content:

Content: ${content}

Requirements:
1. Expand to approximately ${targetLength} words
2. Improve readability and flow
3. Add more details and context
4. Use proper formatting with headings
5. Make it more engaging
6. Maintain the original meaning and facts

Please respond with just the improved content with HTML formatting.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content writer. You specialize in improving and expanding content while maintaining quality and readability.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const improvedContent = response.choices[0]?.message?.content;
      if (!improvedContent) {
        throw new Error('No response from GPT API');
      }

      return {
        success: true,
        optimizedContent: improvedContent.trim()
      };
    } catch (error) {
      console.error('Error improving content with GPT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Test connection. Please respond with "Connection successful".'
          }
        ],
        max_tokens: 10
      });

      return response.choices[0]?.message?.content?.includes('Connection successful') || false;
    } catch (error) {
      console.error('GPT connection test failed:', error);
      return false;
    }
  }
}

export default GPTOptimizationService;