// Netlify Edge Function for processing TradingView alerts
import { createClient } from '@supabase/supabase-js';
import { executeBybitOrder } from './utils/bybit.edge.mjs';

// CORS headers to include in all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export default async function handler(request, context) {
  console.log("Edge Function: processAlert started");
  
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    console.log("Handling preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    console.log(`Invalid request method: ${request.method}`);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Get environment variables
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  
  console.log(`Environment check: Supabase URL exists: ${!!supabaseUrl}, Service Key exists: ${!!supabaseServiceKey}`);

  // Check if environment variables are set
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Supabase client initialized");

  try {
    // Get webhook token from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const webhookToken = pathParts[pathParts.length - 1];
    
    console.log(`Processing request for webhook token: ${webhookToken}`);
    
    // Verify webhook token exists and is not expired
    console.log("Verifying webhook token...");
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*, bots(*)')
      .eq('webhook_token', webhookToken)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (webhookError || !webhook) {
      console.error("Invalid or expired webhook:", webhookError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired webhook' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    console.log(`Webhook found for user_id: ${webhook.user_id}, bot_id: ${webhook.bot_id}`);
    
    // Parse TradingView alert data
    console.log("Parsing alert data...");
    let alertData;
    try {
      alertData = await request.json();
    } catch (e) {
      console.error("Error parsing JSON from alert data:", e);
      alertData = {};
    }
    
    console.log("Alert data received:", JSON.stringify(alertData));
    
    // Get bot configuration
    const bot = webhook.bots;
    console.log(`Bot configuration retrieved: ${bot.name}, symbol: ${bot.symbol}, test_mode: ${bot.test_mode}`);
    
    // Get API credentials for the user
    console.log("Fetching API credentials...");
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', webhook.user_id)
      .eq('exchange', 'bybit')
      .single();
    
    if (apiKeyError || !apiKey) {
      console.error("API credentials not found:", apiKeyError);
      return new Response(
        JSON.stringify({ error: 'API credentials not found' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    console.log("API credentials found");
    
    // Prepare order parameters - Using bot.test_mode only
    const orderParams = {
      apiKey: apiKey.api_key,
      apiSecret: apiKey.api_secret,
      symbol: (alertData.symbol || bot.symbol || '').toUpperCase(), // Ensure uppercase for Bybit
      side: alertData.side || bot.default_side || 'Buy',
      orderType: alertData.orderType || bot.default_order_type || 'Market',
      quantity: alertData.quantity || bot.default_quantity || 0.001,
      price: alertData.price,
      stopLoss: alertData.stopLoss || bot.default_stop_loss,
      takeProfit: alertData.takeProfit || bot.default_take_profit,
      testnet: bot.test_mode // Using only bot.test_mode
    };
    
    console.log("Order parameters prepared:", JSON.stringify({
      ...orderParams,
      apiKey: "REDACTED",
      apiSecret: "REDACTED"
    }));
    
    let orderResult;
    
    // Check if in test mode
    if (bot.test_mode) {
      console.log("Test mode enabled, simulating order execution");
      // Simulate order execution
      orderResult = {
        orderId: `test-${Date.now()}`,
        symbol: orderParams.symbol,
        side: orderParams.side,
        orderType: orderParams.orderType,
        qty: orderParams.quantity,
        price: orderParams.price || 0,
        status: 'TEST_ORDER'
      };
    } else {
      console.log("Executing actual order on Bybit");
      // Execute actual order
      orderResult = await executeBybitOrder(orderParams);
    }
    
    console.log("Order result:", JSON.stringify(orderResult));
    
    // Log the trade
    console.log("Logging trade to database...");
    const { data: tradeData, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: webhook.user_id,
        bot_id: webhook.bot_id,
        symbol: orderResult.symbol,
        side: orderResult.side,
        order_type: orderResult.orderType,
        quantity: orderResult.qty,
        price: orderResult.price,
        order_id: orderResult.orderId,
        status: orderResult.status,
        created_at: new Date().toISOString()
      });
      
    if (tradeError) {
      console.error("Error logging trade:", tradeError);
    } else {
      console.log("Trade successfully logged to database");
    }
    
    // Update bot's last trade timestamp
    console.log("Updating bot's last trade timestamp and count...");
    const { data: botUpdateData, error: botUpdateError } = await supabase
      .from('bots')
      .update({
        last_trade_at: new Date().toISOString(),
        trade_count: bot.trade_count ? bot.trade_count + 1 : 1
      })
      .eq('id', webhook.bot_id);
      
    if (botUpdateError) {
      console.error("Error updating bot:", botUpdateError);
    } else {
      console.log("Bot successfully updated");
    }
    
    console.log("Process completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResult.orderId,
        status: orderResult.status,
        testMode: bot.test_mode
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error('Error processing alert:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
