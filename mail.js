const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "mccmrunal@gmail.com",  // Replace with your email
        pass: "crcr mgvv lmxb qtnj",
        },
});

function sendEmail(subject, message) {
    const mailOptions = {
        from: "mccmrunal@gmail.com",
        to: ["mccmrunal@gmail.com","shantanuborgamwar@gmail.com"], // Replace with your recipient's email
        subject: subject,
        text: message,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error("❌ Email Error:", error);
        } else {
            console.log(`📧 Email Sent: ${info.response}`);
        }
    });
}

module.exports = {sendEmail}