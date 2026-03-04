const ejs = require('ejs');
const path = require('path');
const transporter = require('../config/mailer');

const sendEmail = async (to, subject, template, data = {}) => {
    try {
        const templatePath = path.join(__dirname, '../views/emails', `${template}.ejs`);
        const html = await ejs.renderFile(templatePath, data);

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            html,
        });

        console.log(`Email sent to ${to} [${template}]`);
    } catch (error) {
        console.error(`Email error [${template}]:`, error.message);
    }
};

module.exports = sendEmail;