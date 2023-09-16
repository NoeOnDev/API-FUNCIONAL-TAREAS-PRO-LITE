const bcrypt = require("bcrypt");

const emailConfig = require("../../auth/emailConfig");
const connection = require("../../database/database");

const {isStrongPassword} = require("../../utils/passwordUtils");

async function changePasswordController(req, res) {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        const transporter = emailConfig.transporter; // Importa el transporter

        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número' });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updatePasswordQuery = 'UPDATE users SET password = ?, verificationCode = NULL WHERE email = ?';
        await connection.query(updatePasswordQuery, [hashedPassword, email]);

        // Enviar correo electrónico de confirmación después de cambiar la contraseña
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

        await transporter.sendMail(mailOptions); // Utiliza el transporter

        res.status(200).json({ message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }

}

module.exports = {
    changePasswordController,
};