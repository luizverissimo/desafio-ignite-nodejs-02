// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    transactions: {
      id: string
      name: string
      description: string
      date_time: Date
      is_on_diet: boolean
      created_at: string
      session_id?: string
    }
  }
}
