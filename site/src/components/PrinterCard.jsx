export default function PrinterCard({ printer }) {
    const { slack_id, nickname, profile_pic, website, bio, country } = printer;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Profile Image */}
            <div className="p-4 flex justify-center">
                <img
                    src={profile_pic}
                    alt={nickname}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
                    onError={(e) => {
                        e.target.src = "/default-avatar.png";
                    }}
                />
                {/* Content */}
                <div className="px-4 pb-4 text-center">
                    {/* <p> Slack ID: {slack_id}</p> */}
                    {/* <p> Country: {country}</p> */}
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {nickname}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        {bio}
                    </p>
                    <div className="flex space-x-2 mb-4">
                        <div className="bg-green-200 text-green-800 outline-2 rounded-xl px-3 py-1 outline-green-800">
                            <a
                                href={`slack://user?team=T0266FRGM&id=${slack_id}`}
                            >
                                Message on Slack!
                            </a>
                        </div>

                        {website && (
                            <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                            >
                                website!!
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
