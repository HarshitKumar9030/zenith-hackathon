import { participationPdf } from "@/lib/certificate";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { account, summarize } from "@/lib/service";

/** Owner-only participation record; it makes no government issuance or Aadhaar claim. */
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const a = summarize(await account(user._id));
    const qualifies = a.benefits.organicPickups > 0;
    const record = {
      schema: "waste-right-participation-v1",
      participation: qualifies ? a.participation : null,
      eligibility: { qualifies, status: qualifies && a.participation ? "issued" : "awaiting_organic_pickup" },
      benefits: a.benefits,
      government: { status: "proposed", credentialIssued: false, aadhaarLinked: false },
      statement: "Issued by EcoMitra. Government collaboration proposed; no government endorsement is claimed. This ID is not recorded in Aadhaar.",
      calculatedAt: new Date().toISOString(),
    };
    const headers: Record<string, string> = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
    if (new URL(request.url).searchParams.get("format") === "pdf") {
      if (!qualifies || !a.participation) return NextResponse.json({error:"Complete an accepted, measured organic pickup first."},{status:409,headers});
      const bytes=await participationPdf({name:String(user.name||"EcoMitra participant"),record:a.participation,benefits:a.benefits});
      return new Response(Buffer.from(bytes),{headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${a.participation.id}.pdf"`,"X-Content-Type-Options":"nosniff"}});
    }
    if (new URL(request.url).searchParams.get("download") === "1") {
      if (!qualifies || !a.participation) return NextResponse.json({ error: "Complete a pickup with measured, accepted organic waste before downloading a participation record." }, { status: 409, headers });
      headers["Content-Disposition"] = `attachment; filename="${a.participation.id}.json"`;
    }
    return NextResponse.json(record, { headers });
  } catch {
    return NextResponse.json({ error: "Your participation record could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
