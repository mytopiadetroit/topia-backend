const authRoutes = require("@routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require('./routes/reviewRoutes');
const reviewTagRoutes = require('./routes/reviewTagRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const contactRoutes = require('./routes/contactRoutes');
const contentRoutes = require('./routes/contentRoutes');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/review-tags', reviewTagRoutes);
  app.use('/api/subscribers', subscriberRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/content', contentRoutes);

};
