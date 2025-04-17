// Bybit API utility functions for Edge Functions
// Uses Web Fetch API and Web Crypto API instead of axios and node:crypto

// Base URLs - use alternative domain to avoid geo-blocks
export const MAINNET_URL = 'https://api.bytick.com';
export const TESTNET_URL = 'https://api-testnet.bybit.com';
const DEFAULT_RECV_WINDOW = '5000';

/**
 * Fetch Bybit server time for precise signature timestamps.
 * Returns a string of milliseconds since epoch.
 */
async function getServerTimestamp(testnet = false) {
  const url = `${testnet ? TESTNET_URL : MAINNET_URL}/v5/market/time`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Failed to fetch server time: ${data.retMsg}`);
  }
  return String(data.time);
}

/**
 * Create HMAC SHA256 signature using Web Crypto API
 */
async function hmacSha256(secret, message) {
  // Convert secret and message to Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the message
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sign a POST request per V5 spec:
 *   signStr = timestamp + apiKey + recvWindow + bodyString
 */
async function signPost({ apiSecret, apiKey, recvWindow, timestamp, body }) {
  const plain = timestamp + apiKey + recvWindow + body;
  return await hmacSha256(apiSecret, plain);
}

/**
 * Sign a GET request per V5 spec:
 *   signStr = timestamp + apiKey + recvWindow + queryString
 */
async function signGet({ apiSecret, apiKey, recvWindow, timestamp, queryString }) {
  const plain = timestamp + apiKey + recvWindow + queryString;
  return await hmacSha256(apiSecret, plain);
}

/**
 * Execute an order on Bybit using V5 API.
 * Returns an object { orderId, symbol, side, orderType, qty, price, status }.
 */
export async function executeBybitOrder({
  apiKey,
  apiSecret,
  symbol,
  side,
  orderType,
  quantity,
  price,
  stopLoss,
  takeProfit,
  testnet = false,
  category = 'linear',             // USDT perpetual
  recvWindow = DEFAULT_RECV_WINDOW
}) {
  const baseUrl = testnet ? TESTNET_URL : MAINNET_URL;
  const endpoint = '/v5/order/create';

  try {
    // 1) Build the JSON payload
    const payload = {
      category,
      symbol,
      side,
      orderType,
      qty: String(quantity),
      timeInForce: orderType === 'Market' ? 'IOC' : 'PostOnly'
    };
    
    if (orderType === 'Limit' && price != null) {
      payload.price = String(price);
    }
    
    if (stopLoss != null) {
      payload.stopLoss = String(stopLoss);
    }
    
    if (takeProfit != null) {
      payload.takeProfit = String(takeProfit);
    }

    const bodyStr = JSON.stringify(payload);
    const timestamp = await getServerTimestamp(testnet);
    const signature = await signPost({ 
      apiSecret, 
      apiKey, 
      recvWindow, 
      timestamp, 
      body: bodyStr 
    });

    console.log('Executing Bybit order with params:', {
      ...payload,
      url: `${baseUrl}${endpoint}`,
      testnet
    });

    // Make the request with proper headers
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      },
      body: bodyStr
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
    }

    return {
      orderId: data.result.orderId,
      symbol,
      side,
      orderType,
      qty: quantity,
      price: price || 0,
      status: data.result.orderStatus || 'Created'
    };
  } catch (error) {
    console.error('Error executing Bybit order:', error);
    throw error;
  }
}

/**
 * Get account positions from Bybit using V5 API.
 * Returns data.result (array of position objects).
 */
export async function getBybitPositions({
  apiKey,
  apiSecret,
  symbol,
  testnet = false,
  category = 'linear',
  recvWindow = DEFAULT_RECV_WINDOW
}) {
  const baseUrl = testnet ? TESTNET_URL : MAINNET_URL;
  const endpoint = '/v5/position/list';

  try {
    // 1) Build sorted query string
    const params = { category, symbol };
    const queryString = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const timestamp = await getServerTimestamp(testnet);
    const signature = await signGet({ 
      apiSecret, 
      apiKey, 
      recvWindow, 
      timestamp, 
      queryString 
    });

    // Make the request with proper headers
    const url = `${baseUrl}${endpoint}?${queryString}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Error getting Bybit positions:', error);
    throw error;
  }
}
