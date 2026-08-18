import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { assigneeMatchesPerson } from "@/lib/assignee-match";
import {
  notifyAdminsOfCrewResponse,
} from "@/lib/notifications/crew-notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const crewMemberId = session?.user?.crewMemberId;

    if (!crewMemberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const status = body?.status;
    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const rawAssignmentId =
      typeof body?.assignmentId === "string" ? body.assignmentId : "";
    const rawJobId =
      typeof body?.jobId === "string"
        ? body.jobId
        : rawAssignmentId.startsWith("job:")
          ? rawAssignmentId.slice(4)
          : "";

    const supabase = createServiceClient();

    const { data: member } = await supabase
      .from("crew_members")
      .select("id, name, locale")
      .eq("id", crewMemberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let assignmentId = rawAssignmentId.startsWith("job:")
      ? ""
      : rawAssignmentId;

    if (!assignmentId && rawJobId) {
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id, title, site_address, work_date, work_kind, assigned_to, status")
        .eq("id", rawJobId)
        .neq("status", "cancelled")
        .maybeSingle();

      if (jobErr || !job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Must be assigned to this person (or already have a row)
      const { data: existing } = await supabase
        .from("job_assignments")
        .select("id, status")
        .eq("job_id", job.id)
        .eq("crew_member_id", crewMemberId)
        .maybeSingle();

      if (!existing && !assigneeMatchesPerson(job.assigned_to, member.name)) {
        return NextResponse.json(
          { error: "This job is not assigned to you." },
          { status: 403 },
        );
      }

      if (existing?.id) {
        assignmentId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("job_assignments")
          .upsert(
            {
              job_id: job.id,
              crew_member_id: crewMemberId,
              status: "pending",
              role: "crew",
              assigned_at: new Date().toISOString(),
            },
            { onConflict: "job_id,crew_member_id" },
          )
          .select("id")
          .single();

        if (createErr || !created) {
          console.error("create assignment failed:", createErr?.message);
          return NextResponse.json(
            { error: "Could not create assignment" },
            { status: 500 },
          );
        }
        assignmentId = created.id;
      }
    }

    if (!assignmentId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: assignment, error: fetchError } = await supabase
      .from("job_assignments")
      .select("id, job_id, status, jobs(id, title, site_address, work_date, work_kind, assigned_to)")
      .eq("id", assignmentId)
      .eq("crew_member_id", crewMemberId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

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

    const jobRaw = assignment.jobs as
      | {
          id: string;
          title: string;
          site_address: string | null;
          work_date: string | null;
          work_kind: string | null;
          assigned_to: string | null;
        }
      | {
          id: string;
          title: string;
          site_address: string | null;
          work_date: string | null;
          work_kind: string | null;
          assigned_to: string | null;
        }[]
      | null;
    const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;

    if (job) {
      void notifyAdminsOfCrewResponse(supabase, {
        job,
        crewName: member.name,
        status,
      });
    }

    return NextResponse.json({ success: true, assignmentId, status });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
