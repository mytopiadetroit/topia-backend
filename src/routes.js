const authRoutes = require("@routes/authRoutes");
const productRoutes = require("./routes/productRoutes");

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
};
