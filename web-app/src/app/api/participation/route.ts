import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { account, summarize } from "@/lib/service";

/** Owner-only participation record; it makes no government issuance or Aadhaar claim. */
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const a = summarize(await account(user._id));
    const record = {
      schema: "waste-right-participation-v1",
      participation: a.participation,
      benefits: a.benefits,
      government: { status: "proposed", credentialIssued: false, aadhaarLinked: false },
      statement: "Issued by Waste Right. Government collaboration proposed; no government endorsement is claimed. This ID is not recorded in Aadhaar.",
      calculatedAt: new Date().toISOString(),
    };
    const headers: Record<string, string> = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
    if (new URL(request.url).searchParams.get("download") === "1")
      headers["Content-Disposition"] = `attachment; filename="${a.participation.id}.json"`;
    return NextResponse.json(record, { headers });
  } catch {
    return NextResponse.json({ error: "Your participation record could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
