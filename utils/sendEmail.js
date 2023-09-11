import nodemailer from 'nodemailer';
import nodemailerConfig from './nodemailerConfig.js';

const sendEmail = async({ to, subject, html }) => {
    let testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport(nodemailerConfig);

    return transporter.sendMail({
        from: '"Joan" <joan_tta@live.com.sg>',
        // to: 'bar@example.com', //list of receivers
        // subject: 'Hello World',
        // html: '<h2>Testing emails with Node.js & ethereal</h2>'
        to,
        subject,
        html,
    })

    // res.json(info)
}

export default sendEmail