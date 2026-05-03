const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getSummary,
  getForecast,
  setBudget,
  getBudget,
  getSpendingSettings,
  saveSpendingSettings,
  getForecastCustomizations,
  saveForecastCustomizations,
  resetForecastCustomizations,
  exportDashboardData,
  getSavedReports,
  saveReport,
  deleteSavedReport,
} = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/authMiddleware');
const { requirePro } = require('../middleware/requirePro');

router.get('/', protect, getDashboard);
router.get('/summary', protect, getSummary);
router.get('/forecast', protect, requirePro, getForecast);
router.post('/budget', protect, setBudget);
router.get('/budget', protect, getBudget);
router.get('/spending-settings', protect, getSpendingSettings);
router.post('/spending-settings', protect, saveSpendingSettings);
router.post('/export', protect, requirePro, exportDashboardData);

// New forecast customization endpoints
router.get('/forecast/customizations', protect, getForecastCustomizations);
router.post('/forecast/customizations', protect, saveForecastCustomizations);
router.post('/forecast/customizations/reset', protect, resetForecastCustomizations);

// Reports routes
router.get('/reports', protect, getSavedReports);
router.post('/reports', protect, saveReport);
router.delete('/reports/:id', protect, deleteSavedReport);

module.exports = router;
