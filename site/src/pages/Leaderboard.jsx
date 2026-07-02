import { useEffect, useMemo, useState } from "react";

const baseApiUrl = (import.meta.env.VITE_API_URL || "/api/").replace(/\/?$/, "/");
import PrinterCardSkeleton from "../components/PrinterCardSkeleton";
const LEADERBOARD_URL = import.meta.env.VITE_LEADERBOARD_URL || `${baseApiUrl}stats/leaderboard`; // ||
// "https://printlegion.hackclub.com/api/stats/leaderboard";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const response = await fetch(LEADERBOARD_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }
        const data = await response.json();
        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("We couldn't load the leaderboard right now. Please try again in a bit.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const [podium, rest] = useMemo(() => {
    if (!entries.length) return [[], []];
    return [entries.slice(0, 3), entries.slice(3)];
  }, [entries]);

  const formatWeight = (grams) => {
    if (grams == null) return "0 g";
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
    return `${Math.round(grams)} g`;
  };

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="my-6 flex flex-wrap gap-3">
        <a href="/" className="outline-1 py-2 px-6 rounded-2xl text-xl font-bold">
          back
        </a>
        <a href="/printers" className="outline-1 py-2 px-6 rounded-2xl text-xl font-bold">
          printers
        </a>
      </div>

      <h1 className="text-3xl mb-8 font-bold text-center">Printing Legion Leaderboard</h1>

      {loading && (
        <section className="grid gap-6 md:grid-cols-3 mb-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <PrinterCardSkeleton key={i} />
          ))}
        </section>
      )}

      {error && <div className="text-center text-red-600 font-semibold py-4">{error}</div>}

      {!loading && !error && !entries.length && (
        <div className="text-center text-gray-600 py-8">No leaderboard data yet.</div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <section className="grid gap-6 md:grid-cols-3 mb-8">
            {podium.map((entry) => (
              <article
                key={entry.slack_id}
                className="bg-dark-ui rounded-lg shadow-lg p-6 flex flex-col items-center text-center border-2 border-paper"
              >
                <div className="text-5xl font-black text-blue-500 mb-4">#{entry.position}</div>
                <img
                  src={entry.profile_pic}
                  alt={entry.nickname}
                  loading="lazy"
                  decoding="async"
                  width={112}
                  height={112}
                  className="w-28 h-28 rounded-full object-cover border-4 border-paper mb-4"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <h2 className="text-2xl font-semibold mb-1">{entry.nickname}</h2>
                <p className="text-gray-500 mb-4">
                  {entry.total_prints} prints | {formatWeight(entry.total_grams)} total
                </p>
                <a
                  href={`https://slack.com/app_redirect?channel=${entry.slack_id}`}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold"
                >
                  Ping on Slack
                </a>
              </article>
            ))}
          </section>

          {rest.length > 0 && (
            <section className="bg-dark-ui rounded-2xl shadow divide-y divide-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-dark-ui-2">
                <h3 className="text-xl font-semibold">Full leaderboard</h3>
              </div>
              <div className="divide-y">
                {rest.map((entry) => (
                  <div key={entry.slack_id} className="px-6 py-4 flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-400 w-12">#{entry.position}</span>
                    <img
                      src={entry.profile_pic}
                      alt={entry.nickname}
                      loading="lazy"
                      decoding="async"
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full object-cover border border-gray-100"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.png";
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{entry.nickname}</p>
                      <p className="text-sm text-gray-500">
                        {entry.total_prints} prints | {formatWeight(entry.total_grams)} printed
                      </p>
                    </div>
                    <a
                      href={`https://slack.com/app_redirect?channel=${entry.slack_id}`}
                      className="text-blue-600 font-semibold"
                    >
                      Say hi →
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
