import { useState, useEffect } from 'react';
import PrinterCard from '../components/PrinterCard'; // Adjust import path
import { Link } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


export default function PrintersPage() {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [countryFilter, setCountryFilter] = useState("All");

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

            <h1 className="text-2xl mb-6 font-[silkscreen] underline ">The Printers</h1>
            <p> Want to know more? <Link to="/#details" className='text-[#ec3750] underline'>Check details here</Link></p>
            <div className="text-xl space-y-4 mb-6">
                <p className="text-lg italic">
                    If there's a private dispute, never hestiate to reach out to @alexren on slack!
                </p>

            </div>
            <p className="mb-6 italic text-gray-600">
                There are currently <span className="font-semibold">{printers.length}</span> printers listed across <span className="font-semibold">{Object.keys(printersByCountry).length}</span> countries.
            </p>

            <div className='my-4 flex gap-4 items-center'>
                <p>Filter by country: </p>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={"All"} >All</SelectItem>
                        {
                            Object.keys(printersByCountry).map((country, id) => (
                                <SelectItem value={country} key={id}>{country}</SelectItem>
                            ))
                            
                        }
                    </SelectContent>
                </Select>
            </div>
            {Object.entries(printersByCountry).map(([country, countryPrinters]) => (
                (countryFilter=="All"?true:countryFilter==country) ?
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
                </div>: null
            ))}
        </div>
    );
}
