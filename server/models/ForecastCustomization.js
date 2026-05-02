
const mongoose = require('mongoose');

const forecastCustomizationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  events: [{
    type: {
      type: String,
      required: true,
      enum: [
        'retirement', 'home_purchase', 'home_sale', 'child', 
        'college', 'windfall', 'additional_income', 'equity', 'custom'
      ]
    },
    enabled: { type: Boolean, default: true },
    details: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  customData: {
    portfolioGrowth: { type: Number, default: 0.05 }, // 5% default
    annualIncome: { type: Number, default: null },
    monthlyExpenses: { type: Number, default: null },
    liabilities: { type: Number, default: 0 },
    birthDate: { type: Date, default: null },
    lifeExpectancy: { type: Number, default: 85 },
    netWorthTarget: { type: Number, default: null },
    taxFilingStatus: { 
      type: String, 
      default: 'single',
      enum: ['single', 'married', 'head_of_household'] 
    },
    location: { type: String, default: 'US' },
    dependents: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

forecastCustomizationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('ForecastCustomization', forecastCustomizationSchema);
