'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { 
  TrendingUp, 
  Skull, 
  Activity, 
  Calendar, 
  Weight, 
  ChevronRight, 
  Clock, 
  History,
  Info,
  ArrowRight,
  Syringe,
  Plus,
  CheckCircle2,
  Circle,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logWeight } from '@/lib/actions/dashboard-actions';
import { createVaccinationSchedule } from '@/lib/actions/preference-actions';
import { cn } from '@/lib/utils';
import { WorkerStamp } from '@/components/ui/WorkerStamp';

interface FlockDetailClientProps {
  batch: any;
}

export const FlockDetailClient = ({ batch }: FlockDetailClientProps) => {
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);
  const [weight, setWeight] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGhost, setShowGhost] = useState(true);

  // Vaccination schedule state
  const [vaccinations, setVaccinations] = useState<any[]>(batch.vaccinations || []);
  const [showVaccForm, setShowVaccForm] = useState(false);
  const [vaccName, setVaccName] = useState('');
  const [vaccDate, setVaccDate] = useState('');
  const [vaccNotes, setVaccNotes] = useState('');
  const [isSavingVacc, setIsSavingVacc] = useState(false);

  // Calculations
  const arrivalDate = new Date(batch.arrivalDate);
  const today = new Date();
  const ageInDays = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const totalMortality = batch.mortalityRecords.reduce((sum: number, rec: any) => sum + rec.count, 0);
  const mortalityRate = (totalMortality / batch.initialCount) * 100;
  
  const totalFeed = batch.feedingLogs.reduce((sum: number, log: any) => sum + Number(log.amountConsumed), 0);
  
  const latestWeight = batch.weightRecords[0]?.averageWeight || 0;
  const fcr = latestWeight > 0 ? (totalFeed / (batch.currentCount * latestWeight)) : 0;

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    try {
      await logWeight({
        batchId: batch.id,
        averageWeight: Number(weight),
        logDate
      });
      setIsLoggingWeight(false);
      setWeight('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccName || !vaccDate) return;
    setIsSavingVacc(true);
    try {
      const result = await createVaccinationSchedule({
        livestockId: batch.id,
        vaccineName: vaccName,
        scheduledDate: new Date(vaccDate),
        notes: vaccNotes || undefined,
      });
      setVaccinations(prev => [...prev, result]);
      setShowVaccForm(false);
      setVaccName('');
      setVaccDate('');
      setVaccNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingVacc(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          title="Current Age" 
          value={`${ageInDays} Days`} 
          icon={Calendar} 
          color="emerald" 
          subtext={`Arrived ${arrivalDate.toLocaleDateString()}`}
        />
        <MetricCard 
          title="Feed Conversion (FCR)" 
          value={fcr > 0 ? fcr.toFixed(2) : '---'} 
          icon={Activity} 
          color="amber" 
          subtext={`${totalFeed.toLocaleString()} bags Consumed`}
        />
        <MetricCard 
          title="Mortality Rate" 
          value={`${mortalityRate.toFixed(1)}%`} 
          icon={Skull} 
          color="red" 
          subtext={`${totalMortality} Total Deaths`}
        />
        <MetricCard 
          title="Current Stock" 
          value={batch.currentCount.toLocaleString()} 
          icon={TrendingUp} 
          color="blue" 
          subtext={batch.isolationCount > 0 ? `${batch.isolationCount} in isolation` : `from ${batch.initialCount} initial`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Performance & Weight Tracking */}
        <div className="lg:col-span-2 space-y-7">
          <Card className="rounded-lg bg-white/10 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
             <CardHeader className="bg-white/10 border-b border-white/10 px-7 py-5 flex justify-between items-center">
                <CardTitle className="text-white italic font-bold flex items-center gap-2">
                   <Weight className="w-5 h-5 text-emerald-400" /> Growth & Weight History
                </CardTitle>
                 <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" onClick={() => setShowGhost(!showGhost)} className={cn("text-[10px] font-black uppercase tracking-widest px-3 h-8 rounded-full border border-white/10", showGhost ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/5")}>
                      {showGhost ? 'Hide Ghost Curve' : 'Show Benchmark'}
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => setIsLoggingWeight(!isLoggingWeight)} className="h-8">
                      {isLoggingWeight ? 'Cancel' : 'Log New Weight'}
                   </Button>
                 </div>
             </CardHeader>
             <CardContent className="p-7">
                <AnimatePresence>
                   {isLoggingWeight && (
                     <motion.form 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       onSubmit={handleLogWeight}
                       className="mb-7 p-5 bg-emerald-500/10 rounded-lg border border-emerald-500/10 space-y-3"
                     >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <Input 
                             label="Average Weight (kg)" 
                             type="number" 
                             step="0.001" 
                             value={weight} 
                             onChange={(e) => setWeight(e.target.value)} 
                             required
                           />
                           <Input 
                             label="Log Date" 
                             type="date" 
                             value={logDate} 
                             onChange={(e) => setLogDate(e.target.value)} 
                             required
                           />
                        </div>
                        <Button type="submit" className="w-full py-3">Save Weight Record</Button>
                     </motion.form>
                   )}
                </AnimatePresence>

                {batch.weightRecords.length > 0 ? (
                  <div className="space-y-5">
                     <div className="h-64 flex items-end gap-2 px-3 border-b border-white/5 pb-2 relative">
                        {showGhost && (
                          <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-20">
                             <svg className="w-full h-full overflow-visible">
                                <path 
                                  d="M 0 256 Q 300 200 600 0" 
                                  fill="none" 
                                  stroke="white" 
                                  strokeWidth="2" 
                                  strokeDasharray="8 8"
                                  className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                                />
                             </svg>
                          </div>
                        )}
                        {batch.weightRecords.slice(0, 7).reverse().map((rec: any, idx: number) => {
                           const maxWeight = Math.max(...batch.weightRecords.map((r: any) => r.averageWeight));
                           const height = (rec.averageWeight / (maxWeight * 1.1)) * 100;
                           return (
                             <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${height}%` }}
                                  className="w-full bg-gradient-to-t from-emerald-600/50 to-emerald-400 rounded-t-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 duration-300"
                                />
                                <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-xs text-white whitespace-nowrap z-20 border border-white/10 font-bold">
                                   {rec.averageWeight} kg
                                </span>
                                <span className="text-[9px] text-white/70 font-bold mt-2 uppercase tracking-tighter">
                                   {new Date(rec.logDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                             </div>
                           )
                        })}
                     </div>
                     <div className="flex justify-between items-center bg-white/10 p-4 rounded-lg border border-white/5 italic">
                        <div className="flex items-center gap-3">
                           <Info className="w-4 h-4 text-emerald-400" />
                           <span className="text-white/80 text-xs font-bold leading-relaxed">
                              Current growth is <span className="text-emerald-400">Stable</span>. Estimated maturity reached in about <span className="text-emerald-400">14 days</span>.
                           </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                     </div>
                  </div>
                ) : (
                  <div className="py-16 text-center bg-white/10 rounded-lg border-2 border-dashed border-white/5">
                     <Weight className="w-12 h-12 text-white/10 mx-auto mb-3" />
                     <p className="text-white/70 font-bold uppercase tracking-widest text-xs italic">No weight records found yet.</p>
                  </div>
                )}
             </CardContent>
          </Card>

          {/* Activity Logs */}
          <Card className="rounded-lg bg-white/10 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/10 border-b border-white/10 px-7 py-5">
                <CardTitle className="text-white italic font-bold flex items-center gap-2">
                   <Clock className="w-5 h-5 text-blue-400" /> Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-7">
                 <div className="relative space-y-0 translate-x-3">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20" />
                    
                    {[
                      ...batch.feedingLogs.map((l: any) => ({ ...l, type: 'FEED' })),
                      ...batch.mortalityRecords.map((m: any) => ({ ...m, type: 'MORTALITY' })),
                      ...batch.eggProduction.map((e: any) => ({ ...e, type: 'EGGS' })),
                      ...batch.weightRecords.map((w: any) => ({ ...w, type: 'WEIGHT' }))
                    ]
                    .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
                    .slice(0, 15)
                    .map((item, idx) => (
                      <div key={idx} className="relative pb-7 pl-9 group">
                         <div className="absolute left-0 top-0 w-2.5 h-2.5 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-transform" />
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                             <div className="flex-1">
                                <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mb-1 italic">
                                   {new Date(item.logDate).toLocaleString()}
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                   <div className="flex items-center gap-2">
                                      <span className={cn(
                                         "text-xs font-bold px-2 py-0.5 rounded-lg border",
                                         item.type === 'FEED' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                         item.type === 'MORTALITY' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                         item.type === 'EGGS' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                         "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      )}>
                                         {item.type}
                                      </span>
                                      <span className="text-white font-bold tracking-normal text-sm">
                                         {item.type === 'FEED' && `Logged ${item.amountConsumed} bags consumption`}
                                         {item.type === 'MORTALITY' && (
                                           <div className="flex flex-col inline-block align-middle">
                                              <span>Recorded {item.count} deaths</span>
                                              <span className="text-xs text-white/70">{item.category} › {item.subCategory}</span>
                                           </div>
                                         )}
                                         {item.type === 'EGGS' && `Collected ${item.eggsCollected} eggs`}
                                         {item.type === 'WEIGHT' && `Average weight: ${item.averageWeight}kg`}
                                      </span>
                                   </div>
                                   <WorkerStamp user={item.user} />
                                </div>
                             </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-7">
           {/* Vaccination Schedule */}
           <Card className="rounded-lg bg-emerald-500/10 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/10 border-b border-white/10 px-5 py-4 flex justify-between items-center">
                <CardTitle className="text-white italic font-bold flex items-center gap-2 text-base">
                  <Syringe className="w-4 h-4 text-amber-400" /> Vaccination Schedule
                </CardTitle>
                <button
                  onClick={() => setShowVaccForm(!showVaccForm)}
                  className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <AnimatePresence>
                  {showVaccForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddVaccination}
                      className="space-y-2 p-3 bg-amber-500/5 rounded-md border border-amber-500/15 mb-2"
                    >
                      <Input
                        label="Vaccine Name"
                        placeholder="e.g. Newcastle IBD"
                        value={vaccName}
                        onChange={e => setVaccName(e.target.value)}
                        required
                      />
                      <Input
                        label="Scheduled Date"
                        type="date"
                        value={vaccDate}
                        onChange={e => setVaccDate(e.target.value)}
                        required
                      />
                      <Input
                        label="Notes (optional)"
                        placeholder="Dosage, route..."
                        value={vaccNotes}
                        onChange={e => setVaccNotes(e.target.value)}
                      />
                      <Button type="submit" isLoading={isSavingVacc} className="w-full" size="sm">
                        Add Schedule
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {vaccinations.length === 0 ? (
                  <div className="text-center py-7 text-white/70 text-xs italic">
                    No vaccinations scheduled yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vaccinations
                      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                      .map((vacc: any, idx: number) => {
                        const isPast = new Date(vacc.scheduledDate) < today;
                        const isDone = vacc.status === 'COMPLETED';
                        return (
                          <div key={idx} className={cn(
                            "flex items-center gap-2 p-2 rounded-md border transition-all",
                            isDone ? "bg-emerald-500/10 border-emerald-500/20" : isPast ? "bg-red-500/10 border-red-500/20" : "bg-white/10 border-white/10"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Circle className={cn("w-4 h-4 flex-shrink-0", isPast ? "text-red-400" : "text-amber-400")} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-bold truncate">{vacc.vaccineName}</p>
                              <p className={cn("text-xs font-bold", isPast && !isDone ? "text-red-400" : "text-white/70")}>
                                {new Date(vacc.scheduledDate).toLocaleDateString()}
                                {isPast && !isDone && " · Overdue"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </CardContent>
           </Card>

           <Card className="rounded-lg bg-white/10 border-white/10 backdrop-blur-xl p-7 shadow-2xl border-dashed">
              <h4 className="text-white/80 font-bold italic uppercase text-xs tracking-widest mb-5 border-b border-white/5 pb-2">Batch Metadata</h4>
              <div className="space-y-5">
                 <MetaItem label="Batch ID" value={`FLK-${(batch.localBatchId || batch.id).toString().padStart(3, '0')}`} />
                 <MetaItem label="Source" value="Local Hatchery" />
                 <MetaItem label="Housing" value={batch.house?.name || `House ${batch.houseId}`} />
                 <MetaItem label="Status" value={batch.status.toUpperCase()} />
              </div>
           </Card>

           {/* Initial Investment */}
           {batch.initialCostActual > 0 && (
             <Card className="rounded-lg bg-emerald-500/10 border-emerald-500/10 backdrop-blur-xl p-7 shadow-2xl">
                <h4 className="text-emerald-400 font-bold italic uppercase text-xs tracking-widest mb-5 border-b border-emerald-500/10 pb-2 flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5" /> Initial Investment
                </h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-white/70 text-xs font-bold">Purchase Cost</span>
                     <span className="text-white font-bold text-sm">GH₵ {batch.initialCostActual.toLocaleString()}</span>
                   </div>
                   {batch.initialCostCarriage > 0 && (
                     <div className="flex justify-between items-center">
                       <span className="text-white/70 text-xs font-bold">Transport / Carriage</span>
                       <span className="text-white font-bold text-sm">GH₵ {batch.initialCostCarriage.toLocaleString()}</span>
                     </div>
                   )}
                   {batch.initialCostOther?.map((expense: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center">
                       <span className="text-white/70 text-xs font-bold">{expense.label}</span>
                       <span className="text-white font-bold text-sm">GH₵ {Number(expense.amount).toLocaleString()}</span>
                     </div>
                   ))}
                   <div className="pt-3 mt-2 border-t border-emerald-500/10 flex justify-between items-center">
                     <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Total</span>
                     <span className="text-emerald-400 font-bold text-lg">
                       GH₵ {(
                         batch.initialCostActual + 
                         batch.initialCostCarriage + 
                         (batch.initialCostOther?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0)
                       ).toLocaleString()}
                     </span>
                   </div>
                </div>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, subtext }: any) => {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-500/20 border-emerald-500/20 icon-emerald",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20 icon-amber",
    red: "text-red-500 bg-red-500/10 border-red-500/20 icon-red",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 icon-blue",
  };

  return (
    <div className="relative group">
       <div className={cn(
         "p-5 rounded-lg bg-white/10 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40 group-hover:bg-white/[0.08] transition-all duration-500 relative overflow-hidden",
         "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 group-hover:before:opacity-[0.03] transition-opacity",
         color === 'emerald' && "before:from-emerald-300 before:to-emerald-600",
         color === 'amber' && "before:from-amber-300 before:to-amber-600",
         color === 'red' && "before:from-red-300 before:to-red-600",
         color === 'blue' && "before:from-blue-300 before:to-blue-600"
       )}>
          <div className="flex justify-between items-start">
             <div className={cn("p-2 rounded-md border", colors[color])}>
                <Icon className="w-5 h-5" />
             </div>
             <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
             <h3 className="text-white font-bold text-2xl tracking-normal">{value}</h3>
             <p className="text-white/70 font-bold uppercase tracking-widest text-[9px] mt-1 italic flex justify-between items-center">
                {title} <span className="text-[8px] opacity-70">{subtext}</span>
             </p>
          </div>
       </div>
    </div>
  );
};

const MetaItem = ({ label, value }: any) => (
  <div className="flex flex-col gap-1">
     <span className="text-white/20 text-[8px] font-bold uppercase tracking-[0.2em]">{label}</span>
     <span className="text-white font-bold text-sm tracking-normal">{value}</span>
  </div>
);
