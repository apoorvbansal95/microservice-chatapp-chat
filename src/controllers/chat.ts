import TryCatch from "../config/TryCatch.js";
import type { AuthencatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/Messages.js";
import axios from "axios";

//***********************************************************************************************//
export const createNewChat = TryCatch(async (req: AuthencatedRequest, res) => {
    const userId = req.user?._id
    const { otherUserId } = req.body

    if (!otherUserId) {
        res.status(400).json({
            message: "Please provide other user id"
        })
        return
    }

    const existingChat = await Chat.findOne({
        users: { $all: [userId, otherUserId], $size: 2 }
    })

    if (existingChat) {
        res.json({
            message: "Chat alreday exists",
            chatId: existingChat._id
        })
        return
    }

    const newChat = await Chat.create({
        users: [userId, otherUserId]
    })

    res.status(200).json({
        message: "new chat created successfully",
        chatId: newChat._id
    })
})

//***********************************************************************************************//
export const getAllChats = TryCatch(async (req: AuthencatedRequest, res) => {
    const userId = req.user?._id

    if (!userId) {
        res.status(401).json({
            message: "User id missing"
        })
        return
    }
    const chats = await Chat.find({
        users: userId
    }).sort({ updatedAt: -1 })

    const chatWithUserData = await Promise.all(
        chats.map(async (chat) => {
            const otherUserId = chat.users.find((id) => id !== userId)
            const unseenCount = await Message.countDocuments({
                chatId: chat._id,
                sender: { $ne: userId },
                seen: false
            })
            try {
                const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`)
                return {
                    user: data,
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount
                    }

                }

            } catch (error) {
                console.log(error)
                return {
                    user: { _id: otherUserId, name: "Unknown user" },
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount
                    }
                }
            }
        })
    )

    res.json({
        chats: chatWithUserData
    })
})

//***********************************************************************************************//
export const sendMessage = TryCatch(async (req: AuthencatedRequest, res) => {
    const senderId = req.user?._id
    const { chatId, text } = req.body
    const imageFile = req.file
    if (!senderId) {
        res.status(401).json({
            message: "unauthorized"
        })
        return
    }

    if (!chatId) {
        res.status(401).json({
            message: "ChatId required"
        })
        return
    }
    if (!text && !imageFile) {
        res.status(401).json({
            message: "Either text or image is required"
        })
        return
    }
    const chat = await Chat.findById(chatId)
    if (!chat) {
        res.status(404).json({
            message: "Chat not found "
        })
        return
    }

    const isUserInChat = chat.users.some((userId) => userId.toString() === senderId.toString())

    if (!isUserInChat) {
        res.status(403).json({
            message: "You are not part of this chat"
        })
        return
    }

    const otherUserId = chat.users.find((userId) => userId.toString() !== senderId.toString())
    if (!otherUserId) {
        res.status(401).json({
            message: "No other user found"
        })
        return
    }


    //socket setup

    let messageData: any = {
        chatId: chatId,
        sender: senderId,
        seen: false,
        seenAt: undefined
    }

    if (imageFile) {
        messageData.image = {
            url: imageFile.path,
            publicId: imageFile.filename
        }
        messageData.messageType = "image"
        messageData.text = text || ""
    }
    else {
        messageData.messageType = "text",
            messageData.text = text
    }
    const message = new Message(messageData)
    const savedMessage = await message.save()

    const latestMessageText = imageFile ? "📷 image" : text

    await Chat.findByIdAndUpdate(chatId, {
        latestMessage: {
            text: latestMessageText,
            sender: senderId
        },
        updatedAt: new Date()

    },
        {
            new: true
        }
    )

    //emit to socket

    res.status(201).json({
        message: savedMessage,
        sender: senderId
    })
})

//***********************************************************************************************//
export const getMessageByChat = TryCatch(async (req: AuthencatedRequest, res) => {
    const userId = req.user?._id
    const { chatId } = req.params
    if (!chatId) {
        res.status(401).json({
            message: "ChatId required"
        })
        return
    }

    if (!userId) {
        res.status(401).json({
            message: "User unautorized"
        })
        return
    }

    const chat = await Chat.findById(chatId)
    if (!chat) {
        res.status(404).json({
            message: "No chat found"
        })
        return
    }

    const isUserInChat = chat.users.some((id) => id.toString() === userId.toString())

    if (!isUserInChat) {
        res.status(403).json({
            message: "You are not part of this chat"
        })
        return
    }

    const messagesToMarkSeen = await Message.find({
        chatId: chatId,
        sender: {
            $ne: userId
        },
        seen: false
    })

    await Message.updateMany({
        chatId: chatId,
        sender: {
            $ne: userId
        },
        seen: false
    }, {
        seen: true,
        seenAt: new Date()
    })
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 })

    const otherUserId = chat.users.find((id) => id !== userId)
    try {
        const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`)
        if (!otherUserId) {
            res.status(400).json({
                message: "No other user found"
            })
            return
        }

        //Socket work

        res.json({
            messages,
            user: data
        })

    } catch (error) {
        console.log(error)
        res.json({
            messages,
            user: { _id: otherUserId, name: "Unknown user" }
        })

    }
})