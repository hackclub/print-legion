import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAvailableYSWS, getUserAssignedYSWS, getUser } from "@/lib/airtable";
import { authOptions } from "../auth/[...nextauth]/route";
import { headers } from "next/headers";

export async function GET(req: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ||
      !process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID
    ) {
      console.error("Missing Airtable configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Log request headers for debugging
    const headersList = headers();
    console.log("Request headers:", {
      cookie: headersList.get("cookie"),
      authorization: headersList.get("authorization"),
    });

    const session = await getServerSession(authOptions);
    console.log("Session in /api/ysws:", JSON.stringify(session, null, 2));

    if (!session?.user) {
      console.error("No session or user found");
      return NextResponse.json(
        { error: "Unauthorized - No session" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "http://localhost:3000",
          },
        }
      );
    }

    // Get the Slack ID from the session
    const slackId = session.user.slack_id;
    console.log("Session user:", JSON.stringify(session.user, null, 2));
    console.log("Using Slack ID:", slackId);

    if (!slackId) {
      console.error("No Slack ID found in session");
      return NextResponse.json(
        { error: "Unauthorized - No Slack ID", debug: { user: session.user } },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "http://localhost:3000",
          },
        }
      );
    }

    const user = await getUser(slackId);
    if (!user) {
      console.error("User not found in Airtable for Slack ID:", slackId);
      return NextResponse.json(
        { error: "Unauthorized - User not found", debug: { slackId } },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "http://localhost:3000",
          },
        }
      );
    }

    const [availableYSWS, assignedYSWS] = await Promise.all([
      getAvailableYSWS(user.id),
      getUserAssignedYSWS(user.id),
    ]);

    console.log("Returning data:", {
      available: availableYSWS,
      assigned: assignedYSWS,
      user: {
        id: user.id,
        slack_id: user.slack_id,
        printer_has: user.printer_has,
      },
    });

    return NextResponse.json(
      {
        available: availableYSWS,
        assigned: assignedYSWS,
        user: {
          id: user.id,
          slack_id: user.slack_id,
          printer_has: user.printer_has,
        },
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/ysws:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        debug: {
          message: error instanceof Error ? error.message : String(error),
        },
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Origin": "http://localhost:3000",
        },
      }
    );
  }
}

export async function OPTIONS(req: Request) {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
