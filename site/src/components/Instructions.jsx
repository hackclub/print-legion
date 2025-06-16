export default function PrintingLegion101() {
  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-gray-800">
      {/* Page 1 */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-6">Overview:</h1>
        
        <p className="text-lg mb-6">Hello there!</p>
        
        <p className="mb-6">
          This is a document explaining how to use printing legion & how it works. This will be moved onto the website eventually… :pf.
        </p>
        
        <p className="mb-6">
          Maintained by @alexren on slack! If you have any questions please ask in #printing-legion!
        </p>
        
        <p className="mb-8">
          If you have any private questions/disputes, feel free to dm me.
        </p>
        
        <h2 className="text-2xl font-bold mb-4">For requesters</h2>
        
        <ol className="list-decimal pl-6 mb-8 space-y-2">
          <li>Post your request in #printing-legion! Include your country, the .STL files to print, and a picture of what you need</li>
          <li>Go to printlegion.hackclub.com and reach out to someone! Ask them to print your stuff</li>
          <li>Pay for the shipping label using your YSWS card grant. You do not get extra money for this!</li>
          <li>Repeat</li>
        </ol>
        
        <h2 className="text-2xl font-bold mb-4">For printers:</h2>
        
        <ol className="list-decimal pl-6 mb-8 space-y-2">
          <li>Sign up by filling out forms.hackclub.com/printing-legion</li>
          <li>Wait for someone to reach out! If you want a job sooner, feel free to grab any you see in #printing-legion</li>
          <li>Print their part! Once you do, ping them in #printing-legion with a picture of their print!</li>
          <li>Ship it - Ask for the requester's info and use their HCB card grant to pay for the label</li>
          <li>Once you've printed 750g of filament & shipped it all out, fill out forms.hackclub.com/filament-reimbursement</li>
          <li>Repeat!</li>
        </ol>
        
        <h3 className="text-xl font-bold mb-3">Notes:</h3>
        
        <p className="font-bold mb-2">Filament reimbursement:</p>
        <p className="mb-4">
          Printing legion is sponsored by Polymerker! They've provided us free filament for the following countries:
        </p>
        
        <ul className="list-disc pl-6 mb-4">
          <li>United States</li>
          <li>Canada</li>
          <li>Australia</li>
          <li>Poland</li>
          <li>France</li>
          <li>Germany</li>
          <li>South Africa</li>
        </ul>
      </div>
      
      {/* Page 2 */}
      <div>
        <p className="mb-4">
          Filament will be shipped directly from polymaker warehouses. These countries are confirmed to
          not need to pay any customs, so you shouldn't have issues!
        </p>
        
        <p>
          If you're not from one of these countries, we'll send you a $20-25 HCB Card grant to get
          filament instead
        </p>
      </div>
    </div>
  );
}