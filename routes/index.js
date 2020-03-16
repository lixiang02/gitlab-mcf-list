const router = require('koa-router')()
const server = require('../src')

router.get('/', async (ctx, next) => {
  ctx.body = 'koa2 string'
})

router.get('/list', server.getList.bind(server))

module.exports = router