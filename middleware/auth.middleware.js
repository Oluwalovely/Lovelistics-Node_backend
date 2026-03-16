const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");


const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Access denied. No token provided.",
      });
    }


    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).send({
        message: "User no longer exists.",
      });
    }

    req.user = user;

    next(); 

  } catch (error) {
    console.log(error);

    
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



const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).send({
        message: `Access denied. This route is for ${allowedRoles.join(" and ")} only.`,
      });
    }

    next(); 
  };
};


module.exports = { protect, restrictTo };

