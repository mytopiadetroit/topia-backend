const Subscription = require('../models/Subscription')
const SubscriptionSettings = require('../models/SubscriptionSettings')
const User = require('../models/User')

const createSubscription = async (req, res) => {
  try {
    const { preferences, allergies, paymentMethodId, billingAddress, selectedProducts } = req.body
    const userId = req.user.id

    if (!billingAddress || !billingAddress.street || !billingAddress.city || !billingAddress.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Billing address is required. Please provide street, city, and ZIP code.'
      })
    }

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      })
    }

    const existingSubscription = await Subscription.findOne({ userId })
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      })
    }

    const settings = await SubscriptionSettings.findOne() || new SubscriptionSettings()
    
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    const processedProducts = []
    if (selectedProducts && selectedProducts.length > 0) {
      const Product = require('../models/Product')
      for (const productSelection of selectedProducts) {
        // Check if it's a variant or flavor selection
        if (productSelection.includes('-variant-')) {
          const [productId, , variantIndex] = productSelection.split('-')
          const product = await Product.findById(productId)
          if (product && product.variants && product.variants[parseInt(variantIndex)]) {
            const variant = product.variants[parseInt(variantIndex)]
            processedProducts.push({
              productId: product._id,
              productName: `${product.name} - ${variant.size.value}${variant.size.unit}`,
              productPrice: variant.price,
              type: 'variant',
              variantIndex: parseInt(variantIndex)
            })
          }
        } else if (productSelection.includes('-flavor-')) {
          const [productId, , flavorIndex] = productSelection.split('-')
          const product = await Product.findById(productId)
          if (product && product.flavors && product.flavors[parseInt(flavorIndex)]) {
            const flavor = product.flavors[parseInt(flavorIndex)]
            processedProducts.push({
              productId: product._id,
              productName: `${product.name} - ${flavor.name}`,
              productPrice: flavor.price,
              type: 'flavor',
              flavorIndex: parseInt(flavorIndex)
            })
          }
        } else {
          // Regular product
          const product = await Product.findById(productSelection)
          if (product) {
            processedProducts.push({
              productId: product._id,
              productName: product.name,
              productPrice: product.price,
              type: 'product'
            })
          }
        }
      }
    }

    const subscription = new Subscription({
      userId,
      monthlyPrice: settings.monthlyPrice || 100,
      boxValue: 200,
      billingAddress: {
        street: billingAddress.street,
        city: billingAddress.city,
        state: billingAddress.state,
        zipCode: billingAddress.zipCode,
        country: billingAddress.country || 'USA'
      },
      preferences: preferences || [],
      allergies: allergies || [],
      paymentMethodId,
      selectedProducts: processedProducts,
      nextBillingDate
    })

    await subscription.save()

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active',
      isTopiaCircleMember: true
    })

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    })
  }
}

const getSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const subscription = await Subscription.findOne({ userId })
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image')
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      })
    }

    res.json({
      success: true,
      data: subscription
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    })
  }
}

