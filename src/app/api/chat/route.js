// src/app/api/chat/route.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, type = "text" } = body;

    if (type === "image") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: message,
          n: 1,
          size: "1024x1024",
        }, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return new Response(
          JSON.stringify({
            type: "image",
            message: message,
            imageUrl: response.data[0].url,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          }
        );
      } catch (error) {
        if (error.name === 'AbortError') {
          return new Response(
            JSON.stringify({
              error: "Image generation took too long. Please try again.",
            }),
            { status: 408 }
          );
        }
        throw error;
      }
    }

    // Regular text chat với AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are XMagic AI, an AI assistant specializing in blockchain, cryptocurrency, and XRP technology. Be concise and helpful.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return new Response(
        JSON.stringify({
          type: "text",
          message: chatResponse.choices[0].message.content,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: "Request took too long. Please try again.",
          }),
          { status: 408 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("OpenAI API error:", error);

    const errorMessage = error.name === 'AbortError' 
      ? "Request timed out. Please try again."
      : "Failed to get response from AI";
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: error.name === 'AbortError' ? 408 : 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}