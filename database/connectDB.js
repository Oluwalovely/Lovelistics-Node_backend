const mongoose = require("mongoose")

let connectionPromise = null

const connectDB= async()=>{
    if(mongoose.connection.readyState===1) return

    if (connectionPromise) return connectionPromise

    connectionPromise = mongoose
    .connect(process.env.DATABASE_URI)
    .then(()=>{
        console.log("Database connected successfully");
        
    })
    .catch((err)=>{
        connectionPromise=null;
        console.log(err);
        throw err;
        
    })

    return connectionPromise
}

module.exports= connectDB



//0 ->disconnected
//1 ->connected
//2->connecting
//3 ->disconnecting