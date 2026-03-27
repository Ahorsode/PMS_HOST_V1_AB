import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Receipt, 
  Tag,
  Wallet,
  Banknote
} from 'lucide-react';
import { getAllSales } from '@/lib/actions/dashboard-actions';
import { getExpenses } from '@/lib/actions/expense-actions';
import { formatCurrency } from '@/lib/utils';
import { FinanceActions } from './FinanceActions';

interface Sale {
  id: string;
  totalAmount: number | any;
  customerName?: string | null;
  saleDate: Date | string;
  status: string;
}

interface Expense {
  id: string;
  amount: number | any;
  category: string;
  expenseDate: Date | string;
  description?: string | null;
}

export default async function FinancePage() {
  const sales = (await getAllSales()) as Sale[];
  const expensesData = await getExpenses();
  const expenses = (expensesData.expenses || []) as Expense[];

  const totalSales = sales.reduce((acc: number, sale: Sale) => acc + Number(sale.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((acc: number, exp: Expense) => acc + Number(exp.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">Finance <span className="text-emerald-400">Hub</span></h1>
          <p className="text-white/50 text-sm font-bold uppercase tracking-widest mt-1 italic ml-1">Sales & Expenses Tracking</p>
        </div>
        <div className="flex gap-2">
          <FinanceActions />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-500/10 border-blue-500/20 relative overflow-hidden group backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 text-[10px] font-black uppercase tracking-widest italic">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-3xl font-black text-white tracking-tighter">GH₵ {totalSales.toLocaleString()}</p>
                 <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold mt-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>INCOME</span>
                 </div>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-400/20 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20 relative overflow-hidden group backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 text-[10px] font-black uppercase tracking-widest italic">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-3xl font-black text-white tracking-tighter">GH₵ {totalExpenses.toLocaleString()}</p>
                 <div className="flex items-center gap-1 text-red-400 text-[10px] font-bold mt-1">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>EXPENDITURE</span>
                 </div>
              </div>
              <TrendingDown className="w-12 h-12 text-red-400/20 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden group backdrop-blur-xl ${netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} text-[10px] font-black uppercase tracking-widest italic`}>Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-3xl font-black text-white tracking-tighter">GH₵ {netProfit.toLocaleString()}</p>
                 <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{netProfit >= 0 ? 'PROFIT' : 'LOSS'}</span>
                 </div>
              </div>
              <Wallet className={`w-12 h-12 group-hover:scale-110 transition-transform duration-500 ${netProfit >= 0 ? 'text-emerald-400/20' : 'text-red-400/20'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales List */}
        <Card className="bg-[#1a1a1a]/80 border-white/10 overflow-hidden backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle className="text-white text-lg flex items-center gap-2 font-black italic">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
              {sales.length === 0 ? (
                <p className="p-8 text-center text-white/30 text-xs italic font-bold uppercase tracking-widest">No sales recorded yet</p>
              ) : (
                sales.map((sale: Sale) => (
                  <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-black uppercase tracking-tight">{sale.customerName || 'Walk-in Customer'}</p>
                        <p className="text-white/40 text-[9px] uppercase font-black tracking-widest italic">{new Date(sale.saleDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-emerald-400 font-black text-sm">+{formatCurrency(Number(sale.totalAmount))}</p>
                       <p className="text-white/40 text-[8px] uppercase font-black tracking-widest">{sale.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses List */}
        <Card className="bg-[#1a1a1a]/80 border-white/10 overflow-hidden backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle className="text-white text-lg flex items-center gap-2 font-black italic">
              <Receipt className="w-5 h-5 text-red-400" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
              {expenses.length === 0 ? (
                <p className="p-8 text-center text-white/30 text-xs italic font-bold uppercase tracking-widest">No expenses recorded yet</p>
              ) : (
                expenses.map((exp: Expense) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                        <Tag className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-black uppercase tracking-tight">{exp.category}</p>
                        <p className="text-white/40 text-[9px] uppercase font-black tracking-widest italic">{new Date(exp.expenseDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-red-400 font-black text-sm">-{formatCurrency(Number(exp.amount))}</p>
                       <p className="text-white/40 text-[8px] uppercase font-black tracking-widest truncate max-w-[100px]">{exp.description || 'No description'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
