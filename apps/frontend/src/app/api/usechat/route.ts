import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUser = [...messages]
      .reverse()
      .find((m: any) => m.role === "user");
    const prompt: string = lastUser?.content ?? "";
    const chatId: string | undefined = body?.chatId;
    const model: string | undefined = body?.model;

    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:3001";
    if (!backendUrl) {
      return new Response(
        JSON.stringify({ error: "Backend URL not configured" }),
        { status: 500 }
      );
    }

    const path = chatId ? `/chat/${encodeURIComponent(chatId)}` : "/chat";
    const resp = await fetch(`${backendUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: Number(session.user.id), prompt, model }),
    });

    const headers = new Headers(resp.headers);
    headers.set(
      "Content-Type",
      headers.get("Content-Type") || "text/event-stream"
    );
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to proxy chat" }), {
      status: 500,
    });
  }
}
