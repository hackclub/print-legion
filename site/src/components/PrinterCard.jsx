import SlackIcon from "./SlackIcon.jsx";

export default function PrinterCard({ printer }) {
  const {
    slack_id,
    nickname,
    profile_pic,
    website,
    bio,
    country,
    total_prints,
    total_grams,
  } = printer;

  const formatWeight = (grams) => {
    if (grams == null) return "0 g";
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
    return `${Math.round(grams)} g`;
  };

  return (
    <div className="bg-light-bg rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="p-4 flex items-start gap-4">
        {/* Left column: fixed width (PFP + stats) */}
        <div className="w-32 shrink-0 flex flex-col items-center text-center gap-2">
          <img
            src={profile_pic}
            alt={nickname}
            className="w-24 h-24 rounded-full object-cover border-2 border-light-ui"
            onError={(e) => {
              e.target.src = "/default-avatar.png";
            }}
          />

          <div className="w-full flex flex-col gap-2">
            <div className="rounded-md bg-light-bg-2 px-2 py-1 text-sm text-light-tx">
              <p className="leading-tight">
                <span className="font-semibold">{total_prints ?? 0}</span>{" "}
                prints
              </p>
            </div>
            <div className="rounded-md bg-light-bg-2 px-2 py-1 text-sm text-light-tx">
              <p className="leading-tight">
                <span className="font-semibold">
                  {formatWeight(total_grams)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right column: grows with bio */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div>
            <h3 className="text-lg font-semibold text-light-tx">{nickname}</h3>
            {country && (
              <p className="text-xs text-light-tx-2 leading-tight">{country}</p>
            )}
          </div>

          {bio && (
            <p className="text-sm text-light-tx leading-relaxed">{bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://slack.com/app_redirect?channel=${slack_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-light-gr px-3 py-1 text-green-100"
            >
              <SlackIcon className="w-5 h-5 block" />
              <span className="text-sm font-medium">Slack!</span>
            </a>

            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-light-bg-2 px-3 py-1 text-sm font-medium text-light-tx"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
