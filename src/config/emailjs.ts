// EmailJS Configuration
// To set up EmailJS:
// 1. Sign up at https://www.emailjs.com/
// 2. Create an email service (Gmail, Outlook, etc.)
// 3. Create an email template with these variables:
//    - {{to_email}}
//    - {{from_name}}
//    - {{from_email}}
//    - {{subject}}
//    - {{message}}
//    - {{attachment}} (base64 encoded PDF)
//    - {{attachment_name}}
// 4. Get your Service ID, Template ID, and Public Key from EmailJS dashboard
// 5. Update the values below

export const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', // Replace with your EmailJS template ID
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY', // Replace with your EmailJS public key
};
