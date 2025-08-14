import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chat } from "@repo/db/schema";
import { and, desc, eq, lt, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const endingBefore = searchParams.get("ending_before");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let whereClause: SQL = eq(
      chat.userId,
      session.user.id as unknown as number
    ) as SQL;
    if (endingBefore) {
      whereClause = and(
        whereClause,
        lt(chat.createdAt, new Date(endingBefore))
      ) as SQL;
    }

    const chats = await db
      .select()
      .from(chat)
      .where(whereClause)
      .orderBy(desc(chat.createdAt))
      .limit(limit);

    const hasMore = chats.length === limit;

    return NextResponse.json({ chats, hasMore });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatUuid = searchParams.get("chatUuid");

    if (!chatUuid) {
      return NextResponse.json(
        { error: "Chat UUID is required" },
        { status: 400 }
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await db.delete(chat).where(
      and(
        eq(chat.uuid, chatUuid), // Use uuid field instead of id
        eq(chat.userId, session.user.id as unknown as number)
      )
    );

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
