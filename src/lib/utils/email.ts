import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

// Create reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

// Email verification template with OTP
export async function sendVerificationEmail(email: string, otp: string) {
  const mailOptions = {
    from: `"AuthFlow" <${env.GMAIL_USER}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Verify your email address</h2>
        <p>Thank you for registering with AuthFlow. Please use the verification code below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f3f4f6; border: 2px solid #4f46e5; border-radius: 8px; padding: 20px; display: inline-block;">
            <h3 style="color: #4f46e5; margin: 0; font-size: 24px; letter-spacing: 4px;">${otp}</h3>
          </div>
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${env.PUBLIC_APP_URL || env.AUTH_URL}/auth/verify-otp" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Enter Verification Code
          </a>
        </p>
        <p><strong>Important:</strong></p>
        <ul>
          <li>This code will expire in 10 minutes</li>
          <li>If you didn't create an account, you can safely ignore this email</li>
          <li>Never share this code with anyone</li>
        </ul>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

// Password reset template
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${env.PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"AuthFlow" <${env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Reset your password</h2>
        <p>You requested a password reset for your AuthFlow account. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}