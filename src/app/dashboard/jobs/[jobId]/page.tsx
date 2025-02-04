import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import type { User } from "@/lib/types";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  DownloadIcon,
  FileIcon,
  GithubIcon,
  MapPin,
  PencilIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCarousel, SlackCard } from "./client-components";
import { JobStateButtons } from "./states/job-state-buttons";
import { max_meetup_distance_km, STATUS_AESTHETIC } from "@/lib/consts";
import { cached_getById } from "../../layout";
import { getSlackUserInfo, SlackUserInfo } from "@/lib/slack";
import { lazy } from "react";

const Markdown = lazy(() => import("@/components/markdown"));

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const jobId = (await params).jobId;
  const user = await cached_getById("user", session.user.id);
  const job = await cached_getById("job", jobId, {
    coordinatesForDistance: user?.region_coordinates,
  });

  if (!user || !job) {
    notFound();
  }

  const assignedPrinterId = job["(auto)(assigned_printer)slack_id"]?.[0];
  const creatorSlackId = job["(auto)(creator)slack_id"]?.[0];

  const creatorSlackInfoPromise = creatorSlackId
    ? getSlackUserInfo(creatorSlackId)
    : new Promise((r) => r(null));

  const printerSlackInfoPromise = assignedPrinterId
    ? getSlackUserInfo(assignedPrinterId)
    : new Promise((r) => r(null));
  const printerUserPromise = assignedPrinterId
    ? cached_getById("user", assignedPrinterId)
    : new Promise((r) => r(null));

  const printerDataPromise = Promise.all([
    printerSlackInfoPromise,
    printerUserPromise,
  ]) as Promise<[SlackUserInfo | null, User | null]>;

  const creatorDataPromise = Promise.all([
    creatorSlackInfoPromise,
    new Promise((r) => r(user)),
  ]) as Promise<[SlackUserInfo | null, User | null]>;

  const isMyJob = creatorSlackId === session.user.id;
  const isPrinting = assignedPrinterId === session.user.id;
  const hasPrinter = user.printer_has ?? false;

  const files = [...(job.stls || []), ...(job.gcode_files || [])];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {job.item_name || "Untitled Job"}
          </h1>
          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Badge variant="secondary-static" className="text-xs">
              {job.part_count || 0} part{job.part_count !== 1 ? "s" : ""}
            </Badge>
            {job.status && (
              <Badge
                variant="external-color"
                className={cn("text-xs", STATUS_AESTHETIC[job.status].color)}
              >
                {STATUS_AESTHETIC[job.status].text}
              </Badge>
            )}

            {job.distance !== undefined && (
              <Badge
                variant="secondary-static"
                className={cn(
                  "text-xs px-1.5",
                  job.distance < max_meetup_distance_km / 2 &&
                    "text-emerald-200 bg-emerald-600/20",
                  job.distance > max_meetup_distance_km / 2 &&
                    "text-orange-200 bg-orange-600/20",
                  job.distance > max_meetup_distance_km &&
                    "text-red-200 bg-red-600/20"
                )}
              >
                <MapPin className="size-[0.875rem] shrink-0 mr-1" />
                {job.distance === 0.0
                  ? "Nearby"
                  : `~${job.distance.toFixed(0)} km`}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {job.ysws_pr_url && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link
                href={job.ysws_pr_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="size-4" />
                View PR
                <ArrowUpRightIcon className="size-3" />
              </Link>
            </Button>
          )}
          {isMyJob &&
            job.status !== "fulfilled_awaiting_confirmation" &&
            job.status !== "finished" && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href={`/dashboard/jobs/edit/${jobId}`}>
                  <PencilIcon className="size-4" />
                  Edit Details
                </Link>
              </Button>
            )}
        </div>
      </div>

      {/* Description */}
      {job.item_description && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium tracking-tight">Description</h2>
          <Markdown>{job.item_description}</Markdown>
        </div>
      )}

      <ImageCarousel
        fulfillment_photo={
          session.user.id === creatorSlackId ||
          session.user.id === assignedPrinterId
            ? job.fulfilment_photo
            : undefined
        }
        user_images={job.user_images}
        main_image_id={job.main_image_id}
      />

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Files</h2>
          <div className="grid gap-2">
            {files.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-2.5 py-1.5 bg-card hover:bg-muted/50 rounded-lg border border-border transition-colors group"
              >
                <div className="p-2 bg-muted rounded-md">
                  <FileIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    <span className="xs:hidden">
                      {file.filename.length > 25
                        ? `${file.filename.slice(0, 18).trim()}.${file.filename
                            .split(".")
                            .pop()}`
                        : file.filename}
                    </span>
                    <span className="hidden xs:inline">{file.filename}</span>
                    {file.id === job.main_stl_id && (
                      <Badge variant="secondary" className="ml-2">
                        Main File
                      </Badge>
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(file.size / 1024)}KB
                  </p>
                </div>
                <DownloadIcon className="size-4 text-muted-foreground group-hover:text-primary transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {creatorSlackId && creatorSlackId !== session.user.id && (
        <SlackCard
          title="Submitter"
          promise={creatorDataPromise}
          showPrinter={false}
        />
      )}

      {assignedPrinterId && assignedPrinterId !== session.user.id && (
        <SlackCard title="Assigned printer" promise={printerDataPromise} />
      )}

      {hasPrinter &&
        job.status === "needs_printer" &&
        job.distance !== undefined &&
        job.distance > max_meetup_distance_km && (
          <span className="flex text-sm text-muted-foreground mt-4 max-w-xl">
            Hmm - Seems like you are too far away from the submitter to claim
            this job. For now, we only do meetups, for which the job needs to be
            within {max_meetup_distance_km} km...
          </span>
        )}

      <div className="flex flex-wrap gap-2 pt-4">
        <JobStateButtons
          jobId={jobId}
          status={job.status || "needs_printer"}
          isMyJob={isMyJob}
          isPrinting={isPrinting}
          hasPrinter={hasPrinter}
          distance={job.distance}
        />
      </div>
    </div>
  );
}
