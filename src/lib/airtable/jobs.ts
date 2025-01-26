import { jobsTable } from ".";
import { JobSchema, type Job } from "../types";

// Search helper
export async function searchJobs({
  query,
  mode = "search",
  offset = 0,
  maxRecords = 25,
}: {
  query?: string;
  mode?: "search" | "formula";
  offset?: number;
  maxRecords?: number;
}) {
  try {
    const records = await jobsTable
      .select({
        filterByFormula:
          mode === "search"
            ? `OR(SEARCH("${query}", LOWER({slack_id})), SEARCH("${query}", LOWER({ysws})))`
            : query,
        offset,
        maxRecords,
      })
      .all();

    return records
      .map((record) => {
        const parsed = JobSchema.safeParse(record.fields);
        if (!parsed.success) {
          console.error("Failed to parse job record:", parsed.error.message);
          return null;
        }
        return { ...parsed.data, id: record.id };
      })
      .filter(Boolean) as (Job & { id: string })[];
  } catch (error) {
    console.error("Error searching jobs:", error);
    return [];
  }
}
