import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import Hackclub from "./hackclub.js"

export default function Navbar() {

    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()

    const navLinks = [
        { path: "/", label: "Home" },
        { path: "/printers", label: "Printers" },
        { path: "/#details", label: "Details" },
        { path: "/#faq", label: "FAQ" },
    ]

    return (
        <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <div className="mx-auto flex items-center justify-center p-4">

                <div className="ml-auto">  {/* this div only exists to keep that those links in the middle, don't remove pls'*/}
                    <Hackclub />
                </div>

                <div className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm transition-colors hover:text-primary ${location.pathname === link.path ? "text-primary font-medium" : ""
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="md:hidden flex items-center gap-2">
                    <ModeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                </div>


                <div className="ml-auto">
                    <ModeToggle />
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden border-t bg-background/95 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 py-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm transition-colors hover:text-primary ${location.pathname === link.path ? "text-primary font-medium" : ""
                                    }`}
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}
