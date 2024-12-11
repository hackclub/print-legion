import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY,
}).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

// Constants for table and field IDs
const USERS_TABLE_ID = "tblUdgd85sNoBgnOW";
const AVAILABLE_YSWS_FIELD_ID = "fldl6iC0RqQwKfmW8";

export interface AirtableUser {
  id: string;
  slack_id: string;
  printer_has: boolean;
  Assigned_YSWS: string[];
  available_ysws: string[];
}

export interface YSWS {
  id: string;
  created_at: string;
  deadline?: string;
  has_been_picked?: boolean;
  printer_id?: string;
}

export const getUser = async (
  slackId: string
): Promise<AirtableUser | null> => {
  console.log(`Fetching user with Slack ID: ${slackId}`);
  const records = await base(USERS_TABLE_ID)
    .select({
      filterByFormula: `{slack-id} = '${slackId}'`,
      fields: ["slack-id", "printer_has", "Assigned_YSWS", "available_ysws"],
    })
    .firstPage();

  if (!records.length) {
    console.log("No user found with Slack ID:", slackId);
    return null;
  }

  const record = records[0];
  const user: AirtableUser = {
    id: record.id,
    slack_id: record.get("slack-id") as string,
    printer_has: (record.get("printer_has") as boolean) || false,
    Assigned_YSWS: ((record.get("Assigned_YSWS") as string) || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    available_ysws: ((record.get("available_ysws") as string) || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  console.log("Found user:", user);
  return user;
};

export const getAvailableYSWS = async (userID: string): Promise<string[]> => {
  console.log("Fetching available YSWS from Users table");

  try {
    const records = await base(USERS_TABLE_ID)
      .select({
        filterByFormula: `RECORD_ID() = '${userID}'`,
        fields: ["available_ysws"],
      })
      .firstPage();

    if (!records.length) {
      console.log("No records found with available YSWS");
      return [];
    }
    const available = records[0].get("available_ysws") as string;
    const availableList = available
      ? available
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    console.log("Available YSWS list:", available);
    return availableList;
  } catch (error) {
    console.error("Error fetching available YSWS:", error);
    return [];
  }
};

export const getUserAssignedYSWS = async (
  userId: string
): Promise<string[]> => {
  console.log(`Fetching assigned YSWS for user ID: ${userId} from Users table`);

  try {
    const records = await base(USERS_TABLE_ID)
      .select({
        filterByFormula: `RECORD_ID() = '${userId}'`,
        fields: ["Assigned_YSWS"],
      })
      .firstPage();

    if (!records.length) {
      console.log("No records found for user ID:", userId);
      return [];
    }

    const assigned = records[0].get("Assigned_YSWS") as string;
    const assignedList = assigned
      ? assigned
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    console.log("Assigned YSWS for user:", assignedList);
    return assignedList;
  } catch (error) {
    console.error("Error fetching assigned YSWS:", error);
    return [];
  }
};

export const assignYSWSToUser = async (
  userId: string,
  ysws: string
): Promise<boolean> => {
  console.log(`Assigning YSWS: ${ysws} to user ID: ${userId} in Users table`);

  try {
    const currentAssigned = await getUserAssignedYSWS(userId);

    if (currentAssigned.includes(ysws)) {
      console.log(`YSWS: ${ysws} is already assigned to user ID: ${userId}`);
      return true;
    }

    const newAssigned = [...currentAssigned, ysws].join(",");
    await base(USERS_TABLE_ID).update(userId, { Assigned_YSWS: newAssigned });
    console.log(`YSWS: ${ysws} successfully assigned to user ID: ${userId}`);
    return true;
  } catch (error) {
    console.error("Error assigning YSWS:", error);
    throw error;
  }
};

export const getOutstandingYSWS = async (): Promise<YSWS[]> => {
  // TODO: Implement actual Airtable integration
  return [];
};

export const getAssignedYSWS = async (ysws: string[]): Promise<YSWS[]> => {
  // TODO: Implement actual Airtable integration
  return [];
};

export const getUserYSWS = async (userId: string): Promise<YSWS[]> => {
  // TODO: Implement actual Airtable integration
  return [];
};

export const assignPrinter = async (
  requestId: string,
  printerId: string
): Promise<boolean> => {
  // TODO: Implement actual Airtable integration
  return true;
};
