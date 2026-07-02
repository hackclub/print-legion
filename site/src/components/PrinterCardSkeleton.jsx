export default function PrinterCardSkeleton() {
    return (
        <div className="printer-card skeleton-card">
            <div className="skeleton-avatar" />

            <div className="skeleton-content">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line medium" />
            </div>
        </div>
    );
}