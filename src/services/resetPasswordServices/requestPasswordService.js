const emailConfig = require("../../auth/email/emailConfig");

async function sendVerificationCodeEmail(email, verificationCode) {
    try {
        const transporter = emailConfig.transporter;
        const mailOptions = {
            from: '"TareasProLiteOficial" <myemail@mail.com>',
            to: email,
            subject: 'Código de Verificación para Cambio de Contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">Código de Verificación</h2>
                    <p style="font-size: 16px;">Estimado usuario,</p>
                    <p style="font-size: 16px;">Has solicitado un cambio de contraseña en Tareas Pro Lite. Utiliza el siguiente código de verificación para continuar con el proceso:</p>
                    <p style="font-size: 24px; font-weight: bold; color: #007bff;">${verificationCode}</p>
                    <p style="font-size: 16px;">Este código de verificación es válido por un tiempo limitado.</p>
                    <p style="font-size: 16px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
                    <p style="font-size: 16px;">Agradecemos tu confianza en Tareas Pro Lite y estamos aquí para ayudarte en cada paso.</p>
                    <p style="font-size: 16px;">Atentamente,<br>El equipo de Tareas Pro Lite</p>
                </div>
            `,
        };

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Error sending email:', err);
                    reject(err);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

module.exports = {
    sendVerificationCodeEmail,
};
