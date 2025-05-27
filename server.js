require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'https://mailerfront.netlify.app',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(bodyParser.json());

const PORT = 4040;
const MONGO_URI = 'mongodb+srv://bhskrbnsl:FbVrkfLSDTHHwrTh@cluster0.zhpfit1.mongodb.net/';
const EMAIL_USER = 'bhskrbnsl@gmail.com';
const EMAIL_PASS = 'xkny picq gehg nukx';
const BASE_URL = `http://localhost:${PORT}`;

mongoose.connect(MONGO_URI)
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running at ${BASE_URL}`));
}).catch(err => {
  console.error('MongoDB connection error:', err.message);
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String ,
  password: String,
  verified: { type: Boolean, default: false }
});

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: String,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const User = mongoose.model('emails', userSchema);
const VerificationToken = mongoose.model('users', verificationSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = uuidv4();
    await VerificationToken.create({
      userId: user._id,
      token   
    });
    const link = `${BASE_URL}/verify/${token}`;
    await transporter.sendMail({
      from: `"Mailer App" <${EMAIL_USER}>`,
      to: email,
      subject: 'Please verify your email',
      html: `<h3>Hello ${name},</h3><p>Click <a href="${link}">here</a> to verify your email.</p>`
    });

    res.status(201).json({ message: 'Registered! Check your email for verification.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/verify/:token', async (req, res) => {
  try {
    const tokenDoc = await VerificationToken.findOne({ token: req.params.token });

    if (!tokenDoc) return res.status(400).send('Invalid or expired verification link.');

    tokenDoc.verified = true;
    await tokenDoc.save();

    await User.findByIdAndUpdate(tokenDoc.userId, { verified: true });

    res.send('Email verified successfully!');
  } catch (err) {
    res.status(500).send('Something went wrong. Try again later.');
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    const usersWithStatus = users.map(user => ({
      name: user.name,
      email: user.email,
      verified: user.verified
    }));
    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


