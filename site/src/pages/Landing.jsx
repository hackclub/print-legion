import Instuctions from "../components/Instructions";



export default function Landing() {
    return (
        <div className="container mx-auto px-4 py-8 w-full">
            <h1 className="text-3xl mb-6 font-bold text-center">PRINTING LEGION</h1>
            <p className="text-2xl mb-4 my-6 justify-center flex">
                Welcome to the printing legion! This is the international network of 3D printers from Hack Club!
            </p>

            <Instuctions />
            <div className="my-6 justify-center flex">
                <a href="/printers" className="outline-1 py-2 px-6 rounded-xl text-lg font-bold bg-blue-500 text-white">Check out the printers!!!</a>
            </div>
        </div>
    );
    }