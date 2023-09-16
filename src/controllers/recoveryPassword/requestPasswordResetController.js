const crypto = require('crypto');

const emailConfig = require('../../auth/emailConfig'); // Importa el módulo de configuración de correo
const connection = require('../../database/database');

async function requestPasswordResetController(req, res) {
    try {
        const { email } = req.body;

        // Verificar si el correo electrónico proporcionado está registrado
        const userQuery = 'SELECT * FROM users WHERE email = ?';
        const user = await new Promise((resolve, reject) => {
            connection.query(userQuery, [email], (err, results) => {
                if (err) {
                    console.error('Error querying the database:', err);
                    reject(err);
                }
                resolve(results[0]);
            });
        });

        if (!user) {
            return res.status(400).json({ error: 'El correo electrónico no está registrado' });
        }

        // Verificar si el correo electrónico está verificado
        if (!user.verified) {
            return res.status(400).json({ error: 'Correo no verificado' });
        }

        // Generar y almacenar un código de verificación único en la base de datos
        const verificationCode = crypto.randomBytes(6).toString('hex');
        const updateCodeQuery = 'UPDATE users SET verificationCode = ? WHERE email = ?';
        await new Promise((resolve, reject) => {
            connection.query(updateCodeQuery, [verificationCode, email], (err, result) => {
                if (err) {
                    console.error('Error updating verification code:', err);
                    reject(err);
                }
                resolve();
            });
        });

        // Enviar el código de verificación al correo del usuario
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

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Se ha enviado un código de verificación a tu correo electrónico' });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error al solicitar el cambio de contraseña. Por favor, inténtalo de nuevo más tarde.' });
    }

}

module.exports = {
    requestPasswordResetController,
};