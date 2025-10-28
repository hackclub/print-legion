import { Button } from "@/components/ui/button.js";
import { SlackIcon } from "lucide-react";
import {Link2} from 'lucide-react';

export default function PrinterCard({ printer }) {
    const { slack_id, nickname, profile_pic, website, bio, country } = printer;

    return (
        <div className="dark:bg-neutral-900 border border-neutral-700 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Profile Image */}
            <div className="p-4 flex justify-center">
                <img
                    src={profile_pic}
                    alt={nickname}
                    className="w-24 h-24 rounded-full object-cover border-2 border-neutral-400"
                    onError={(e) => {
                        e.target.src = "/default-avatar.png";
                    }}
                />
                {/* Content */}
                <div className="px-4 pb-4 text-center">
                    {/* <p> Slack ID: {slack_id}</p> */}
                    {/* <p> Country: {country}</p> */}
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                        {nickname}
                    </h3>
                    <p className="text-sm text-neutral-400 mb-3">
                        {bio}
                    </p>
                    <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <Button variant={"slack"}>
                    <SlackIcon/>
                            <a
                                href={`https://slack.com/app_redirect?channel=${slack_id}`}
                            >
                                Message on Slack!
                            </a>
                    </Button>

                        {website && (

                    <Button variant={"website"} className="bg-green-400">
                    <Link2/>
                            <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                website!
                            </a>
                    </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
