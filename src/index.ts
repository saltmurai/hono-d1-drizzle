import { Hono } from 'hono'
import { Bindings } from './config/cloudflare'

const app = new Hono<{
  Bindings: Bindings
}>()


app.get('/', (c) => {
  return c.json({
    message: "ALOHA"
  })
})

export default app
