import React from 'react';
import { Bot, AlertTriangle, Code, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const Documentation: React.FC = () => {
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess({ ...copySuccess, [id]: true });
    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [id]: false });
    }, 2000);
  };

  const codeSnippets = {
    tradingViewAlert: `{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "orderType": "Market",
  "quantity": 0.001,
  "price": 50000,
  "stopLoss": 49000,
  "takeProfit": 52000
}`,
    tradingViewVariables: `{
  "symbol": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "price": {{close}},
  "quantity": {{strategy.position_size}}
}`,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Documentation</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Welcome to the Trading Bot Platform! This guide will help you set up your trading bots and connect them to TradingView for automated trade execution on Bybit.
          </p>
          
          <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle size={20} className="text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Important Safety Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Always start with small amounts and test your setup thoroughly before using larger sums. Trading involves risk of financial loss. Use Test Mode for initial setup.
              </p>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Platform Overview</h3>
          <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
            <li>Create multiple trading bots with custom configurations</li>
            <li>Connect each bot to TradingView alerts via unique webhook URLs</li>
            <li>Execute trades automatically on Bybit based on TradingView signals</li>
            <li>Monitor performance and trade history</li>
            <li>Test your strategy without risking real funds</li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Setting Up TradingView Alerts</h2>
        
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Step 1: Generate Your Webhook URL</h3>
          <p className="text-gray-700">
            Before setting up alerts in TradingView, you need to generate a unique webhook URL for your bot:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Go to the "Bots" section of the dashboard</li>
            <li>Select the bot you want to connect to TradingView</li>
            <li>Click "Generate Webhook URL"</li>
            <li>Copy the generated URL</li>
          </ol>
          
          <h3 className="font-medium text-lg mt-6">Step 2: Create an Alert in TradingView</h3>
          <p className="text-gray-700">
            Now that you have your webhook URL, you need to create an alert in TradingView:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Open TradingView and navigate to the chart of your chosen symbol</li>
            <li>Create your strategy or indicator</li>
            <li>Click the "Alerts" button (bell icon) in the top right</li>
            <li>Create a new alert</li>
            <li>Set your alert conditions</li>
            <li>Scroll down to "Notifications"</li>
            <li>Enable "Webhook URL"</li>
            <li>Paste your webhook URL</li>
            <li>Add the JSON payload in the "Message" field (see below)</li>
          </ol>
          
          <h3 className="font-medium text-lg mt-6">Step 3: JSON Payload Format</h3>
          <p className="text-gray-700 mb-2">
            Your TradingView alert message must follow this JSON format:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewAlert}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewAlert, 'alert')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['alert'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <p className="text-gray-700 mt-4 mb-2">
            You can use TradingView variables in your payload:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewVariables}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewVariables, 'variables')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['variables'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Testing Your Webhook</h3>
          <p className="text-gray-700">
            To test your webhook before using it with real money:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Create a bot with the "Test Mode" option enabled</li>
            <li>Generate a webhook URL for this test bot</li>
            <li>Set up your TradingView alert with this URL</li>
            <li>Trigger the alert manually or wait for it to trigger</li>
            <li>Check the "Trade History" section to see if the test order was processed correctly</li>
          </ol>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Bot Configuration Options</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Each bot can be configured with the following options:
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">Option</th>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3">Default</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Bot Name</td>
                  <td className="px-6 py-4">A descriptive name for your bot</td>
                  <td className="px-6 py-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Trading Symbol</td>
                  <td className="px-6 py-4">The trading pair (e.g., BTCUSDT)</td>
                  <td className="px-6 py-4">BTCUSDT</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Order Type</td>
                  <td className="px-6 py-4">Market or Limit order</td>
                  <td className="px-6 py-4">Market</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Quantity</td>
                  <td className="px-6 py-4">Size of each trade</td>
                  <td className="px-6 py-4">0.001</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Side</td>
                  <td className="px-6 py-4">Buy, Sell, or none (use signal)</td>
                  <td className="px-6 py-4">None</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Stop Loss %</td>
                  <td className="px-6 py-4">Automatic stop loss percentage</td>
                  <td className="px-6 py-4">0 (disabled)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Take Profit %</td>
                  <td className="px-6 py-4">Automatic take profit percentage</td>
                  <td className="px-6 py-4">0 (disabled)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Test Mode</td>
                  <td className="px-6 py-4">Process signals without executing real trades</td>
                  <td className="px-6 py-4">Enabled</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p className="text-gray-700 mt-4">
            While these settings provide defaults for your bot, you can override them in each TradingView alert by including the specific values in your alert message.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Bybit API Setup</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            To connect your Trading Bot Platform to Bybit, you need to generate API keys from your Bybit account:
          </p>
          
          <h3 className="font-medium text-lg">Steps to Generate Bybit API Keys:</h3>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Log in to your Bybit account</li>
            <li>Navigate to "API Management" in your account settings</li>
            <li>Click "Create New Key"</li>
            <li>
              Set the permissions:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Read - Mandatory</li>
                <li>Trade - Mandatory</li>
                <li>Withdraw - <span className="font-medium text-red-600">NOT recommended</span></li>
              </ul>
            </li>
            <li>Enter your 2FA code to confirm</li>
            <li>Copy both the API Key and API Secret</li>
            <li>Enter these credentials in the Account Settings page of this platform</li>
          </ol>
          
          <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <Bot size={20} className="text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Testing with Bybit Testnet</h3>
              <p className="text-sm text-blue-700 mt-1">
                We recommend using Bybit Testnet for initial setup and testing. Create a Testnet account at <a href="https://testnet.bybit.com" target="_blank" rel="noopener noreferrer" className="underline">testnet.bybit.com</a> and generate API keys there. Enable "Use Bybit Testnet" in your account settings.
              </p>
            </div>
          </div>
          
          <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-md mt-4">
            <AlertTriangle size={20} className="text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Security Warning</h3>
              <p className="text-sm text-red-700 mt-1">
                Never share your API keys or secrets with anyone. This platform securely encrypts your keys, but you should still follow security best practices. Do not enable withdrawal permissions for API keys used with this platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;