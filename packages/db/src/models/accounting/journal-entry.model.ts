import { Schema, model, type Document, type Types } from 'mongoose'

export type JournalEntryStatus = 'draft' | 'posted' | 'voided'

export interface IJournalEntryLine {
  accountId: Types.ObjectId
  description?: string
  debit: number
  credit: number
}

export interface IJournalEntry extends Document {
  entryNumber: string
  date: Date
  description: string
  lines: IJournalEntryLine[]
  status: JournalEntryStatus
  reference?: string
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  postedAt?: Date
  voidedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const journalEntryLineSchema = new Schema<IJournalEntryLine>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    description: { type: String, default: null },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false },
)

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    entryNumber: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    lines: [journalEntryLineSchema],
    status: {
      type: String,
      enum: ['draft', 'posted', 'voided'],
      default: 'draft',
    },
    reference: { type: String, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

journalEntrySchema.index({ entryNumber: 1, orgId: 1 }, { unique: true })
journalEntrySchema.index({ status: 1, orgId: 1 })
journalEntrySchema.index({ date: 1, orgId: 1 })

export const JournalEntry = model<IJournalEntry>('JournalEntry', journalEntrySchema)
