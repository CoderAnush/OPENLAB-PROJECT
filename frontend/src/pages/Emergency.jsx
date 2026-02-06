import React from 'react';
import { Phone, Flame, AlertOctagon, Copy, ShieldAlert } from 'lucide-react';

const ContactCard = ({ title, number, icon: Icon, color }) => {
    const copyToClipboard = () => {
        navigator.clipboard.writeText(number);
        alert(`Copied ${number} to clipboard`);
    };

    return (
        <div className={`p-6 rounded-xl border flex items-center justify-between bg-white dark:bg-dark-card border-l-4 ${color}`}>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full">
                    <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
                    <p className="text-lg font-mono text-slate-600 dark:text-slate-400">{number}</p>
                </div>
            </div>
            <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-colors"
            >
                <Copy className="w-5 h-5" />
            </button>
        </div>
    );
};

const Emergency = () => {
    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="bg-red-500 text-white p-8 rounded-2xl shadow-lg flex items-center gap-6">
                <ShieldAlert className="w-16 h-16" />
                <div>
                    <h1 className="text-3xl font-bold">Emergency Action Guide</h1>
                    <p className="text-red-100 mt-2 text-lg">
                        Follow these protocols immediately in case of detected hazards.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Fire Protocol */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <Flame className="w-6 h-6 text-orange-500" />
                        <h3 className="text-xl font-bold dark:text-white">Fire / Explosion</h3>
                    </div>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-300 list-disc pl-5">
                        <li>Trigger the manual fire alarm immediately.</li>
                        <li>Evacuate via the nearest safe exit (South Gate).</li>
                        <li>Do not use elevators.</li>
                        <li>If smoke is present, stay low to the floor.</li>
                        <li>Assemble at Point B (Parking Lot).</li>
                    </ul>
                </div>

                {/* Gas Leak Protocol */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertOctagon className="w-6 h-6 text-yellow-500" />
                        <h3 className="text-xl font-bold dark:text-white">Gas Leak (MQ-2/135)</h3>
                    </div>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-300 list-disc pl-5">
                        <li>Shut off the main gas valve if safe to do so.</li>
                        <li>Open all windows and doors for ventilation.</li>
                        <li>Do not switch on/off any electrical appliances.</li>
                        <li>Evacuate the area immediately.</li>
                        <li>Contact maintenance and fire department.</li>
                    </ul>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold dark:text-white mb-4">Emergency Contacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ContactCard title="Ambulance" number="102" icon={Phone} color="border-red-500" />
                    <ContactCard title="Fire Department" number="101" icon={Flame} color="border-orange-500" />
                    <ContactCard title="Police" number="100" icon={ShieldAlert} color="border-blue-500" />
                    <ContactCard title="Plant Maintenance" number="+91 98765 43210" icon={AlertOctagon} color="border-yellow-500" />
                </div>
            </div>
        </div>
    );
};

export default Emergency;
