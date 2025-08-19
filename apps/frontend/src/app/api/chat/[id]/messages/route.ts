import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import config from "@/config";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.id;

    // Forward the session cookie to the backend
    const sessionCookie = request.cookies.get("better-auth.session_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    console.log("sessionCookie", sessionCookie);

    if (sessionCookie) {
      headers["Cookie"] = `session_token=${sessionCookie.value}`;
    }

    const response = await fetch(
      `${config.backend.url}/chat/${chatId}/messages`,
      {
        method: "GET",
        headers,
      }
    );
    console.log(`${config.backend.url}/chat/${chatId}/messages`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      throw new Error(`Backend responded with ${response.status}`);
    }

    const messages = await response.json();
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
