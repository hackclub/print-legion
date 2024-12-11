"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PrinterIcon, StarIcon } from "@heroicons/react/24/outline";

interface DashboardClientProps {
  initialData: {
    available: string[];
    assigned: string[];
  };
}

export const DashboardClient = ({ initialData }: DashboardClientProps) => {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/");
    },
  });

  const [availableYSWS, setAvailableYSWS] = useState<string[]>(
    initialData.available
  );
  const [assignedYSWS, setAssignedYSWS] = useState<string[]>(
    initialData.assigned
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coins] = useState(0);

  useEffect(() => {
    if (session?.user && !session.user.printer_has) {
      router.push("/printer-status");
    }
  }, [session, router]);

  const handleAssignYSWS = async (ysws: string) => {
    if (!session?.user?.id) return;

    try {
      setError(null);
      const response = await fetch("/api/ysws/assign", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ userId: session.user.id, ysws }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign YSWS");
      }

      setAssignedYSWS((prev) => [...prev, ysws]);
      setAvailableYSWS((prev) => prev.filter((y) => y !== ysws));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to assign YSWS"
      );
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-b-2 border-gray-900 animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <PrinterIcon className="mr-2 w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold">Dashboard</h3>
            </div>
            <div className="flex items-center space-x-4">
              <StarIcon className="w-6 h-6 text-yellow-500" />
              <span>{coins} Coins</span>
            </div>
          </div>
        </div>
      </div>

      <main className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {error && (
          <div className="px-4 py-2 mb-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="px-4 py-6 sm:px-0">
          <div className="overflow-hidden mb-8 bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Available YSWS
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {availableYSWS.length === 0 ? (
                  <li className="px-4 py-4 text-gray-500 sm:px-6">
                    No available YSWS
                  </li>
                ) : (
                  availableYSWS.map((ysws) => (
                    <li key={ysws} className="px-4 py-4 sm:px-6">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-indigo-600">
                          {ysws}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssignYSWS(ysws)}
                          className="px-3 py-1 text-sm text-indigo-800 bg-indigo-100 rounded-full hover:bg-indigo-200"
                        >
                          Assign
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-0">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Assigned YSWS
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {assignedYSWS.length === 0 ? (
                  <li className="px-4 py-4 text-gray-500 sm:px-6">
                    No assigned YSWS
                  </li>
                ) : (
                  assignedYSWS.map((ysws) => (
                    <li key={ysws} className="px-4 py-4 sm:px-6">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-indigo-600">
                          {ysws}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
