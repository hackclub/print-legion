import { useState, useEffect } from "react";
import PrinterCard from "../components/PrinterCard"; // Adjust import path

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export default function PrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCountries, setCollapsedCountries] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(API_URL + "printers")
      .then((res) => res.json())
      .then((data) => {
        setPrinters(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching printers:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center text-2xl py-8">fetching printers! sit tight</div>;

  if (!printers.length) return <div className="text-center py-8">No printers found</div>;

  // Filter printers
  const filteredPrinters = printers.filter((printer) => {
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      printer.nickname?.toLowerCase().includes(q) ||
      printer.country?.toLowerCase().includes(q) ||
      printer.bio?.toLowerCase().includes(q)
    );
  });

  // Sort filtered printers
  const sortedPrinters = [...filteredPrinters].sort((a, b) => {
    const q = search.toLowerCase().trim();

    const aStarts = a.nickname?.toLowerCase().startsWith(q);
    const bStarts = b.nickname?.toLowerCase().startsWith(q);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.nickname.localeCompare(b.nickname);
  });

  // Group filtered printers by country
  const printersByCountry = sortedPrinters.reduce((acc, printer) => {
    const country = printer.country || "Unknown Country";

    if (!acc[country]) acc[country] = [];

    acc[country].push(printer);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="my-6">
        <a href="/" className="outline-1 py-2 px-6 rounded-2xl text-xl font-bold">
          back
        </a>
      </div>

      <h1 className="text-2xl mb-6">The printers!</h1>

      <div className="text-xl space-y-4 mb-6">
        <p>
          These are the Hack Clubbers of printing legion! If you have any questions, please ask in
          #printing-legion on slack!
        </p>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, country, or bio..."
          className="w-full rounded-xl border border-light-ui bg-light-bg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <p className="mb-6 italic">
        There are currently <span className="font-semibold">{filteredPrinters.length}</span>{" "}
        printers listed across{" "}
        <span className="font-semibold">{Object.keys(printersByCountry).length}</span> countries.
      </p>

      {filteredPrinters.length === 0 && (
        <div className="rounded-xl bg-light-bg-2 p-8 text-center mb-6">
          <h2 className="text-xl font-semibold">No printers found</h2>
          <p className="mt-2 text-light-tx-2">Try searching for another name or country.</p>
        </div>
      )}

      {filteredPrinters.length > 0 &&
        Object.entries(printersByCountry).map(([country, countryPrinters]) => (
          <div key={country} className="mb-10">
            <div className="mb-4 flex items-center gap-4">
              <button
                type="button"
                className="px-3 py-1 rounded-xl text-sm font-semibold bg-light-bg-2 text-light-tx"
                aria-label={collapsedCountries[country] ? "Expand" : "Collapse"}
                onClick={() =>
                  setCollapsedCountries((prev) => ({
                    ...prev,
                    [country]: !prev[country],
                  }))
                }
              >
                <span
                  aria-hidden="true"
                  className={`inline-block ${collapsedCountries[country] ? "" : "rotate-90"}`}
                >
                  &gt;
                </span>
              </button>

              <h2 className="text-2xl font-semibold">{country}</h2>
            </div>

            {!collapsedCountries[country] && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countryPrinters.map((printer) => (
                  <PrinterCard key={printer.slack_id} printer={printer} />
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
