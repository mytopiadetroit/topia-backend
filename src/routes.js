const authRoutes = require("@routes/authRoutes");


module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  
};
