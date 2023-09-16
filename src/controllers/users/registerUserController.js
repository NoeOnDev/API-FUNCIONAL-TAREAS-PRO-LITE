const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');

const { isStrongPassword } = require('../../utils/passwordUtils')

const emailConfig = require('../../auth/emailConfig'); // Importa el módulo de configuración de correo
const connection = require('../../database/database'); // Importa la conexión a la base de datos


async function registerUserController(req, res) {
    try {
        const {email, username, password} = req.body;
        const transporter = emailConfig.transporter;

        if (!email || !username || !password) {
            return res.status(400).json({error: 'Por favor complete todos los campos requeridos antes de registrarse'});
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({error: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número'});
        }

        const allowedDomains = [
            'gmail.com',
            'yahoo.com',
            'hotmail.com',
            'outlook.com',
            'ids.upchiapas.edu.mx',
            'catolica.edu.sv'
        ];

        const emailDomain = email.split('@')[1]; // Obtener el dominio del correo electrónico

        if (!allowedDomains.includes(emailDomain)) {
            return res.status(400).json({error: 'Correo de dominio no permitido'});
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({error: 'Ingrese un email válido'});
        }

        // Verificar si ya existe un usuario con el correo proporcionado
        const existingUserQuery = 'SELECT * FROM users WHERE email = ?';
        const results = await new Promise((resolve, reject) => {
            connection.query(existingUserQuery, [email], (err, results) => {
                if (err) {
                    console.error('Error querying the database:', err);
                    return reject(err);
                }
                resolve(results);
            });
        });

        if (results.length > 0) {
            if (results[0].verified) {
                return res.status(400).json({error: 'Este correo ya está registrado y verificado'});
            } else {
                // El correo existe pero no está verificado
                // Genera nuevo token
                const verificationToken = crypto.randomBytes(32).toString('hex');

                // Hash de la contraseña
                const salt = await new Promise((resolve, reject) => {
                    bcrypt.genSalt(10, (err, salt) => {
                        if (err) {
                            console.error('Error generating salt:', err);
                            return reject(err);
                        }
                        resolve(salt);
                    });
                });

                const hashedPassword = await new Promise((resolve, reject) => {
                    bcrypt.hash(password, salt, (err, hashedPassword) => {
                        if (err) {
                            console.error('Error hashing password:', err);
                            return reject(err);
                        }
                        resolve(hashedPassword);
                    });
                });

                // Actualiza el registro existente con nuevo token, username y contraseña
                const updateQuery = 'UPDATE users SET username = ?, password = ?, verificationToken = ? WHERE email = ?';
                const updateValues = [username, hashedPassword, verificationToken, email];

                await new Promise((resolve, reject) => {
                    connection.query(updateQuery, updateValues, (err, updateResult) => {
                        if (err) {
                            console.error('Error updating user:', err);
                            return reject(err);
                        }
                        resolve();
                    });
                });

                // Envía email con el nuevo token
                async function sendEmail() {
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
                            transporter.sendMail(mailOptions, (err, info) => {
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

                // Llama a la función sendEmail para enviar el correo
                try {
                    await sendEmail();
                } catch (error) {
                    console.error('Error al enviar el correo:', error);
                    return res.status(500).json({error: 'Ocurrió un error al enviar el correo de verificación.'});
                }

                return res.status(200).json({message: 'Su registro ha sido actualizado con éxito'});
            }
        }

        // Si el correo no existe, crea un nuevo registro
        // Genera un nuevo token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Hash de la contraseña
        const salt = await new Promise((resolve, reject) => {
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    console.error('Error generating salt:', err);
                    return reject(err);
                }
                resolve(salt);
            });
        });

        const hashedPassword = await new Promise((resolve, reject) => {
            bcrypt.hash(password, salt, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return reject(err);
                }
                resolve(hashedPassword);
            });
        });

        // Inserta un nuevo registro en la base de datos
        const insertQuery = 'INSERT INTO users (email, username, password, verificationToken, verified) VALUES (?, ?, ?, ?, ?)';
        const insertValues = [email, username, hashedPassword, verificationToken, false];

        await new Promise((resolve, reject) => {
            connection.query(insertQuery, insertValues, (err, insertResult) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return reject(err);
                }
                resolve();
            });
        });

        // Envía el correo con el token de verificación
        async function sendEmail() {
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
                    transporter.sendMail(mailOptions, (err, info) => {
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

        // Llama a la función sendEmail para enviar el correo
        try {
            await sendEmail();
        } catch (error) {
            console.error('Error al enviar el correo:', error);
            return res.status(500).json({error: 'Ocurrió un error al enviar el correo de verificación.'});
        }

        res.status(200).json({message: 'Su registro ha sido completado'});
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({error: 'Ocurrió un error durante el proceso de registro. Por favor, inténtelo de nuevo más tarde.'});
    }
}

module.exports = {
    registerUserController,
};