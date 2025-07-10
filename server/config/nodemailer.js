const nodemailer = require('nodemailer');

let transporter;

if (process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.MAILGUN_SMTP_SERVER,
    port: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10),
    secure: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.MAILGUN_SMTP_LOGIN,
      pass: process.env.MAILGUN_SMTP_PASSWORD,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('Nodemailer transporter verification error:', error);
    } else {
      console.log('Nodemailer transporter is ready to send emails.');
    }
  });
} else {
  console.warn('Mailgun SMTP credentials not fully set in .env. Email sending will be disabled.');
}

module.exports = transporter;
