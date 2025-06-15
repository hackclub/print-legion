import { useState, useEffect } from 'react';
import PrinterCard from '../components/PrinterCard'; // Adjust import path

export default function PrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/printers') // Your Express endpoint
      .then(res => res.json())
      .then(data => {
        setPrinters(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching printers:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center text-2xl py-8">fetching hack clubbers!!! sit tight</div>;
  if (!printers.length) return <div className="text-center py-8">No printers found</div>;

  // Group printers by country
  const printersByCountry = printers.reduce((acc, printer) => {
    const country = printer.country || 'Unknown Country';
    if (!acc[country]) acc[country] = [];
    acc[country].push(printer);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 w-full">
    <div className="my-6">
        <a href="/" className="outline-1 py-2 px-6 rounded-2xl text-xl font-bold">back</a>
    </div>
      <h1 className="text-2xl mb-6">The printers!!</h1>
      <div className="text-xl space-y-4 mb-6">
        <p>
            These are the Hack Clubbers of printing legion! If you have any questions, please ask in #printing-legion on slack!
        </p>
        <p className="text-xl mb-4 font-bold">
            Check out how it works here: <a href="https://docs.google.com/document/d/1ZfHi5eKbt0F2vbO0I1bMSIaMovqBu4Z6j_3GU6wREVc/edit?usp=sharing" target="_blank" className="text-blue-600 hover:underline">Google doc</a>
        </p>
        <p className="text-lg italic">
            If there's a private dispute, never hestiate to reach out to @alexren on slack!
        </p>

      </div>
      <p className="mb-6 italic text-gray-600">
        There are currently <span className="font-semibold">{printers.length}</span> printers listed across <span className="font-semibold">{Object.keys(printersByCountry).length}</span> countries.
      </p>
      {Object.entries(printersByCountry).map(([country, countryPrinters]) => (
        <div key={country} className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{country}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countryPrinters.map(printer => (
              <PrinterCard
                key={printer.slack_id}
                printer={printer}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}