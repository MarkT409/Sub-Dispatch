import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.crewMemberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignmentId, status } = await req.json();

    if (!assignmentId || !["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createClient();

    // Verify this assignment belongs to the logged-in crew member
    const { data: assignment, error: fetchError } = await supabase
      .from("job_assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("crew_member_id", session.user.crewMemberId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Update the assignment status
    const { error: updateError } = await supabase
      .from("job_assignments")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }

    // TODO: Send notification to admin about response

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
