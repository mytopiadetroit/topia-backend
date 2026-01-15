require('dotenv').config()
require('module-alias/register')
const app = require('./app')
const { scheduleBirthdaySMS } = require('./utils/smsCronJobs')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  
  // Initialize SMS cron jobs
  scheduleBirthdaySMS()
})
