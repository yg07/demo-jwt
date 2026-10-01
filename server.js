require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Раздача статики
app.use(express.static(path.join(__dirname, 'public')));


// API
app.use('/api/auth', authRoutes);
app.use('/api/applications', appRoutes);
app.use('/api/admin', adminRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server: http://localhost:${process.env.PORT || 3000}`);
});
