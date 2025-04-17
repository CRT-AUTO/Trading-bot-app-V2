import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, LineChart, History, Settings, FileText, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <BarChart3 size={20} /> },
    { path: '/bots', label: 'Bots', icon: <Bot size={20} /> },
    { path: '/trades', label: 'Trade History', icon: <History size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    { path: '/docs', label: 'Documentation', icon: <FileText size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center">
            <Bot className="mr-2 text-blue-600" />
            <span>Trading Bot</span>
          </h1>
        </div>
        <nav className="mt-6">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-6 py-3 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                    location.pathname === item.path ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 mt-auto">
            <button
              onClick={handleSignOut}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <LogOut size={20} />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;