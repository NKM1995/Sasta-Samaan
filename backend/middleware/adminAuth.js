require('dotenv').config(); // ensure env is loaded if middleware used standalone

module.exports = function adminAuth(req, res, next) {
  // Accept token either via custom header or Authorization: Bearer <token>
  const header = req.get('authorization') || '';
  const bearer = header.split(' ')[1];
  const token = (req.get('x-admin-token') || bearer || '').trim();

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};
