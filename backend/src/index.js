require('dotenv').config();
const express = require('express');
const cors = require('cors');

const attendanceRoutes = require('./routes/attendance');
const summaryRoutes = require('./routes/summary');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'https://mini-hcm-69b15.web.app',
    credentials: true
}));
app.use(express.json());

app.use('/api/attendance', attendanceRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HCM backend running on port ${PORT}`));
