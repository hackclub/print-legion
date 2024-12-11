import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getAvailableYSWS, getUser } from "@/lib/airtable";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Dashboard - Print Farm",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.slack_id) {
    return null;
  }

  const user = await getUser(session.user.slack_id);
  if (!user) {
    return null;
  }

  const availableYSWS = await getAvailableYSWS(user.slack_id);

  return (
    <DashboardClient
      initialData={{
        available: availableYSWS,
        assigned: user.Assigned_YSWS,
      }}
    />
  );
}
