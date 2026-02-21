/**
 * Monthly Revenue Chart Component
 * 
 * Displays a bar chart showing revenue and booking trends over the past 12 months.
 * Uses Recharts for visualization with a dark theme matching the admin dashboard.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3 } from 'lucide-react';

interface MonthData {
  month: string;
  year: number;
  monthNum: number;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  bookingCount: number;
  completedCount: number;
  cancelledCount: number;
  averageBookingValue: number;
}

interface Summary {
  totalRevenue: number;
  totalBookings: number;
  averageMonthlyRevenue: number;
  averageBookingValue: number;
  revenueChange: number;
  bookingChange: number;
}

interface RevenueHistoryData {
  months: MonthData[];
  summary: Summary;
}

const getApiBase = () => process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{data.month} {data.year}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Revenue:</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(data.revenue)}</span>
          </div>
          {(data.cardRevenue > 0 || data.cashRevenue > 0 || data.otherRevenue > 0) && (
            <>
              <div className="flex justify-between gap-4 pl-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-blue-400"></span>
                  Card:
                </span>
                <span className="text-blue-400 font-medium">{formatCurrency(data.cardRevenue)}</span>
              </div>
              <div className="flex justify-between gap-4 pl-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-amber-400"></span>
                  Cash:
                </span>
                <span className="text-amber-400 font-medium">{formatCurrency(data.cashRevenue)}</span>
              </div>
              {data.otherRevenue > 0 && (
                <div className="flex justify-between gap-4 pl-2">
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500"></span>
                    Unpaid:
                  </span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(data.otherRevenue)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Bookings:</span>
            <span className="text-amber-400 font-medium">{data.bookingCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Completed:</span>
            <span className="text-green-400 font-medium">{data.completedCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Cancelled:</span>
            <span className="text-red-400 font-medium">{data.cancelledCount}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
            <span className="text-slate-400">Avg Value:</span>
            <span className="text-blue-400 font-medium">{formatCurrency(data.averageBookingValue)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyRevenueChart() {
  const [data, setData] = useState<RevenueHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${getApiBase()}/api/customers/revenue-history`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch revenue history');
        }
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('[RevenueChart] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-slate-400">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-red-400">{error || 'Failed to load data'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { months, summary } = data;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Revenue Overview
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Last 12 months performance
            </CardDescription>
          </div>
          
          {/* Summary Stats */}
          <div className="flex gap-3 sm:gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Revenue</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Bookings</p>
              <p className="text-lg font-bold text-amber-400">{summary.totalBookings}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Avg/Month</p>
              <p className="text-lg font-bold text-blue-400">{formatCurrency(summary.averageMonthlyRevenue)}</p>
            </div>
          </div>
        </div>
        
        {/* Month-over-month changes */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
          <Badge 
            className={`${summary.revenueChange >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} border flex items-center gap-1`}
          >
            {summary.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {summary.revenueChange >= 0 ? '+' : ''}{summary.revenueChange}% Revenue vs last month
          </Badge>
          <Badge 
            className={`${summary.bookingChange >= 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} border flex items-center gap-1`}
          >
            {summary.bookingChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {summary.bookingChange >= 0 ? '+' : ''}{summary.bookingChange}% Bookings vs last month
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={months}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
              />
              <Bar 
                yAxisId="left"
                dataKey="otherRevenue" 
                name="Unpaid" 
                stackId="revenue"
                fill="#10b981" 
                opacity={0.6}
              />
              <Bar 
                yAxisId="left"
                dataKey="cardRevenue" 
                name="Card" 
                stackId="revenue"
                fill="#60a5fa" 
                opacity={0.85}
              />
              <Bar 
                yAxisId="left"
                dataKey="cashRevenue" 
                name="Cash" 
                stackId="revenue"
                fill="#fbbf24" 
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookingCount"
                name="Bookings"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default MonthlyRevenueChart;
