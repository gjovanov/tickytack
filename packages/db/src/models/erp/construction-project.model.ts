import { Schema, model, type Document, type Types } from 'mongoose'

export type ConstructionProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface IConstructionPhase {
  name: string
  startDate: Date
  endDate: Date
  status: string
  budgetAllocated: number
  budgetSpent: number
}

export interface IConstructionTask {
  name: string
  phaseIndex: number
  assigneeId?: Types.ObjectId
  status: string
  dueDate?: Date
}

export interface IConstructionTeamMember {
  employeeId: Types.ObjectId
  role: string
}

export interface IConstructionMaterial {
  productId: Types.ObjectId
  quantity: number
  unitCost: number
}

export interface IConstructionProject extends Document {
  name: string
  code: string
  description?: string
  clientContactId?: Types.ObjectId
  status: ConstructionProjectStatus
  startDate: Date
  endDate: Date
  totalBudget: number
  budgetSpent: number
  budgetRemaining: number
  margin: number
  phases: IConstructionPhase[]
  tasks: IConstructionTask[]
  team: IConstructionTeamMember[]
  materials: IConstructionMaterial[]
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const constructionPhaseSchema = new Schema<IConstructionPhase>(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, default: 'planned' },
    budgetAllocated: { type: Number, default: 0 },
    budgetSpent: { type: Number, default: 0 },
  },
  { _id: false },
)

const constructionTaskSchema = new Schema<IConstructionTask>(
  {
    name: { type: String, required: true },
    phaseIndex: { type: Number, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: { type: String, default: 'pending' },
    dueDate: { type: Date, default: null },
  },
  { _id: false },
)

const constructionTeamMemberSchema = new Schema<IConstructionTeamMember>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    role: { type: String, required: true },
  },
  { _id: false },
)

const constructionMaterialSchema = new Schema<IConstructionMaterial>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
  },
  { _id: false },
)

const constructionProjectSchema = new Schema<IConstructionProject>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, default: null },
    clientContactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalBudget: { type: Number, default: 0 },
    budgetSpent: { type: Number, default: 0 },
    budgetRemaining: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    phases: [constructionPhaseSchema],
    tasks: [constructionTaskSchema],
    team: [constructionTeamMemberSchema],
    materials: [constructionMaterialSchema],
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

constructionProjectSchema.index({ code: 1, orgId: 1 }, { unique: true })
constructionProjectSchema.index({ status: 1, orgId: 1 })

export const ConstructionProject = model<IConstructionProject>('ConstructionProject', constructionProjectSchema)
