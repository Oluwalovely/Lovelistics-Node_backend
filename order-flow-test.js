// Order Flow Test Script
// Run this in your node environment after starting the server
// Replace IDs with actual MongoDB ObjectIds from your database

const API_BASE = 'http://localhost:3000/api/v1';

// Test data - UPDATE THESE WITH YOUR ACTUAL IDs
const TEST_DATA = {
  customerId: 'your_customer_id_here',
  driverId: 'your_driver_id_here',
  orderId: null // Will be populated after creating an order
};

// Helper function for API calls
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    console.log(`[${method}] ${endpoint}`, data);
    return data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error);
    return null;
  }
}

// Test Functions
async function testOrderFlow() {
  console.log('\n========== STARTING ORDER FLOW TEST ==========\n');

  // 1. Create Order
  console.log('1️⃣  Creating Order...');
  const createOrderData = {
    customerId: TEST_DATA.customerId,
    pickupAddress: {
      street: '123 Main St',
      city: 'New York',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    deliveryAddress: {
      street: '456 Oak Ave',
      city: 'Brooklyn',
      coordinates: { lat: 40.6782, lng: -73.9442 }
    },
    packageDescription: 'Electronics shipment',
    weight: 2.5
  };

  const createOrderResult = await apiCall('POST', '/orders', createOrderData);
  if (createOrderResult.success) {
    TEST_DATA.orderId = createOrderResult.data._id;
    console.log(`✅ Order Created: ${TEST_DATA.orderId}`);
    console.log(`📦 Tracking Number: ${createOrderResult.data.trackingNumber}`);
    console.log(`💰 Price: ${createOrderResult.data.price}\n`);
  } else {
    console.log('❌ Failed to create order\n');
    return;
  }

  // 2. Get Order Details
  console.log('2️⃣  Getting Order Details...');
  await apiCall('GET', `/orders/${TEST_DATA.orderId}`);
  console.log('');

  // 3. Assign Driver
  console.log('3️⃣  Assigning Driver...');
  const assignData = { driverId: TEST_DATA.driverId };
  const assignResult = await apiCall('PATCH', `/orders/${TEST_DATA.orderId}/assign-driver`, assignData);
  if (assignResult.success) {
    console.log('✅ Driver Assigned\n');
  } else {
    console.log('❌ Failed to assign driver\n');
    return;
  }

  // 4. Update to Picked-up
  console.log('4️⃣  Driver Picking Up Package...');
  await apiCall('PATCH', `/orders/${TEST_DATA.orderId}/status`, { status: 'picked-up' });
  console.log('');

  // 5. Update to In-Transit
  console.log('5️⃣  Package In Transit...');
  await apiCall('PATCH', `/orders/${TEST_DATA.orderId}/status`, { status: 'in-transit' });
  console.log('');

  // 6. Update to Delivered
  console.log('6️⃣  Package Delivered...');
  const deliveredResult = await apiCall('PATCH', `/orders/${TEST_DATA.orderId}/status`, { status: 'delivered' });
  if (deliveredResult.success) {
    console.log(`✅ Delivered At: ${deliveredResult.data.deliveredAt}\n`);
  }

  // 7. Get Orders by Customer
  console.log('7️⃣  Getting Customer Orders...');
  await apiCall('GET', `/customers/${TEST_DATA.customerId}/orders`);
  console.log('');

  // 8. Get Orders by Driver
  console.log('8️⃣  Getting Driver Orders...');
  await apiCall('GET', `/drivers/${TEST_DATA.driverId}/orders`);
  console.log('');

  console.log('========== ORDER FLOW TEST COMPLETE ==========\n');
}

// Alternative test - Cancel Order
async function testCancelOrder() {
  console.log('\n========== TESTING ORDER CANCELLATION ==========\n');

  // Create an order first
  console.log('Creating order to cancel...');
  const createOrderData = {
    customerId: TEST_DATA.customerId,
    pickupAddress: {
      street: '789 Test St',
      city: 'Queens',
      coordinates: { lat: 40.7282, lng: -73.7949 }
    },
    deliveryAddress: {
      street: '321 Cancel Ave',
      city: 'Manhattan',
      coordinates: { lat: 40.7580, lng: -73.9855 }
    },
    packageDescription: 'Test package for cancellation',
    weight: 1.0
  };

  const createResult = await apiCall('POST', '/orders', createOrderData);
  if (!createResult.success) {
    console.log('Failed to create order');
    return;
  }

  const orderId = createResult.data._id;
  console.log(`✅ Order created: ${orderId}\n`);

  // Cancel the order
  console.log('Cancelling order...');
  const cancelResult = await apiCall('DELETE', `/orders/${orderId}`);
  if (cancelResult.success) {
    console.log(`✅ Order cancelled successfully\n`);
  }

  console.log('========== CANCELLATION TEST COMPLETE ==========\n');
}

// Run tests - uncomment which one you want to run
// testOrderFlow();
// testCancelOrder();

/* 
   USAGE INSTRUCTIONS:
   
   1. Update TEST_DATA with actual MongoDB ObjectIds:
      - Create a customer user and copy their ID
      - Create a driver user with role: 'driver' and isAvailable: true, then copy their ID
   
   2. In Node.js REPL or copy this into a .js file:
      node -e "$(cat order-flow-test.js)"
   
   3. Or paste the test functions in your browser console if calling the API from frontend
   
   4. Watch the console output to see the order flow progressing through states
*/
