import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { mongoDBConnect } from "../metrics.js";

const connectDB = async () => {
    try{
        const op = mongoDBConnect.startTimer()
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        op()
        console.log (`\n MongoDB connected !! DB Host: ${connectionInstance.connection.host}`)
    }catch (error){
        console.log("MONGODB Connection error: ", error);
        process.exit(1)    
    }
}

export default connectDB