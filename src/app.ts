import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { mealsRoutes } from './routes/meals.routes'

export const app = fastify()

app.register(fastifyCookie)
app.register(mealsRoutes, {
  prefix: 'meals',
})
