const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");

// ═══════════════════════════════════════════════════════════════
//  PROTECT MIDDLEWARE
//  Use this on any route that requires the user to be logged in.
//  It reads the JWT token from the request header, verifies it,
//  and attaches the user to req.user so the next function can use it.
// ═══════════════════════════════════════════════════════════════

const protect = async (req, res, next) => {
  try {
    // ─── Step 1: Check if token exists ────────────────────────
    // Token must be sent in the Authorization header like this:
    // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Access denied. No token provided.",
      });
    }

    // ─── Step 2: Extract token ────────────────────────────────
    // "Bearer eyJhbG..." → we split by space and take the second part
    const token = authHeader.split(" ")[1];

    // ─── Step 3: Verify token ─────────────────────────────────
    // jwt.verify will throw an error if:
    // - token is tampered with
    // - token has expired
    // - token is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ─── Step 4: Find the user ────────────────────────────────
    // decoded contains { id, role } that we stored when signing the token
    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).send({
        message: "User no longer exists.",
      });
    }

    // ─── Step 5: Attach user to request ──────────────────────
    // Now any route handler after this middleware can access
    // the logged-in user via req.user
    req.user = user;

    next(); // ✅ Move to the next middleware or route handler

  } catch (error) {
    console.log(error);

    // jwt.verify throws specific errors we can handle nicely
    if (error.name === "TokenExpiredError") {
      return res.status(401).send({
        message: "Session expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).send({
        message: "Invalid token. Please log in again.",
      });
    }

    res.status(401).send({
      message: "Authentication failed.",
    });
  }
};


// ═══════════════════════════════════════════════════════════════
//  RESTRICTTO MIDDLEWARE
//  Use this AFTER protect to lock a route to specific roles.
//  Pass in the roles that are allowed to access the route.
//
//  Example: restrictTo("admin") — only admin can access
//  Example: restrictTo("admin", "driver") — both can access
// ═══════════════════════════════════════════════════════════════

const restrictTo = (...allowedRoles) => {
  // This returns a middleware function
  return (req, res, next) => {
    // req.user is available here because protect ran before this
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).send({
        message: `Access denied. This route is for ${allowedRoles.join(" and ")} only.`,
      });
    }

    next(); // ✅ Role is allowed, move on
  };
};


module.exports = { protect, restrictTo };


// ═══════════════════════════════════════════════════════════════
//  HOW TO USE IN YOUR ROUTES
// ═══════════════════════════════════════════════════════════════
//
//  const { protect, restrictTo } = require("../middleware/auth.middleware");
//
//  // Any logged-in user can access
//  router.get("/profile", protect, getProfile);
//
//  // Only admin can access
//  router.get("/all-orders", protect, restrictTo("admin"), getAllOrders);
//
//  // Only drivers can access
//  router.patch("/pickup/:orderId", protect, restrictTo("driver"), pickupOrder);
//
//  // Only customers can access
//  router.post("/create-order", protect, restrictTo("customer"), createOrder);
//
//  // Admin and driver can both access
//  router.get("/order/:id", protect, restrictTo("admin", "driver"), getOrder);
//