import { CallbackManagerForLLMRun } from "@langchain/core/dist/callbacks/manager";
import { LLM } from "@langchain/core/language_models/llms";

interface Message {
  role: string;
  content: string;
}

function formatPrompt(
  messages: Message[],
  addSpecialTokens: boolean = false
): string {
  if (!addSpecialTokens && messages.length <= 1) {
    return messages[0].content;
  }

  const formatted = messages
    .map(
      (message) =>
        `${message.role.charAt(0).toUpperCase() + message.role.slice(1)}: ${
          message.content
        }`
    )
    .join("\n");

  return `${formatted}\nAssistant:`;
}

export class GptGo extends LLM {
  static url: string = "https://gptgo.ai";

  static _headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-language": "en-US",
    Origin: this.url,
    Referer: `${this.url}/`,
    "sec-ch-ua":
      '"Google Chrome";v="116", "Chromium";v="116", "Not?A_Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  constructor() {
    super({});
  }

  _llmType() {
    return "gptgo";
  }

  _call(
    prompt: string,
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun | undefined
  ): Promise<string> {
    return this.caller.callWithOptions({ signal: options.signal }, async () => {
      try {
        const formData = new FormData();
        formData.append(
          "ask",
          formatPrompt([{ role: "user", content: prompt }])
        );
        // First POST request
        const tokenResponse = await fetch("https://gptgo.ai/get_token.php", {
          method: "POST",
          headers: {
            ...GptGo._headers,
          },
          body: formData,
          // Add proxy configuration if necessary
        });
        const tokenData = await tokenResponse.text();
        let token = atob(tokenData.slice(10, -20));

        // Second GET request
        const response = await fetch(
          `https://api.gptgo.ai/web.php?array_chat=${token}`,
          {
            headers: GptGo._headers,
            // Add proxy configuration if necessary
          }
        );

        const responseData = await response.text();

        async function responseProcessor(
          responseData: string
        ): Promise<string> {
          let result = "";

          for (let line of responseData.split("\n")) {
            if (line.startsWith("data: [DONE]")) {
              break;
            }
            if (line.startsWith("data: ")) {
              const content = JSON.parse(line.slice(6)).choices[0].delta
                ?.content;
              if (content && content !== "\n#GPTGO ") {
                result += content; // Append each content line to the result string
              }
            }
          }

          return result;
        }

        return responseProcessor(responseData);
      } catch (error) {
        console.error("Error in GptGo API interaction:", error);
        throw error;
      }
    });
  }

  async _getToken() {}
}
