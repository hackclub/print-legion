"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createJob } from "@/app/actions";

export default function CreateJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      await createJob(formData);
      router.push("/dashboard/jobs");
      router.refresh();
    } catch (error) {
      console.error("Failed to create job:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Create New Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="ysws" className="block text-sm font-medium mb-2">
              YSWS Description
            </label>
            <Input
              id="ysws"
              name="ysws"
              placeholder="Enter YSWS description"
              required
            />
          </div>

          <div>
            <label
              htmlFor="ysws_pr_url"
              className="block text-sm font-medium mb-2"
            >
              PR URL
            </label>
            <Input
              id="ysws_pr_url"
              name="ysws_pr_url"
              type="url"
              placeholder="Enter PR URL"
            />
          </div>

          <div>
            <label
              htmlFor="part_count"
              className="block text-sm font-medium mb-2"
            >
              Number of Parts
            </label>
            <Input
              id="part_count"
              name="part_count"
              type="number"
              min="1"
              placeholder="Enter number of parts"
              required
            />
          </div>

          <div>
            <label htmlFor="stls" className="block text-sm font-medium mb-2">
              STL Files
            </label>
            <Input
              id="stls"
              name="stls"
              type="file"
              accept=".stl"
              multiple
              required
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-100 hover:file:bg-zinc-700"
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Job"}
        </Button>
      </form>
    </div>
  );
}
