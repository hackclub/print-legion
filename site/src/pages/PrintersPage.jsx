import { useState, useEffect } from "react";
import PrinterCard from "../components/PrinterCard"; // Adjust import path

const API_URL = import.meta.env.VITE_API_URL || "/api/";
const RATINGS_ENDPOINT = `${API_URL}printers/ratings`;
const LOCAL_RATINGS_KEY = "printer-user-ratings";
const RATER_SLACK_KEY = "printer-rater-slack-id";

export default function PrintersPage() {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState({});
    const [userRatings, setUserRatings] = useState({});
    const [ratingBanner, setRatingBanner] = useState(null);
    const [error, setError] = useState(null);
    const [raterSlackId, setRaterSlackId] = useState("");
    const [modalState, setModalState] = useState({ open: false, printer: null, rating: 0 });
    const [modalSlackInput, setModalSlackInput] = useState("");
    const [modalMessageUrl, setModalMessageUrl] = useState("");
    const [modalMessage, setModalMessage] = useState(null);
    const [modalSubmitting, setModalSubmitting] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const storedRatings = window.localStorage.getItem(LOCAL_RATINGS_KEY);
            if (storedRatings) {
                setUserRatings(JSON.parse(storedRatings));
            }

            const storedSlackId = window.localStorage.getItem(RATER_SLACK_KEY);
            if (storedSlackId) {
                setRaterSlackId(storedSlackId);
            }
        } catch (storageError) {
            console.warn("Unable to load stored ratings", storageError);
        }
    }, []);

    useEffect(() => {
        async function fetchPrinters() {
            try {
                setLoading(true);
                const response = await fetch(API_URL + "printers");
                if (!response.ok) {
                    throw new Error(`Failed to fetch printers: ${response.status}`);
                }
                const data = await response.json();
                setPrinters(data);

                try {
                    const ratingsResponse = await fetch(RATINGS_ENDPOINT);
                    if (ratingsResponse.ok) {
                        const ratingsData = await ratingsResponse.json();
                        setRatings(ratingsData);
                    } else {
                        console.warn("Unable to fetch ratings", ratingsResponse.statusText);
                    }
                } catch (ratingsError) {
                    console.warn("Ratings fetch failed", ratingsError);
                }
            } catch (fetchError) {
                console.error("Error fetching printers:", fetchError);
                setError("We had trouble loading the printers list. Please try again later.");
            } finally {
                setLoading(false);
            }
        }

        fetchPrinters();
    }, []);

    useEffect(() => {
        if (!ratingBanner) return;
        const timeout = setTimeout(() => setRatingBanner(null), 4000);
        return () => clearTimeout(timeout);
    }, [ratingBanner]);

    const persistUserRatings = (nextRatings) => {
        setUserRatings(nextRatings);
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(
                    LOCAL_RATINGS_KEY,
                    JSON.stringify(nextRatings)
                );
            } catch (storageError) {
                console.warn("Unable to store rating locally", storageError);
            }
        }
    };

    const persistRaterSlackId = (value) => {
        setRaterSlackId(value);
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(RATER_SLACK_KEY, value);
            } catch (storageError) {
                console.warn("Unable to persist slack id", storageError);
            }
        }
    };

    const submitRating = async (
        slackId,
        nickname,
        rating,
        slackIdentifier,
        messageUrl
    ) => {
        try {
            const response = await fetch(`${API_URL}printers/${slackId}/rate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rating,
                    rater_slack_id: slackIdentifier,
                    printing_legion_message_url: messageUrl,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message = payload.error || `Failed to save rating: ${response.status}`;
                throw new Error(message);
            }

            const data = await response.json();
            setRatings((prev) => ({
                ...prev,
                [slackId]: data.summary,
            }));

            const nextUserRatings = {
                ...userRatings,
                [slackId]: rating,
            };
            persistUserRatings(nextUserRatings);
            setRatingBanner({
                type: "success",
                text: `Thanks for rating ${nickname}!`,
            });
        } catch (ratingError) {
            console.error("Error saving rating:", ratingError);
            setRatingBanner({
                type: "error",
                text: ratingError.message || "Couldn't save your rating. Please try again.",
            });
            throw ratingError;
        }
    };

    const openRatingModal = (printer, rating) => {
        setModalState({ open: true, printer, rating });
        setModalMessage(null);
        setModalSlackInput(raterSlackId || "");
        setModalMessageUrl("");
    };

    const closeRatingModal = () => {
        setModalState({ open: false, printer: null, rating: 0 });
        setModalMessage(null);
        setModalSubmitting(false);
        setModalMessageUrl("");
    };

    const handleModalSubmit = async () => {
        if (!modalState.printer) return;
        const trimmedSlack = modalSlackInput.trim();
        if (!trimmedSlack) {
            setModalMessage({ type: "error", text: "Please enter your Slack ID." });
            return;
        }

        const trimmedUrl = modalMessageUrl.trim();
        if (!trimmedUrl) {
            setModalMessage({
                type: "error",
                text: "Drop the #printing-legion message link for this rating.",
            });
            return;
        }
        if (!trimmedUrl.startsWith("http")) {
            setModalMessage({
                type: "error",
                text: "Message link must start with http or https.",
            });
            return;
        }

        setModalSubmitting(true);
        try {
            await submitRating(
                modalState.printer.slack_id,
                modalState.printer.nickname,
                modalState.rating,
                trimmedSlack,
                trimmedUrl
            );
            persistRaterSlackId(trimmedSlack);
            closeRatingModal();
        } catch (err) {
            setModalMessage({ type: "error", text: err.message });
        } finally {
            setModalSubmitting(false);
        }
    };

    if (loading)
        return (
            <div className="text-center text-2xl py-8">
                fetching hack clubbers!!! sit tight
            </div>
        );
    if (error)
        return (
            <div className="text-center text-red-600 text-xl py-8 px-4">
                {error}
            </div>
        );
    if (!printers.length)
        return <div className="text-center py-8">No printers found</div>;

    // Group printers by country
    const printersByCountry = printers.reduce((acc, printer) => {
        const country = printer.country || "Unknown Country";
        if (!acc[country]) acc[country] = [];
        acc[country].push(printer);
        return acc;
    }, {});

    return (
        <>
        <div className="container mx-auto px-4 py-8 w-full">
            <div className="my-6">
                <a
                    href="/"
                    className="outline-1 py-2 px-6 rounded-2xl text-xl font-bold"
                >
                    back
                </a>
            </div>
            {ratingBanner && (
                <div
                    className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                        ratingBanner.type === "success"
                            ? "bg-green-50 text-green-800"
                            : "bg-yellow-50 text-yellow-800"
                    }`}
                >
                    {ratingBanner.text}
                </div>
            )}
            <h1 className="text-2xl mb-6">The printers!!</h1>
            <div className="text-xl space-y-4 mb-6">
                <p>
                    These are the Hack Clubbers of printing legion! If you have
                    any questions, please ask in #printing-legion on slack!
                </p>
                <p className="text-xl mb-4 font-bold">
                    Check out how it works here:{" "}
                    <a
                        href="https://docs.google.com/document/d/1ZfHi5eKbt0F2vbO0I1bMSIaMovqBu4Z6j_3GU6wREVc/edit?usp=sharing"
                        target="_blank"
                        className="text-blue-600 hover:underline"
                    >
                        Google doc
                    </a>
                </p>
                <p className="text-lg italic">
                    If there's a private dispute, never hestiate to reach out to
                    @alexren on slack!
                </p>
            </div>
            <p className="mb-6 italic text-gray-600">
                There are currently{" "}
                <span className="font-semibold">{printers.length}</span>{" "}
                printers listed across{" "}
                <span className="font-semibold">
                    {Object.keys(printersByCountry).length}
                </span>{" "}
                countries.
            </p>
            {Object.entries(printersByCountry).map(
                ([country, countryPrinters]) => (
                    <div key={country} className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4">
                            {country}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {countryPrinters.map((printer) => (
                                <PrinterCard
                                    key={printer.slack_id}
                                    printer={printer}
                                    ratingSummary={{
                                        ...(ratings[printer.slack_id] || {}),
                                        userRating:
                                            userRatings[printer.slack_id] || 0,
                                    }}
                                    onSelectRating={(selectedPrinter, rating) =>
                                        openRatingModal(selectedPrinter, rating)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )
            )}
        </div>
        {modalState.open && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                    <h2 className="text-2xl font-semibold mb-2 text-center">
                        Rate {modalState.printer?.nickname}
                    </h2>
                    <p className="text-center text-gray-600 mb-4">
                        Slack IDs help us keep ratings fair. You can rate each printer once every 24 hours.
                    </p>
                    <label className="block text-sm font-semibold mb-2" htmlFor="modal-slack-id">
                        Your Slack ID
                    </label>
                    <input
                        id="modal-slack-id"
                        type="text"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="U01234567"
                        value={modalSlackInput}
                        onChange={(event) => setModalSlackInput(event.target.value)}
                        disabled={modalSubmitting}
                    />
                    <label className="block text-sm font-semibold mt-5 mb-2" htmlFor="modal-message-url">
                        #printing-legion message link
                    </label>
                    <input
                        id="modal-message-url"
                        type="url"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="https://hackclub.slack.com/archives/..."
                        value={modalMessageUrl}
                        onChange={(event) => setModalMessageUrl(event.target.value)}
                        disabled={modalSubmitting}
                    />
                    {modalMessage && (
                        <div
                            className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                                modalMessage.type === "error"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-green-50 text-green-700"
                            }`}
                        >
                            {modalMessage.text}
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <button
                            className="flex-1 py-2 rounded-xl border border-gray-300"
                            onClick={closeRatingModal}
                            disabled={modalSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60"
                            onClick={handleModalSubmit}
                            disabled={modalSubmitting}
                        >
                            {modalSubmitting ? "Sending..." : `Rate ${modalState.rating}★`}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
