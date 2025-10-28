import { Button } from "./button.js";
import { ArrowUpIcon, Heart } from "lucide-react";

export default function Footer() {
    return (
        <footer className="pt-8 border-t border-b-0 bg-background/80 backdrop-blur-md mt-10">
            <div className="flex items-center justify-center gap-8">
                <Button variant={"link"} >
                <a href="#" className="flex gap-2">
                    <ArrowUpIcon />
                    Back to Top
                    </a>
                </Button>

                <div className="text-sm flex flex-col items-center justify-center gap-2">
                    <p>Made with ❤️ by</p>
                    <p>Hackclubbers :3</p>
                </div>

                <Button variant={"link"} >
                <a href="https://github.com/hackclub/print-legion" className="flex gap-2">
                <Heart/>
                    Contribute
                    </a>
                </Button>
            </div>

            <div className="text-muted-foreground text-xs text-center py-4">
                © {new Date().getFullYear()} Hack Club. 501(c)(3) nonprofit (EIN: 81-2908499)
            </div>
        </footer>
    )
}
