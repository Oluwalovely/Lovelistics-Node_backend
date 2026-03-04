# Order Flow Documentation

## Overview
This is a complete order management system for a delivery service with customer placement, driver assignment, and real-time status tracking capabilities.

## Order States & Flow

```
pending → assigned → picked-up → in-transit → delivered
    ↓
 cancelled
```

### State Definitions:
- **pending**: Order created, waiting for driver assignment
- **assigned**: Driver has been assigned to the order
- **picked-up**: Driver has picked up the package
- **in-transit**: Package is on the way to delivery address
- **delivered**: Package has been delivered
- **cancelled**: Order has been cancelled

---

## API Endpoints

### 1. Create Order
**POST** `/api/v1/orders`

Create a new delivery order.

**Request Body:**
```json
{
  "customerId": "user_id_here",
  "pickupAddress": {
    "street": "123 Main St",
    "city": "New York",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "deliveryAddress": {
    "street": "456 Oak Ave",
    "city": "Brooklyn",
    "coordinates": {
      "lat": 40.6782,
      "lng": -73.9442
    }
  },
  "packageDescription": "Electronics package",
  "weight": 2.5
}
```

**Response (201 Success):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "trackingNumber": "TRK23456789ABCD",
    "customer": "customer_id",
    "pickupAddress": {...},
    "deliveryAddress": {...},
    "packageDescription": "Electronics package",
    "weight": 2.5,
    "price": 2250,
    "status": "pending",
    "createdAt": "2026-02-17T10:00:00Z"
  }
}
```

---

### 2. Get All Orders
**GET** `/api/v1/orders`

Retrieve all orders in the system.

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "order_id",
      "trackingNumber": "TRK23456789ABCD",
      "customer": {
        "_id": "customer_id",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phone": "555-1234"
      },
      "driver": null,
      "status": "pending",
      "price": 2250,
      "createdAt": "2026-02-17T10:00:00Z"
    }
  ]
}
```

---

### 3. Get Single Order
**GET** `/api/v1/orders/:orderId`

Retrieve a specific order by ID.

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "_id": "order_id",
    "trackingNumber": "TRK23456789ABCD",
    "customer": {...},
    "driver": {...},
    "status": "assigned",
    "price": 2250
  }
}
```

---

### 4. Assign Driver
**PATCH** `/api/v1/orders/:orderId/assign-driver`

Assign an available driver to a pending order.

**Request Body:**
```json
{
  "driverId": "driver_user_id"
}
```

**Validation:**
- Driver must exist in database
- Driver role must be "driver"
- Driver must have `isAvailable: true`
- Order status must be "pending"

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": {
    "_id": "order_id",
    "driver": "driver_id",
    "status": "assigned"
  }
}
```

---

### 5. Update Order Status
**PATCH** `/api/v1/orders/:orderId/status`

Update the status of an order through the delivery lifecycle.

**Request Body:**
```json
{
  "status": "picked-up"
}
```

**Valid Statuses:** `pending`, `assigned`, `picked-up`, `in-transit`, `delivered`, `cancelled`

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "order_id",
    "status": "picked-up",
    "deliveredAt": null
  }
}
```

**Special Behavior:**
- When status changes to "delivered", `deliveredAt` timestamp is automatically set

---

### 6. Get Orders by Customer
**GET** `/api/v1/customers/:customerId/orders`

Retrieve all orders placed by a specific customer.

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "order_id",
      "trackingNumber": "TRK23456789ABCD",
      "status": "delivered",
      "price": 2250,
      "driver": {...}
    }
  ]
}
```

---

### 7. Get Orders by Driver
**GET** `/api/v1/drivers/:driverId/orders`

Retrieve all orders assigned to a specific driver.

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "order_id",
      "trackingNumber": "TRK23456789ABCD",
      "status": "in-transit",
      "customer": {...},
      "deliveryAddress": {...}
    }
  ]
}
```

---

### 8. Cancel Order
**DELETE** `/api/v1/orders/:orderId`

Cancel an order.

**Restrictions:**
- Cannot cancel orders with status "delivered"
- Cannot cancel orders already "cancelled"

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "_id": "order_id",
    "status": "cancelled"
  }
}
```

---

## Price Calculation

The pricing formula is:
```
Price = Base Price + (Weight × Price Per KG)
Price = 1000 + (weight × 500)
```

**Examples:**
- 1 kg package: 1000 + (1 × 500) = **1500**
- 2.5 kg package: 1000 + (2.5 × 500) = **2250**
- 5 kg package: 1000 + (5 × 500) = **3500**

---

## Tracking Number Generation

Tracking numbers are automatically generated with format: `TRK` + `8-digit timestamp` + `4-character random code`

Example: `TRK234567891AB2C`

---

## Complete Order Flow Example

### Step 1: Customer Creates Order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer_id_123",
    "pickupAddress": {
      "street": "100 Main St",
      "city": "NYC",
      "coordinates": {"lat": 40.7128, "lng": -74.0060}
    },
    "deliveryAddress": {
      "street": "200 Oak Ave",
      "city": "Brooklyn",
      "coordinates": {"lat": 40.6782, "lng": -73.9442}
    },
    "packageDescription": "Document box",
    "weight": 1.5
  }'
```

Status: **pending** → *Order waiting for driver assignment*

### Step 2: Admin Assigns Driver
```bash
curl -X PATCH http://localhost:3000/api/v1/orders/order_id_123/assign-driver \
  -H "Content-Type: application/json" \
  -d '{"driverId": "driver_id_456"}'
```

Status: **assigned** → *Driver notified and on the way to pickup*

### Step 3: Driver Picks Up Package
```bash
curl -X PATCH http://localhost:3000/api/v1/orders/order_id_123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "picked-up"}'
```

Status: **picked-up** → *Package in driver's possession*

### Step 4: Driver in Transit
```bash
curl -X PATCH http://localhost:3000/api/v1/orders/order_id_123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-transit"}'
```

Status: **in-transit** → *Package on the way to delivery address*

### Step 5: Package Delivered
```bash
curl -X PATCH http://localhost:3000/api/v1/orders/order_id_123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}'
```

Status: **delivered** → *`deliveredAt` timestamp automatically recorded*

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common Errors:

| Status | Scenario |
|--------|----------|
| 400 | Missing required fields, invalid status, user not a driver, driver unavailable |
| 404 | Order not found, customer not found, driver not found |
| 500 | Server error or database connection issue |

---

## Database Models Used

### Order Model
```javascript
{
  trackingNumber: String (unique),
  customer: ObjectId (ref: 'User'),
  driver: ObjectId (ref: 'User'),
  pickupAddress: { street, city, coordinates: {lat, lng} },
  deliveryAddress: { street, city, coordinates: {lat, lng} },
  packageDescription: String,
  weight: Number,
  status: String (enum),
  price: Number,
  createdAt: Date,
  deliveredAt: Date
}
```

### User Model (Referenced)
```javascript
{
  fullName: String,
  email: String,
  phone: String,
  roles: String (admin|driver|customer),
  isAvailable: Boolean (drivers only),
  currentLocation: {lat, lng}
}
```

---

## Testing the Flow

Make sure you have:
1. Created users with appropriate roles (customer, driver)
2. Set driver `isAvailable: true`
3. Use valid MongoDB ObjectIds for references

Start with creating an order, then follow the steps above to test the complete flow.
