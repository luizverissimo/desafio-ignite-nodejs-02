/* eslint-disable camelcase */
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const stringToValidDate = z.coerce.date().transform((dateString, ctx) => {
      const date = new Date(dateString)
      if (!z.date().safeParse(date).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_date,
        })
      }
      return date.toISOString()
    })
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      date_time: stringToValidDate,
      is_on_diet: z.boolean(),
    })

    const { name, description, date_time, is_on_diet } =
      createMealBodySchema.parse(request.body)
    let { sessionId } = request.cookies

    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      date_time,
      is_on_diet,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { id } = request.params
      const stringToValidDate = z.coerce
        .date()
        .transform((dateString, ctx) => {
          const date = new Date(dateString)
          if (!z.date().safeParse(date).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.invalid_date,
            })
          }
          return date.toISOString()
        })
        .optional()

      const createMealBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        date_time: stringToValidDate,
        is_on_diet: z.boolean().optional(),
      })

      const dataUpate = createMealBodySchema.parse(request.body)
      const { sessionId } = request.cookies

      await knex('meals').where({ session_id: sessionId, id }).update(dataUpate)

      return reply.status(201).send()
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { id } = request.params
      const { sessionId } = request.cookies

      await knex('meals').where({ session_id: sessionId, id }).delete()

      return reply.status(201).send()
    },
  )

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const meals = await knex('meals')
        .where({ session_id: sessionId })
        .select()

      return meals
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { id } = request.params
      const { sessionId } = request.cookies

      const meal = await knex('meals')
        .where({ session_id: sessionId, id })
        .select()
        .first()

      return meal
    },
  )

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const { total } = await knex('meals')
        .where({ session_id: sessionId })
        .count('id as total')
        .first()

      const { totalDietMeals } = await knex('meals')
        .where({ session_id: sessionId, is_on_diet: true })
        .count('id as totalDietMeals')
        .first()

      const { totalNonDietMeals } = await knex('meals')
        .where({ session_id: sessionId, is_on_diet: false })
        .count('id as totalNonDietMeals')
        .first()

      const meals = await knex('meals')
        .where({ session_id: sessionId })
        .select()

      const sequencesOnDiet = []
      let counter = 0
      meals.forEach((meal, i) => {
        if (!meal.is_on_diet || i === meals.length - 1) {
          if (counter > 0) {
            sequencesOnDiet.push(counter)
            counter = 0
          }
        } else {
          counter++
        }
      })

      const sequenceOnDiet = sequencesOnDiet.reverse()
      return {
        total,
        totalDietMeals,
        totalNonDietMeals,
        maxSequneceOnDiet: sequenceOnDiet[0],
      }
    },
  )
}
