// Netlify Edge Function for processing TradingView alerts
import { createClient } from '@supabase/supabase-js';
import { executeBybitOrder, MAINNET_URL, TESTNET_URL } from './utils/bybit.edge.mjs';

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
  
  console.log(`Environment check: SUPABASE_URL=${!!supabaseUrl}, SERVICE_KEY=${!!supabaseServiceKey}`);
  
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
    const parts = url.pathname.split('/');
    const webhookToken = parts[parts.length - 1];
    
    console.log(`Processing webhook token: ${webhookToken}`);

    // Verify webhook token exists and is not expired
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*, bots(*)')
      .eq('webhook_token', webhookToken)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (webhookError || !webhook) {
      console.error("Invalid/expired webhook:", webhookError);
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

    // Parse alert payload
    let alertData = {};
    try { 
      alertData = await request.json(); 
    }
    catch (e) { 
      console.error("Alert JSON parse error:", e); 
    }

    // Load bot config + API key
    const bot = webhook.bots;
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', webhook.user_id)
      .eq('exchange', 'bybit')
      .single();
    
    if (apiKeyError || !apiKey) {
      console.error("API key not found:", apiKeyError);
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

    // ─────── MIN QTY FETCH & ROUND ───────
    const symbol = (alertData.symbol || bot.symbol || '').toUpperCase();
    const baseUrl = bot.test_mode ? TESTNET_URL : MAINNET_URL;
    // fetch instrument info
    const infoRes = await fetch(
      `${baseUrl}/v5/market/instruments-info?symbol=${symbol}&category=linear`
    );
    const infoJson = await infoRes.json();
    if (infoJson.retCode !== 0) {
      throw new Error(`InstrumentsInfo error: ${infoJson.retMsg}`);
    }
    const inst = infoJson.result.list[0];
    const lotFilter = inst.lotSizeFilter;
    const minQtyStr = lotFilter.minOrderQty ?? lotFilter.minTrdAmt;
    const stepStr = lotFilter.qtyStep ?? lotFilter.stepSize;
    const minQty = parseFloat(minQtyStr);
    const step = parseFloat(stepStr);
    const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
    const rawQty = parseFloat(alertData.quantity ?? bot.default_quantity ?? 0);
    let qty = rawQty < minQty
      ? minQty
      : Math.floor(rawQty / step) * step;
    if (qty < minQty) qty = minQty;
    const adjustedQty = parseFloat(qty.toFixed(decimals));
    console.log(
      `Adjusted quantity from ${rawQty} → ${adjustedQty}` +
      ` (minQty=${minQty}, step=${step})`
    );

    // ─────── BUILD ORDER PARAMS ───────
    const orderParams = {
      apiKey: apiKey.api_key,
      apiSecret: apiKey.api_secret,
      symbol,
      side: alertData.side || bot.default_side || 'Buy',
      orderType: alertData.orderType || bot.default_order_type || 'Market',
      quantity: adjustedQty,
      price: alertData.price,
      stopLoss: alertData.stopLoss || bot.default_stop_loss,
      takeProfit: alertData.takeProfit || bot.default_take_profit,
      testnet: bot.test_mode
    };
    
    console.log(
      "Order parameters prepared:",
      JSON.stringify({ ...orderParams, apiKey: "REDACTED", apiSecret: "REDACTED" })
    );
    
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