const updateSubscription = async (req, res) => {
  try {
    const { preferences, allergies, currentBoxItems, selectedProducts } = req.body
    const userId = req.user.id

    // Debug: Log the incoming data
    console.log('🔍 updateSubscription - Request body:', {
      preferences: preferences?.length || 0,
      allergies: allergies?.length || 0,
      currentBoxItems: currentBoxItems?.length || 0,
      selectedProducts: {
        type: typeof selectedProducts,
        isArray: Array.isArray(selectedProducts),
        length: selectedProducts?.length || 0,
        data: selectedProducts
      }
    })

    const subscription = await Subscription.findOne({ userId })
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    if (preferences) subscription.preferences = preferences
    if (allergies) subscription.allergies = allergies
    if (currentBoxItems) subscription.currentBoxItems = currentBoxItems
    
    // Handle selected products update (including variants and flavors)
    if (selectedProducts && Array.isArray(selectedProducts) && selectedProducts.length > 0) {
      const processedProducts = []
      const Product = require('../models/Product')
      
      for (const productSelection of selectedProducts) {
        // Ensure productSelection is a string
        if (typeof productSelection !== 'string') {
          console.warn('Invalid productSelection type:', typeof productSelection, productSelection)
          continue
        }
        
        // Check if it's a variant or flavor selection
        if (productSelection.includes('-variant-')) {
          const [productId, , variantIndex] = productSelection.split('-')
          const product = await Product.findById(productId)
          if (product && product.variants && product.variants[parseInt(variantIndex)]) {
            const variant = product.variants[parseInt(variantIndex)]
            processedProducts.push({
              productId: product._id,
              productName: `${product.name} - ${variant.size.value}${variant.size.unit}`,
              productPrice: variant.price,
              type: 'variant',
              variantIndex: parseInt(variantIndex)
            })
          }
        } else if (productSelection.includes('-flavor-')) {
          const [productId, , flavorIndex] = productSelection.split('-')
          const product = await Product.findById(productId)
          if (product && product.flavors && product.flavors[parseInt(flavorIndex)]) {
            const flavor = product.flavors[parseInt(flavorIndex)]
            processedProducts.push({
              productId: product._id,
              productName: `${product.name} - ${flavor.name}`,
              productPrice: flavor.price,
              type: 'flavor',
              flavorIndex: parseInt(flavorIndex)
            })
          }
        } else {
          // Regular product
          const product = await Product.findById(productSelection)
          if (product) {
            processedProducts.push({
              productId: product._id,
              productName: product.name,
              productPrice: product.price,
              type: 'product'
            })
          }
        }
      }
      subscription.selectedProducts = processedProducts
    }

    await subscription.save({ validateBeforeSave: false })

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    })
  }
}

const cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body
    const userId = req.user.id

    const subscription = await Subscription.findOne({ userId })
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    const subscriptionStartDate = new Date(subscription.startDate)
    const currentDate = new Date()
    const monthsDiff = (currentDate.getFullYear() - subscriptionStartDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - subscriptionStartDate.getMonth())

    const settings = await SubscriptionSettings.findOne() || new SubscriptionSettings()
    
    if (monthsDiff < settings.minimumSubscriptionMonths) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel subscription before ${settings.minimumSubscriptionMonths} months`
      })
    }

    subscription.status = 'cancelled'
    subscription.cancellationDate = new Date()
    subscription.cancellationReason = reason || 'User requested cancellation'
    await subscription.save()

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'cancelled',
      isTopiaCircleMember: false
    })

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    })
  }
}

const getSubscriptionSettings = async (req, res) => {
  try {
    let settings = await SubscriptionSettings.findOne()
    if (!settings) {
      settings = new SubscriptionSettings()
      await settings.save()
    }

    res.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Error fetching subscription settings:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription settings'
    })
  }
}

const updateSubscriptionSettings = async (req, res) => {
  try {
    const { monthlyPrice, flierImage, isActive, description, features, minimumSubscriptionMonths } = req.body

    let settings = await SubscriptionSettings.findOne()
    if (!settings) {
      settings = new SubscriptionSettings()
    }

    if (monthlyPrice !== undefined) settings.monthlyPrice = monthlyPrice
    if (flierImage !== undefined) settings.flierImage = flierImage
    if (isActive !== undefined) settings.isActive = isActive
    if (description !== undefined) settings.description = description
    if (features !== undefined) settings.features = features
    if (minimumSubscriptionMonths !== undefined) settings.minimumSubscriptionMonths = minimumSubscriptionMonths

    await settings.save()

    res.json({
      success: true,
      message: 'Subscription settings updated successfully',
      data: settings
    })
  } catch (error) {
    console.error('Error updating subscription settings:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription settings'
    })
  }
}

const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const query = {}
    
    if (status) {
      query.status = status
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Subscription.countDocuments(query)

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    })
  }
}

const updateSubscriptionAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { preferences, allergies, currentBoxItems } = req.body

    const updateData = {}
    if (preferences) updateData.preferences = preferences
    if (allergies) updateData.allergies = allergies
    if (currentBoxItems) updateData.currentBoxItems = currentBoxItems

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    })
  }
}

const adminUpgradeToTopiaCircle = async (req, res) => {
  try {
    const { userId } = req.params
    const { billingAddress, paymentNote } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (user.isTopiaCircleMember && user.subscriptionStatus === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already a Topia Circle member'
      })
    }

    const existingSubscription = await Subscription.findOne({ userId })
    
    const settings = await SubscriptionSettings.findOne() || new SubscriptionSettings()
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    if (existingSubscription) {
      existingSubscription.status = 'active'
      existingSubscription.nextBillingDate = nextBillingDate
      existingSubscription.billingAddress = billingAddress || existingSubscription.billingAddress
      existingSubscription.paymentNote = paymentNote || 'Upgraded by admin'
      if (!existingSubscription.paymentMethodId) {
        existingSubscription.paymentMethodId = 'admin_upgrade'
      }
      await existingSubscription.save()
    } else {
      await Subscription.create({
        userId,
        status: 'active',
        nextBillingDate,
        paymentMethodId: 'admin_upgrade',
        billingAddress: billingAddress || {
          street: 'N/A',
          city: 'N/A',
          state: 'N/A',
          zipCode: 'N/A'
        },
        paymentNote: paymentNote || 'Created by admin',
        preferences: [],
        allergies: [],
        selectedProducts: []
      })
    }

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active',
      isTopiaCircleMember: true
    })

    res.json({
      success: true,
      message: 'User upgraded to Topia Circle successfully'
    })
  } catch (error) {
    console.error('Error upgrading user:', error)
    res.status(500).json({
      success: false,
      message: 'Error upgrading user to Topia Circle',
      error: error.message
    })
  }
}

module.exports = {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  getAllSubscriptions,
  updateSubscriptionAdmin,
  adminUpgradeToTopiaCircle
}
const updateBillingDate = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { billingDayOfMonth, nextBillingDate } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (nextBillingDate) {
      const selectedDate = new Date(nextBillingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Billing date cannot be in the past'
        });
      }

      subscription.nextBillingDate = selectedDate;
      subscription.billingDayOfMonth = selectedDate.getDate();
    } else if (billingDayOfMonth) {
      if (billingDayOfMonth < 1 || billingDayOfMonth > 28) {
        return res.status(400).json({
          success: false,
          message: 'Billing day must be between 1 and 28'
        });
      }

      const nextBilling = new Date();
      nextBilling.setDate(billingDayOfMonth);
      if (nextBilling <= new Date()) {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }

      subscription.billingDayOfMonth = billingDayOfMonth;
      subscription.nextBillingDate = nextBilling;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either billingDayOfMonth or nextBillingDate is required'
      });
    }

    await subscription.save();

    const updatedSubscription = await Subscription.findById(subscriptionId)
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image');

    res.json({
      success: true,
      message: 'Billing date updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating billing date:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating billing date',
      error: error.message
    });
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required'
      });
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { paymentMethodId },
      { new: true, runValidators: false }
    )
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image');

    if (!updatedSubscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment method',
      error: error.message
    });
  }
};

const toggleSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { action } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    let updateData = {};
    
    if (action === 'pause') {
      updateData = {
        status: 'paused',
        pausedAt: new Date(),
        pausedBy: 'admin'
      };
      
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: 'paused'
      });
    } else if (action === 'activate') {
      updateData = {
        status: 'active',
        pausedAt: null,
        pausedBy: null
      };
      
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: 'active',
        isTopiaCircleMember: true
      });
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      updateData,
      { new: true, runValidators: false }
    )
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image');

    res.json({
      success: true,
      message: `Subscription ${action === 'pause' ? 'paused' : 'activated'} successfully`,
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error toggling subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription status',
      error: error.message
    });
  }
};

const updatePaymentInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { cardHolderName, cardLastFour, cardBrand, expiryMonth, expiryYear, billingZip } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.paymentInfo = {
      cardHolderName,
      cardLastFour,
      cardBrand,
      expiryMonth,
      expiryYear,
      billingZip
    };

    await subscription.save({ validateBeforeSave: false });

    const updatedSubscription = await Subscription.findById(id)
      .populate('userId', 'fullName email phone')
      .populate('selectedProducts.productId', 'name price image');

    res.json({
      success: true,
      message: 'Payment information updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment information',
      error: error.message
    });
  }
};

module.exports = {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  getAllSubscriptions,
  updateSubscriptionAdmin,
  adminUpgradeToTopiaCircle,
  updateBillingDate,
  updatePaymentMethod,
  toggleSubscriptionStatus,
  updatePaymentInfo
};
