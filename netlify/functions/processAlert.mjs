// Netlify Function for processing TradingView alerts
import { createClient } from '@supabase/supabase-js';
import { executeBybitOrder } from '../utils/bybit.mjs';

export const handler = async (event, context) => {
  console.log("processAlert function started");
  
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    console.log("Handling preflight request");
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ""
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    console.log(`Invalid request method: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  // Get environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log(`Environment check: Supabase URL exists: ${!!supabaseUrl}, Service Key exists: ${!!supabaseServiceKey}`);

  // Check if environment variables are set
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Server configuration error" })
    };
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Supabase client initialized");

  try {
    // Get webhook token from URL path
    const webhookToken = event.path.split('/').pop();
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
      return {
        statusCode: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: 'Invalid or expired webhook' })
      };
    }
    
    console.log(`Webhook found for user_id: ${webhook.user_id}, bot_id: ${webhook.bot_id}`);
    
    // Parse TradingView alert data
    console.log("Parsing alert data...");
    let alertData;
    try {
      alertData = JSON.parse(event.body);
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
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: 'API credentials not found' })
      };
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
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        orderId: orderResult.orderId,
        status: orderResult.status,
        testMode: bot.test_mode
      })
    };
  } catch (error) {
    console.error('Error processing alert:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};