import mongoose from "mongoose";

const connectDB = async () => {
    const url = process.env.MONGO_URI
    if (!url) {
        throw new Error("Please provide Mongo_uri")
    }
    try {
        await mongoose.connect(url, {
            dbName: "chatappmicroserviceapp"
        })
        console.log("connected to mongodb")

    }
    catch (err) {
        console.log(err)
        process.exit(1)
    }
}

export default connectDB