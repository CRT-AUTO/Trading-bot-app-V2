import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Bot, RefreshCw, AlertTriangle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Bot = {
  id: string;
  name: string;
  symbol: string;
  status: 'active' | 'paused' | 'error';
  created_at: string;
  last_trade_at: string | null;
  trade_count: number;
  profit_loss: number;
};

type Trade = {
  id: string;
  bot_id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  price: number;
  quantity: number;
  status: string;
  created_at: string;
};

const Dashboard: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      
      try {
        // Fetch bots
        const { data: botsData, error: botsError } = await supabase
          .from('bots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (botsError) throw botsError;
        
        // Fetch recent trades
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (tradesError) throw tradesError;
        
        setBots(botsData || []);
        setRecentTrades(tradesData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase, user]);

  // Prepare chart data
  const chartData = {
    labels: recentTrades.map(trade => format(new Date(trade.created_at), 'MMM dd, HH:mm')).reverse(),
    datasets: [
      {
        label: 'Trade Activity',
        data: recentTrades.map(trade => trade.price).reverse(),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Recent Trade Prices',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  // Calculate summary stats
  const totalBots = bots.length;
  const activeBots = bots.filter(bot => bot.status === 'active').length;
  const totalTrades = bots.reduce((sum, bot) => sum + (bot.trade_count || 0), 0);
  const totalProfitLoss = bots.reduce((sum, bot) => sum + (bot.profit_loss || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/bots/new"
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          <span>New Bot</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-gray-500 text-sm">Total Bots</div>
              <div className="text-3xl font-bold mt-2">{totalBots}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-gray-500 text-sm">Active Bots</div>
              <div className="text-3xl font-bold mt-2 text-green-600">{activeBots}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-gray-500 text-sm">Total Trades</div>
              <div className="text-3xl font-bold mt-2">{totalTrades}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-gray-500 text-sm">Profit/Loss (USDT)</div>
              <div className={`text-3xl font-bold mt-2 ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfitLoss.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Active bots section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Active Bots</h2>
            {bots.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <Bot size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">No Bots Yet</h3>
                <p className="text-gray-500 mb-4">Create your first trading bot to get started</p>
                <Link
                  to="/bots/new"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  Create a new bot <ArrowRight size={16} className="ml-2" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot) => (
                  <Link 
                    key={bot.id} 
                    to={`/bots/${bot.id}`}
                    className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium text-lg">{bot.name}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        bot.status === 'active' ? 'bg-green-100 text-green-800' :
                        bot.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {bot.status === 'active' ? 'Active' :
                         bot.status === 'paused' ? 'Paused' : 'Error'}
                      </div>
                    </div>
                    <div className="text-gray-600 mb-1">Symbol: {bot.symbol}</div>
                    <div className="text-gray-600 mb-4">
                      Trades: {bot.trade_count || 0} | P/L: {(bot.profit_loss || 0).toFixed(2)} USDT
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {format(new Date(bot.created_at), 'MMM dd, yyyy')}
                    </div>
                    {bot.last_trade_at && (
                      <div className="text-xs text-gray-500">
                        Last trade: {format(new Date(bot.last_trade_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Chart section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Trading Activity</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              {recentTrades.length === 0 ? (
                <div className="text-center py-10">
                  <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No Trade History Yet</h3>
                  <p className="text-gray-500">
                    Trade data will appear here once your bots start trading
                  </p>
                </div>
              ) : (
                <div className="h-72">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </div>
          </div>

          {/* Recent trades section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Trades</h2>
              <Link to="/trades" className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                View all <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
            
            {recentTrades.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <p className="text-gray-500">No trades executed yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bot
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTrades.map((trade) => {
                      const bot = bots.find(b => b.id === trade.bot_id);
                      return (
                        <tr key={trade.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {bot?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              trade.side === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(trade.created_at), 'MMM dd, HH:mm')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;