const emailConfig = require('../../auth/email/emailConfig');

async function sendVerificationEmail(email, verificationToken) {
    try {
        await emailConfig.getAccessTokenIfNeeded();

        const mailOptions = {
            from: '"TareasProLiteOficial" <myemail@mail.com>',
            to: email,
            subject: 'Verificación de Correo para Tareas Pro Lite',
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #333;">¡Bienvenido a Tareas Pro Lite!</h2>
                <p style="font-size: 16px;">Estás a punto de formar parte de Tareas Pro Lite, la plataforma diseñada para optimizar tus tareas y proyectos. Recibiste este correo porque alguien registró esta dirección de correo electrónico en nuestra plataforma.</p>
                <p style="font-size: 16px;">Si reconoces este registro, te invitamos a seguir el enlace de abajo para verificar tu dirección de correo electrónico y completar tu registro. Si no reconoces este registro, por favor ignora este correo electrónico.</p>
                <p style="font-size: 16px;">Verifica tu cuenta haciendo clic en el siguiente enlace:</p>
                <p style="font-size: 16px;"><a href="http://localhost:3000/verify?token=${verificationToken}" target="_blank" rel="noopener noreferrer">Verificar mi cuenta</a></p>
                <p style="font-size: 16px;">Si no solicitaste este registro, puedes ignorar este correo. Tu cuenta no se activará hasta que completes la verificación.</p>
                <p style="font-size: 16px;">Si necesitas ayuda o tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:tareasproliteoficial@gmail.com">tareasproliteoficial@gmail.com</a>. Estamos aquí para asistirte en cada paso.</p>
                <p style="font-size: 16px;">¡Gracias por unirte a Tareas Pro Lite!</p>
                <p style="font-size: 16px;">Atentamente,<br>El equipo de Tareas Pro Lite</p>
            </div>
            `
        };

        await new Promise((resolve, reject) => {
            // Luego, utiliza el transporte para enviar el correo electrónico
            emailConfig.transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Error sending email:', err);
                    return reject(err);
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
    sendVerificationEmail,
};
