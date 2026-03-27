import React from 'react';
import { getHouses } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Thermometer, Droplets, Wind, Home } from 'lucide-react';
import { HouseActionsHeader, HouseCardActions } from './HouseActions';

export default async function ClimatePage() {
  const houses = await getHouses();

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Climate Control</h2>
          <p className="text-gray-500 mt-1">Monitor and manage environmental conditions in your houses.</p>
        </div>
        <HouseActionsHeader />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((house: any) => (
          <Card key={house.id} className="rounded-2xl border-none shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-green-900/5 transition-all group">
            <CardHeader className="bg-gray-50/50 rounded-t-2xl border-b border-gray-100">
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Home className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="text-gray-900 font-bold">{house.name}</span>
                </div>
                <HouseCardActions house={house} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50 rounded-2xl flex flex-col items-center border border-amber-100 shadow-sm shadow-amber-900/5">
                  <Thermometer className="w-6 h-6 text-amber-600 mb-2" />
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Temperature</span>
                  <span className="text-2xl font-black text-gray-900">{Number(house.currentTemperature || 0).toFixed(1)}°C</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl flex flex-col items-center border border-blue-100 shadow-sm shadow-blue-900/5">
                  <Droplets className="w-6 h-6 text-blue-600 mb-2" />
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Humidity</span>
                  <span className="text-2xl font-black text-gray-900">{Number(house.currentHumidity || 1).toFixed(1)}%</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Capacity</span>
                  <span className="font-bold text-gray-900">{(house.capacity || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">birds</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Ventilation</span>
                  <span className="font-bold text-green-600 flex items-center gap-1"><Wind className="w-3 h-3" /> Optimal</span>
                </div>
              </div>

              <button className="w-full mt-6 bg-green-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-800 transition-all active:scale-[0.98] shadow-lg shadow-green-900/10">
                View Advanced Sensors
              </button>
            </CardContent>
          </Card>
        ))}
        {houses.length === 0 && (
          <div className="col-span-full py-32 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No houses configured yet. Add your first poultry house to start monitoring.</p>
          </div>
        )}
      </div>
    </div>
  );
}
