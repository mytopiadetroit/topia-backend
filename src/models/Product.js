const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: null,
    },
    stock: {
      type: Number,
      default: null,
      min: [0, 'Stock cannot be negative'],
    },
    short_description: {
      type: String,
    },
    description: {
      main: {
        type: String,
        required: [true, 'Please provide a main description'],
      },
      details: {
        type: String,
        required: [true, 'Please provide detailed description'],
      },
    },
    images: {
      type: [String],
      required: [true, 'Please provide at least one product image'],
    },
    imageAltName: {
      type: String,
    },

    tags: {
      type: [String],
      default: [],
    },
    reviewTags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReviewTag',
        default: [],
      },
    ],
    intensity: {
      type: Number,
      min: [1, 'Intensity must be at least 1'],
      max: [10, 'Intensity cannot exceed 10']
      // Made intensity optional by removing the required validation
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'productCategory',
      required: [true, 'Please provide a category'],
    },
    primaryUse: {
      type: String,
      required: [true, 'Please provide primary use'],
      enum: ['therapeutic', 'functional'],
    },
    hasStock: {
      type: Boolean,
      default: true,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    // Product variants for different sizes with individual pricing
    // Allergen information
    allergenInfo: {
      hasAllergens: {
        type: Boolean,
        default: false
      },
      allergenImages: {
        type: [String],
        default: []
      },
      allergenImage: {
        type: String,
        default: ''
      },
      tooltipText: {
        type: String,
        default: 'This product may contain allergens. Please check with staff before consuming.'
      }
    },
    variants: [
      {
        size: {
          value: {
            type: Number,
            required: true,
          },
          unit: {
            type: String,
            default: 'grams',
            enum: ['grams', 'kg', 'ml', 'liters'],
          },
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Variant price cannot be negative'],
        },
        stock: {
          type: Number,
          default: 0,
          min: [0, 'Variant stock cannot be negative'],
        },
        sku: {
          type: String,
          trim: true,
        },
      },
    ],
    // Flavors available for this product with individual pricing and stock (optional)
    flavors: [
      {
        name: {
          type: String,
          required: [true, 'Flavor name is required'],
          trim: true,
        },
        price: {
          type: Number,
          required: [true, 'Flavor price is required'],
          min: [0, 'Flavor price cannot be negative'],
        },
        stock: {
          type: Number,
          required: [true, 'Flavor stock is required'],
          min: [0, 'Stock cannot be negative'],
          default: 0
        },
        sku: {
          type: String,
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: true
        }
      },
    ],
    // Flag to determine if product uses variants
    hasVariants: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('Product', ProductSchema)
