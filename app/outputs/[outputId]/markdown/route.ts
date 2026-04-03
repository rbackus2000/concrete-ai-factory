import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { logGeneratedOutputEvent } from "@/lib/services/audit-service";
import { exportGeneratedOutputMarkdown } from "@/lib/services/export-service";

type OutputMarkdownRouteProps = {
  params: Promise<{
    outputId: string;
  }>;
};

export async function GET(_: Request, { params }: OutputMarkdownRouteProps) {
  const actor = await requireSession();
  const { outputId } = await params;
  const exported = await exportGeneratedOutputMarkdown(outputId);

  if (!exported) {
    return new NextResponse("Output not found.", { status: 404 });
  }

  await logGeneratedOutputEvent({
    actor,
    outputId,
    action: "EXPORT_MARKDOWN",
  });

  return new NextResponse(exported.content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
    },
  });
}
