const emailConfig = require("../../auth/email/emailConfig");

async function sendPasswordChangeConfirmationEmail(email) {
    try {
        const transporter = emailConfig.transporter;
        const mailOptions = {
            from: '"TareasProLiteOficial" <myemail@mail.com>',
            to: email,
            subject: 'Cambio de Contraseña Exitoso',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">¡Cambio de Contraseña Exitoso!</h2>
                    <p style="font-size: 16px;">Hola,</p>
                    <p style="font-size: 16px;">Queremos informarte que tu contraseña ha sido cambiada con éxito en nuestro sistema.</p>
                    <p style="font-size: 16px;">Si no reconoces esta actividad, por favor contáctanos de inmediato.</p>
                    <p style="font-size: 16px;">¡Gracias por confiar en nosotros!</p>
                    <p style="font-size: 16px;">Atentamente,<br>El equipo de Tareas Pro Lite</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

module.exports = {
    sendPasswordChangeConfirmationEmail,
};