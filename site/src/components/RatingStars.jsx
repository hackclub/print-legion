import { useState } from "react";

const TOTAL_STARS = 5;

export default function RatingStars({ currentValue = 0, onSelect }) {
    const [hoverValue, setHoverValue] = useState(0);
    const displayValue = hoverValue || currentValue;

    return (
        <div className="flex gap-1 justify-center">
            {Array.from({ length: TOTAL_STARS }).map((_, index) => {
                const starValue = index + 1;
                const isActive = displayValue >= starValue;
                return (
                    <button
                        key={starValue}
                        type="button"
                        aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                        className={`text-2xl transition-colors ${
                            isActive ? "text-yellow-400" : "text-gray-300"
                        }`}
                        onMouseEnter={() => setHoverValue(starValue)}
                        onMouseLeave={() => setHoverValue(0)}
                        onFocus={() => setHoverValue(starValue)}
                        onBlur={() => setHoverValue(0)}
                        onClick={() => onSelect?.(starValue)}
                    >
                        <span>&#9733;</span>
                    </button>
                );
            })}
        </div>
    );
}
