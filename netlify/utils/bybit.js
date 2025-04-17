// Bybit API utility functions
import axios from 'axios';
import crypto from 'crypto';

// Base URLs
const MAINNET_URL = 'https://api.bybit.com';
const TESTNET_URL = 'https://api-testnet.bybit.com';

/**
 * Generate signature for API requests according to Bybit V5 API requirements
 */
function generateSignature(apiSecret, params) {
  const timestamp = Date.now().toString();
  const recv_window = '5000';
  
  // Create a copy of the params for signature generation
  const signParams = { ...params };
  
  // Add timestamp and recv_window to params
  signParams.timestamp = timestamp;
  signParams.recv_window = recv_window;
  
  // Sort keys alphabetically and create the query string
  const queryString = Object.keys(signParams)
    .sort()
    .map(key => `${key}=${signParams[key]}`)
    .join('&');
  
  // Generate the HMAC SHA256 signature
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
  
  console.log('Generated signature params:', JSON.stringify({
    ...signParams,
    apiKey: 'REDACTED',
    apiSecret: 'REDACTED'
  }));
  
  return { 
    timestamp,
    signature,
    recv_window
  };
}

/**
 * Execute an order on Bybit using V5 API
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
  testnet = false
}) {
  const baseUrl = testnet ? TESTNET_URL : MAINNET_URL;
  const endpoint = '/v5/order/create';
  
  try {
    // Set up order parameters according to V5 API
    const params = {
      category: 'linear', // Use 'linear' for USDT perpetual contracts
      symbol: symbol,
      side: side,
      orderType: orderType,
      qty: quantity.toString(), // Make sure quantity is a string
      timeInForce: 'GoodTillCancel'
    };
    
    // Add price for Limit orders only
    if (orderType === 'Limit' && price) {
      params.price = price.toString();
    }
    
    // Add optional stop loss and take profit if provided
    if (stopLoss) params.stopLoss = stopLoss.toString();
    if (takeProfit) params.takeProfit = takeProfit.toString();
    
    // Generate signature and auth params
    const { timestamp, signature, recv_window } = generateSignature(apiSecret, params);
    
    console.log('Executing Bybit order with params:', {
      ...params,
      url: `${baseUrl}${endpoint}`,
      testnet: testnet
    });
    
    // Make the request with proper headers
    const response = await axios({
      method: 'post',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recv_window,
        'X-BAPI-SIGN': signature,
        'Content-Type': 'application/json'
      },
      data: params
    });
    
    console.log('Bybit API response:', JSON.stringify(response.data));
    
    if (response.data.retCode === 0) {
      return {
        orderId: response.data.result.orderId,
        symbol: symbol,
        side: side,
        orderType: orderType,
        qty: quantity,
        price: price || 0,
        status: response.data.result.orderStatus || 'Created'
      };
    } else {
      throw new Error(`Bybit API error: ${response.data.retMsg}`);
    }
  } catch (error) {
    // Enhanced error logging for debugging
    if (error.response) {
      console.error(`Bybit API response error: Status ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data));
      throw new Error(`Failed to execute order: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from Bybit API');
      throw new Error('Failed to execute order: No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
      throw new Error(`Failed to execute order: ${error.message}`);
    }
  }
}

/**
 * Get account positions from Bybit using V5 API
 */
export async function getBybitPositions({
  apiKey,
  apiSecret,
  symbol,
  testnet = false
}) {
  const baseUrl = testnet ? TESTNET_URL : MAINNET_URL;
  const endpoint = '/v5/position/list';
  
  try {
    // Set up query parameters
    const params = {
      category: 'linear',
      symbol: symbol
    };
    
    // Generate signature and auth params
    const { timestamp, signature, recv_window } = generateSignature(apiSecret, params);
    
    console.log('Getting positions with params:', {
      ...params,
      url: `${baseUrl}${endpoint}`,
      testnet: testnet
    });
    
    // Make the request with proper headers
    const response = await axios({
      method: 'get',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recv_window,
        'X-BAPI-SIGN': signature
      },
      params: params
    });
    
    if (response.data.retCode === 0) {
      return response.data.result;
    } else {
      throw new Error(`Bybit API error: ${response.data.retMsg}`);
    }
  } catch (error) {
    // Enhanced error logging for debugging
    if (error.response) {
      console.error(`Bybit API response error: Status ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data));
      throw new Error(`Failed to get positions: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from Bybit API');
      throw new Error('Failed to get positions: No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }
}