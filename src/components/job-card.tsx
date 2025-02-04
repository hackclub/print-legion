"use client";
import { memo, useMemo } from "react";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import { ArrowUpRightIcon, Github, MapPin } from "lucide-react";
import { max_meetup_distance_km, STATUS_AESTHETIC } from "@/lib/consts";

interface JobCardProps {
  job: Job & { id: string; distance?: number };
  className?: string;
}

function JobCardComponent({ job, className }: JobCardProps) {
  const router = useRouter();

  const thumbnailUrl = useMemo(() => {
    if (!job?.user_images || job.user_images.length < 1) {
      return undefined;
    }

    const main_image_id = job.main_image_id;
    const main_image =
      job.user_images.find((image) => image.id === main_image_id) ??
      job.user_images[0];
    return main_image?.thumbnails?.large?.url ?? main_image?.url;
  }, [job.main_image_id, job.stls, job.user_images]);

  return (
    <div
      className={cn(
        "p-4 bg-card border border-border hover:border-zinc-700 transition-all flex gap-2 rounded-xl",
        job.distance !== undefined &&
          job.distance > max_meetup_distance_km &&
          "border-dashed",
        className
      )}
    >
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-2">
              <div className="flex-col">
                <h3 className="font-medium text-sm xs:text-base">
                  {job.item_name || "Untitled Job"}
                </h3>
                {job.item_description && (
                  <p className="text-xs xs:text-sm text-zinc-500">
                    {job.item_description.slice(0, 100).trim()}
                    {job.item_description.length > 100 && "..."}
                  </p>
                )}
              </div>

              {thumbnailUrl && (
                <div className="w-full max-w-[6rem] xs:max-w-[7.375rem] sm:hidden flex shrink-0">
                  <img
                    // src={`https://picsum.photos/400/400?random=${job.id}`}
                    src={thumbnailUrl}
                    alt="Job"
                    className="size-[6rem] xs:size-[7.375rem] object-contain rounded-md border-dashed border border-border"
                  />
                </div>
              )}
            </div>
            <div className="inline-flex flex-wrap gap-1 mt-1">
              {job.part_count && (
                <Badge variant="secondary-static" className="text-xs">
                  {job.part_count} part{job.part_count > 1 ? "s" : ""}
                </Badge>
              )}

              {job.status && job.status !== "needs_printer" && (
                <Badge
                  variant="external-color"
                  className={cn("text-xs", STATUS_AESTHETIC[job.status].color)}
                >
                  {STATUS_AESTHETIC[job.status].text}
                </Badge>
              )}

              {job["(auto)(ysws)name"] && (
                <Badge variant="secondary-static" className="text-xs">
                  {job["(auto)(ysws)name"]}
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
        </div>

        <div className="mt-4 space-x-2 flex flex-row">
          <Button
            onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
            variant="default"
            size="sm"
            className="pr-1.5"
          >
            View Details/Actions <ArrowUpRightIcon className="w-4 h-4 ml-1" />
          </Button>
          {job.ysws_pr_url && (
            <Button
              onClick={() => window.open(job.ysws_pr_url, "_blank")}
              variant="secondary"
              size="sm"
              className="hidden xs:inline-flex"
            >
              <Github className="w-4 h-4 mr-1.5" />
              View PR
            </Button>
          )}
        </div>
      </div>
      {thumbnailUrl && (
        <div className="w-full max-w-[7.375rem] hidden sm:flex">
          <img
            // src={`https://picsum.photos/400/400?random=${job.id}`}
            src={thumbnailUrl}
            alt="Job"
            className="size-[7.375rem] object-contain shrink rounded-md border-dashed border border-border"
          />
        </div>
      )}
    </div>
  );
}

export const JobCard = memo(JobCardComponent);
