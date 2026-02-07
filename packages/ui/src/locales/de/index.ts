import { de as vuetifyDe } from 'vuetify/locale'
import common from './common'
import nav from './nav'
import timesheet from './timesheet'
import admin from './admin'
import auth from './auth'
import validation from './validation'
import messages from './messages'
import errors from './errors'
import exportLocale from './export'

export default {
  $vuetify: vuetifyDe,
  common,
  nav,
  timesheet,
  admin,
  auth,
  export: exportLocale,
  validation,
  messages,
  errors,
}
