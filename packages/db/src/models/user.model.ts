import { Schema, model, type Document, type Types } from 'mongoose'

export type UserRole = 'admin' | 'manager' | 'member'

export interface IOAuthProvider {
  provider: string
  providerId: string
  accessToken?: string
  refreshToken?: string
}

export interface IJiraSettings {
  jiraBaseUrl: string
  jiraEmail: string
  jiraApiToken: string
}

export interface IUser extends Document {
  email: string
  username: string
  password?: string
  firstName: string
  lastName: string
  role: UserRole
  orgId: Types.ObjectId
  isActive: boolean
  oauthProviders: IOAuthProvider[]
  jiraSettings?: IJiraSettings
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member',
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    isActive: { type: Boolean, default: true },
    oauthProviders: [
      {
        provider: { type: String, required: true },
        providerId: { type: String, required: true },
        accessToken: String,
        refreshToken: String,
      },
    ],
    jiraSettings: {
      type: {
        jiraBaseUrl: { type: String, required: true },
        jiraEmail: { type: String, required: true },
        jiraApiToken: { type: String, required: true },
      },
      default: null,
    },
  },
  { timestamps: true },
)

userSchema.index({ email: 1, orgId: 1 }, { unique: true })
userSchema.index({ username: 1, orgId: 1 }, { unique: true })

export const User = model<IUser>('User', userSchema)
