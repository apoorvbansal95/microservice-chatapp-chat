import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import chatRoutes from "./routes/chat.js"
dotenv.config()
const app = express()

app.use(express.json())
app.use("/api/v1", chatRoutes)

connectDB()

app.listen(process.env.PORT, () => {
    console.log(`Chat server listening on port ${process.env.PORT}`)
})