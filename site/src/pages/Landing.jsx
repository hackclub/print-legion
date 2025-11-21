import LandingContent from '../markdown/LandingContent.mdx';

export default function Landing() {
    return (
        <div className="container mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl mb-6 font-bold text-center">Printing Legion</h1>
        <p className="text-xl mb-4">
            Welcome to the printing legion! This is the international network of 3D printers from Hack Club!
        </p>
        
        {/* Instructions */}
        <div className="mb-6 rounded-lg">
            <LandingContent
                components={{
                    h1: (props) => <h1 className="text-3xl font-bold mb-4 mt-2" {...props} />,
                    h2: (props) => <h2 className="text-2xl font-bold mb-3 mt-2" {...props} />,
                    h3: (props) => <h3 className="text-xl font-bold mb-2 mt-2" {...props} />,
                    p: (props) => <p className="text-base mb-3" {...props} />,
                    ul: (props) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                    ol: (props) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                    li: (props) => <li className="text-base" {...props} />,
                    strong: (props) => <strong className="font-bold" {...props} />,
                    em: (props) => <em className="italic" {...props} />,
                    a: (props) => <a className="text-blue-600 hover:underline" {...props} />,
                }}
            />
        </div>

        <div className="my-6 justify-center flex">
            <a href="/printers" className="outline-1 py-2 px-6 rounded-xl text-lg font-bold bg-blue-500 text-white">Check out the printers!</a>
        </div>
        </div>
    );
}
