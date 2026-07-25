import { Hono } from 'hono';

const app = new Hono()

app.get('/', (c) => c.text('Hello Bun'))
app.get('/jobs', (c) => c.json({body: [{id: 1}, {id: 2}, {id: 3},]}), 200)

export default {
  port: 3000,
  fetch: app.fetch,
}
console.log(`Server Running!`);
