import mongoose from 'mongoose'
import { config } from 'config/src/index'

let isConnected = false

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) return mongoose

  const conn = await mongoose.connect(config.mongodb.uri, {
    maxPoolSize: 50,
    minPoolSize: 10,
    maxIdleTimeMS: 45000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  })
  isConnected = true
  return conn
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
}

export { mongoose }
