// Netlify Function for generating webhook URLs
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

export const handler = async (event, context) => {
  console.log("generateWebhook function started");
  
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
    // Parse request body
    const body = JSON.parse(event.body);
    const { userId, botId, expirationDays = 30 } = body;
    
    console.log(`Request received - userId: ${userId}, botId: ${botId}, expirationDays: ${expirationDays}`);
    
    // Validate required fields
    if (!userId || !botId) {
      console.log("Missing required fields");
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }
    
    // Generate unique webhook token
    const webhookToken = nanoid(32);
    console.log(`Generated webhook token: ${webhookToken.substring(0, 5)}...`);
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    console.log(`Expiration date set to: ${expirationDate.toISOString()}`);
    
    // Store webhook information in database
    console.log("Inserting webhook into database...");
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: userId,
        bot_id: botId,
        webhook_token: webhookToken,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Database insertion error:", error);
      throw error;
    }
    
    console.log("Webhook successfully stored in database");
    
    // Construct webhook URL
    const baseUrl = process.env.URL || `https://${event.headers.host}`;
    console.log(`Using base URL: ${baseUrl}`);
    
    const webhookUrl = `${baseUrl}/.netlify/functions/processAlert/${webhookToken}`;
    console.log(`Generated webhook URL: ${webhookUrl}`);
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        webhookUrl,
        expiresAt: expirationDate.toISOString()
      })
    };
  } catch (error) {
    console.error('Error generating webhook:', error);
    
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