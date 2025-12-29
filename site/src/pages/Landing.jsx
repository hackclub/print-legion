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

    const { total_weight, total_prints, total_spools_reimbursed } = stats;
    return (
        <div className="container mx-auto px-4 py-8 w-full">
            <h1 className="text-3xl mb-6 font-bold text-center">
                Printing Legion
            </h1>
            <p className="text-xl mb-4">
                Welcome to the printing legion! This is the international
                network of 3D printers from Hack Club!
            </p>

            {/* all-time stats */}
            <div>
                <h2 className="text-2xl mb-4 font-bold">All-time stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <h3 className="text-xl font-semibold mb-2">
                            Total Weight Printed
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {total_weight
                                ? (total_weight / 1000).toFixed(2) + " kg"
                                : "Loading..."}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <h3 className="text-xl font-semibold mb-2">
                            Total Prints
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {total_prints || "Loading..."}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <h3 className="text-xl font-semibold mb-2">
                            Total Spools Reimbursed
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {total_spools_reimbursed
                                ? total_spools_reimbursed.toFixed(0)
                                : "Loading..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="mb-6 rounded-lg prose flex flex-col lg:grid lg:grid-cols-2 max-w-full space-x-12">
                <div>
                    <LandingContent />
                </div>
                <div>
                    <Faq />
                </div>
            </div>

            <div className="my-6 justify-center flex">
                <a
                    href="/printers"
                    className="outline-1 py-2 px-6 rounded-xl text-lg font-bold bg-blue-500 text-white"
                >
                    Check out the printers!
                </a>
            </div>
        </div>
    );
}
