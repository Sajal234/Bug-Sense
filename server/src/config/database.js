
import mongoose from "mongoose";

const connectDB = async () =>{
    try{
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connected | Host : ", connectionInstance.connection.host);
    }
    catch(err){
        console.error("Database connection failed : ", err.message);
        process.exit(1);
    }
}

export default connectDB;