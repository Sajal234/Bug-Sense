import dotenv from "dotenv"
dotenv.config();

import app from "./app.js"
import connectDB from "./config/database.js";


connectDB()
.then(()=>{
    app.listen(process.env.PORT, ()=>{
        console.log(`Server is running on the port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.error("Error in starting the server : ", err.message);
    process.exit(1);
})




