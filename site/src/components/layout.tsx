import Navbar from "./ui/navbar.js";
import Footer from "./ui/footer.js";
import { Outlet } from "react-router-dom";


export default function Layout(){
    return (
        <>
    <Navbar/>
    <main className="min-h-screen">
    <Outlet/>
    </main>
    <Footer/>
        </>
    )

}
