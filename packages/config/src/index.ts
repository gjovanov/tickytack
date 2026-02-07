export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tickytack',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
  },
  server: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT) || 3001,
  },
}
