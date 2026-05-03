const mongoose = require('mongoose');

const savedReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  tab: {
    type: String,
    required: true,
  },
  viewBy: {
    type: String,
    required: true,
  },
  dateFrom: {
    type: String,
    required: true,
  },
  dateTo: {
    type: String,
    required: true,
  },
  showIncome: {
    type: Boolean,
    default: true,
  },
  showExpense: {
    type: Boolean,
    default: true,
  },
  showNetTrend: {
    type: Boolean,
    default: false,
  },
  selectedMonthKey: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('SavedReport', savedReportSchema);
