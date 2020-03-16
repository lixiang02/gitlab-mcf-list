const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')

// schedule
require('./src/lib/schedule')

const index = require('./routes/index')
const users = require('./routes/users')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(async (ctx, next) => {
  ctx.params = Object.assign({}, ctx.request.body, ctx.query, ctx.params)
  console.log('params -> ', ctx.params)
  await next()
})

app.use(async (ctx, next) => {

  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Content-Type", "application/json;charset=utf-8");
  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT,OPTIONS");
  ctx.set("Access-Control-Allow-Headers", "content-type");
  if (ctx.request.method === 'OPTIONS') {
    ctx.status = 200   
  } else {
    await next();
  }
})


// return
app.use(async (ctx, next) => {
  try {
    ctx.body = {
      code: 0,
      message: 'success',
      success: true,
      data: await next()
    };
  } catch (error) {
    ctx.body = {
      code: 1,
      message: error.message,
      success: false,
      data: null
    }
  }
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
