/**
 * Vercel Serverless Function Entrypoint
 * ورسل سرورلیس ہینڈلر برائے AI بہشتی زیور
 */

const app = require('../server');

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Vercel Serverless Invocation Crash:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Serverless invocation error'
    });
  }
};
