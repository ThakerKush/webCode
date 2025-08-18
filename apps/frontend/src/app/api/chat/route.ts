import * as z from "zod";
import type { InferSelectModel } from "drizzle-orm";
import { ChatSDKError } from "@/lib/errors";
import { useSession } from "@/lib/auth-client";
import { auth } from "@/lib/auth";
import config from "@/config";

const postRequestBodySchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  userId: z.number(),
  message: z.string(),
  modelProvider: z.string(),
  model: z.string(),
});

type PostRequestBody = z.infer<typeof postRequestBodySchema>;
export async function POST(request: Request) {
  let requestBody: PostRequestBody;
  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
  try {
    const {
      chatId,
      messageId,
      userId,
      message,
      modelProvider,
      model,
    }: {
      chatId: string;
      messageId: string;
      userId: number;
      message: string;
      modelProvider: string;
      model: string;
    } = requestBody;

    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return new ChatSDKError("unauthorized:api").toResponse();
    }

    const response = await fetch(`${config.backend.url}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    // Forward the stream directly - backend already formats it with toUIMessageStreamResponse()
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in chat API route:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
