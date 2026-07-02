import LandingContent from "../markdown/LandingContent.mdx";
import Faq from "../markdown/Faq.mdx";
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export default function Landing() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetch(API_URL + "stats/alltime") // Your Express endpoint
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch((error) => {
        console.error("Error fetching all-time stats:", error);
      });
  }, []);

  const { total_weight, total_prints, total_spools_reimbursed, total_countries } = stats;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-4xl mb-6 font-bold text-center text-dark-ma">Printing Legion!</h1>
      <p className="text-xl mb-4 text-dark-tx text-center max-w-4xl mx-auto">
        An international network of 3D printers from Hack Club!
      </p>

      {/* all-time stats */}
      <div>
        {/* <h2 className="text-2xl mb-4 font-bold text-dark-ye text-center">
          all-time stats!
        </h2> */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 w-full max-w-5xl mx-auto">
          <div className="bg-light-bg-2 shadow-md p-4 text-center rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-light-tx mt-2">Grams printed:</h3>
            <p className="text-3xl font-bold text-blue-600">
              {total_weight ? (total_weight / 1000).toFixed(2) + " kg" : "Loading..."}
            </p>
          </div>
          <div className="bg-light-bg-2 rounded-lg shadow-md p-6 text-center">
            <h3 className="text-xl font-semibold mb-2 text-light-tx">Projects printed:</h3>
            <p className="text-3xl font-bold text-blue-600">{total_prints || "Loading..."}</p>
          </div>
          <div className="bg-light-bg-2 rounded-lg shadow-md p-6 text-center">
            <h3 className="text-xl font-semibold mb-2 text-light-tx">Spool sent:</h3>
            <p className="text-3xl font-bold text-blue-600">
              {total_spools_reimbursed ? total_spools_reimbursed.toFixed(0) : "Loading..."}
            </p>
          </div>
          <div className="bg-light-bg-2 rounded-lg shadow-md p-6 text-center">
            <h3 className="text-xl font-semibold mb-2 text-light-tx">Countries:</h3>
            <p className="text-3xl font-bold text-blue-600">
              {total_countries ? total_countries : "Loading..."}
            </p>
          </div>
        </div>
      </div>
      {/* Buttons */}
      <div className="my-6 flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
        <a
          href="/printers"
          className="w-full sm:w-80 text-center border-2 border-paper py-2 px-6 rounded-lg text-lg font-bold bg-blue-600 text-white"
        >
          Check out the printers!
        </a>
        <a
          href="/leaderboard"
          className="w-full sm:w-80 text-center border-2 border-paper py-2 px-6 rounded-lg text-lg font-bold bg-green-600 text-white"
        >
          View the leaderboard
        </a>
      </div>

      {/* Instructions */}
      <div className="mb-6 rounded-lg grid grid-cols-1 lg:grid-cols-2 gap-12 w-full prose prose-sm prose-flexoki prose-h2:text-dark-cy max-w-none">
        <div className="border-3 border-paper px-8 bg-dark-ui">
          <LandingContent />
        </div>
        <div className="border-3 border-paper px-8 bg-dark-ui prose-strong:text-dark-ma">
          <Faq />
        </div>
      </div>
    </div>
  );
}
