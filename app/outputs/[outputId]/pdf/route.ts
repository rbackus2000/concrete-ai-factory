import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { logGeneratedOutputEvent } from "@/lib/services/audit-service";
import { exportBuildPacketPdf } from "@/lib/services/pdf-export-service";

type OutputPdfRouteProps = {
  params: Promise<{
    outputId: string;
  }>;
};

export async function GET(_: Request, { params }: OutputPdfRouteProps) {
  const actor = await requireSession();
  const { outputId } = await params;
  try {
    const exported = await exportBuildPacketPdf(outputId);

    if (!exported) {
      return new NextResponse("Printable PDF export is only available for build packet outputs.", {
        status: 404,
      });
    }

    await logGeneratedOutputEvent({
      actor,
      outputId,
      action: "EXPORT_PDF",
    });

    return new NextResponse(exported.content, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "PDF export failed.",
      { status: 500 },
    );
  }
}
