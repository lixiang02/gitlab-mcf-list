const schedule = require('node-schedule');
const service = require('../index')
console.log('scheduleJob Ready');

schedule.scheduleJob('0 0 1 * * * ', async function(){ 
  console.log('JOB START');
  await service.getList()
  console.log('JOB END');
});