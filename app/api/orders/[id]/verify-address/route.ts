import { NextRequest, NextResponse } from "next/server";
import { addressVerifySchema } from "@/lib/schemas/order";
import { easypost } from "@/lib/easypost";
import { updateOrderAddress } from "@/lib/services/order-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = addressVerifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const client = easypost.client;
    const addr = parsed.data;

    const verified = await client.Address.create({
      name: addr.name || "",
      company: addr.company || "",
      street1: addr.street1,
      street2: addr.street2 || "",
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country || "US",
      verify: ["delivery"],
    });

    const verifications = verified.verifications as any; // EasyPost untyped
    const delivery = verifications?.delivery;
    const isVerified = delivery?.success === true;

    if (isVerified) {
      await updateOrderAddress(id, {
        shipToName: (verified.name as string) || addr.name,
        shipToCompany: (verified.company as string) || addr.company,
        shipToAddress1: (verified.street1 as string) || addr.street1,
        shipToAddress2: (verified.street2 as string) || addr.street2,
        shipToCity: (verified.city as string) || addr.city,
        shipToState: (verified.state as string) || addr.state,
        shipToZip: (verified.zip as string) || addr.zip,
        addressVerified: true,
      });
    }

    return NextResponse.json({
      data: {
        verified: isVerified,
        corrected: {
          street1: verified.street1,
          street2: verified.street2,
          city: verified.city,
          state: verified.state,
          zip: verified.zip,
        },
        message: isVerified ? "Address verified" : "Address could not be verified",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to verify address";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
