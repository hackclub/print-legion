import ReactMarkdown from 'react-markdown';

const markdownContent = `
### **For requesters**

1. Post your request in \#printing-legion\! Include your country, the .STL files to print, and a picture of what you need  
2. Go to [printlegion.hackclub.com](http://printlegion.hackclub.com) and reach out to someone\! Ask them to print your stuff  
3. Pay for the shipping label using your YSWS card grant. You do not get extra money for this\!  
4. Repeat

### **For printers:**

1. Sign up by filling out [forms.hackclub.com/printing-legion](http://forms.hackclub.com/printing-legion)  
2. Wait for someone to reach out\! If you want a job sooner, feel free to grab any you see in \#printing-legion  
3. Print their part\! Once you do, ping them in \#printing-legion with a picture of their print\!  
4. Ship it \- Ask for the requester’s info and use their HCB card grant to pay for the label  
5. Fill out [https://forms.hackclub.com/sent-print](https://forms.hackclub.com/sent-print)  
6. Once you’ve printed 750g of filament & shipped it all out, you’ll get an email asking for your info\!  
7. Repeat\!

### Notes:

**Filament reimbursement:**  
Printing legion is sponsored by Polymaker\! They’ve provided us free filament for the following countries:

- United States  
- Canada  
- Australia  
- Poland  
- France  
- Germany  
- South Africa

Filament will be shipped directly from Polymaker warehouses. These countries are confirmed to not need to pay any customs, so you shouldn’t have issues\!

If you’re not from one of these countries, we’ll send you a $20-25 HCB Card grant to get filament instead!
`;

export default function Landing() {
    return (
        <div className="container mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl mb-6 font-bold text-center">Printing Legion</h1>
        <p className="text-xl mb-4">
            Welcome to the printing legion! This is the international network of 3D printers from Hack Club!
        </p>
        
        {}
        <div className="mb-6 rounded-lg">
            <ReactMarkdown
                components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 mt-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 mt-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2 mt-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-base mb-3" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="text-base" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                }}
            >
                {markdownContent}
            </ReactMarkdown>
        </div>

        <div className="my-6 justify-center flex">
            <a href="/printers" className="outline-1 py-2 px-6 rounded-xl text-lg font-bold bg-blue-500 text-white">Check out the printers!</a>
        </div>
        </div>
    );
    }