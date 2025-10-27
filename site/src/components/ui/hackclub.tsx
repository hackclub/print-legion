import { Link } from "react-router-dom"

export default function Hackclub() {
    return (
        <Link to="https://hackclub.com" className="absolute duration-400 hover:rotate-[5deg] top-0 left-0 text-xl font-semibold ml-auto">
            <img src="/hc.png" alt="Hackclub" className="w-32" />
        </Link>
    )
}
