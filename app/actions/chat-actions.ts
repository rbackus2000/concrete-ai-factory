"use server";

import { prisma } from "@/lib/db";

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type PersistedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: { name: string; status: "executing" | "done" }[] | null;
  createdAt: string;
};

export async function createChatSession(): Promise<{ id: string }> {
  const session = await prisma.chatSession.create({
    data: { title: "New Chat" },
  });
  return { id: session.id };
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    messageCount: s._count.messages,
  }));
}

export async function getChatSessionMessages(sessionId: string): Promise<PersistedMessage[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    toolCalls: m.toolCalls as PersistedMessage["toolCalls"],
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function saveChatMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; status: string }[] | null;
}): Promise<{ id: string }> {
  const message = await prisma.chatMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      toolCalls: input.toolCalls ?? undefined,
    },
  });

  // Auto-title session from first user message
  if (input.role === "user") {
    const session = await prisma.chatSession.findUnique({
      where: { id: input.sessionId },
    });
    if (session?.title === "New Chat") {
      const title = input.content.length > 60
        ? input.content.slice(0, 57) + "..."
        : input.content;
      await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { title },
      });
    }
  }

  // Touch updatedAt
  await prisma.chatSession.update({
    where: { id: input.sessionId },
    data: { updatedAt: new Date() },
  });

  return { id: message.id };
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await prisma.chatSession.delete({ where: { id: sessionId } });
}

export async function renameChatSession(sessionId: string, title: string): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { title },
  });
}
