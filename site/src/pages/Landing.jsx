export default function Landing() {
    return (
        <div className="container mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl mb-6 font-bold text-center">PRINTING LEGION</h1>
        <p className="text-xl mb-4">
            Welcome to the printing legion! This is the international network of 3D printers from Hack Club!
        </p>
        <p className="text-xl mb-4 font-bold">
            Check out how it works here: <a href="https://docs.google.com/document/d/1ZfHi5eKbt0F2vbO0I1bMSIaMovqBu4Z6j_3GU6wREVc/edit?usp=sharing" target="_blank" className="text-blue-600 hover:underline">Google doc</a>
        </p>
        <p className="italic text-gray-600 mb-6">
            The previous instructions will be added to the site soon, but as a placeholder please click on the link above
        </p>
        <div className="my-6 justify-center flex">
            <a href="/printers" className="outline-1 py-2 px-6 rounded-xl text-lg font-bold bg-blue-500 text-white">Check out the printers!!!</a>
        </div>
        </div>
    );
    }