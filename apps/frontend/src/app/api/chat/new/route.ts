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
    
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:3001";

    const response = await fetch(`${backendUrl}/chat/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: Number(session.user.id),
        id: body.id,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data);
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to create chat" }),
        { status: response.status }
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Failed to create chat" }),
      { status: 500 }
    );
  }
}