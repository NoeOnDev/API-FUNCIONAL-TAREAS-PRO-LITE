const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const bcrypt = require('bcrypt');


const connection = require('./database');
const emailConfig = require('./emailConfig');
const middleWare = require('./middleWare');


const isStrongPassword = (password) => {
    // La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPasswordRegex.test(password);
};

app.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    const transporter = emailConfig.transporter;

    try {
        if (!email || !username || !password) {
            return res.status(400).json({ error: 'Por favor complete todos los campos requeridos antes de registrarse' });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número' });
        }

        const allowedDomains = [
            'gmail.com',
            'yahoo.com',
            'hotmail.com',
            'outlook.com',
            'ids.upchiapas.edu.mx'
        ];

        const emailDomain = email.split('@')[1]; // Obtener el dominio del correo electrónico

        if (!allowedDomains.includes(emailDomain)) {
            return res.status(400).json({ error: 'Correo de dominio no permitido' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Ingrese un email válido' });
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

        if (results.length > 0 && results[0].verified) {
            return res.status(400).json({ error: 'Este correo ya está registrado y verificado' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

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
            return res.status(500).json({ error: 'Ocurrió un error al enviar el correo de verificación.' });
        }

        // Generar un salt para el hash
        const salt = await new Promise((resolve, reject) => {
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    console.error('Error generating salt:', err);
                    return reject(err);
                }
                resolve(salt);
            });
        });

        // Hash de la contraseña
        const hashedPassword = await new Promise((resolve, reject) => {
            bcrypt.hash(password, salt, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return reject(err);
                }
                resolve(hashedPassword);
            });
        });

        // Resto del código para insertar el usuario en la base de datos
        const query = `INSERT INTO users (email, username, password, verificationToken, verified) VALUES (?, ?, ?, ?, ?)`;
        const values = [email, username, hashedPassword, verificationToken, false];

        await new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
                if (err) {
                    console.error('Error saving user to database:', err);
                    return reject(err);
                }
                res.status(200).json({ message: 'Su registro ha sido completado' });
            });
        });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error durante el proceso de registro. Por favor, inténtelo de nuevo más tarde.' });
    }
});


//Verificar al usuario a traves de token que se le envia al correo
app.get('/verify', async (req, res) => {
    const { token } = req.query;

    try {
        // Query para verificar el token y actualizar el estado de verificación
        const updateQuery = 'UPDATE users SET verified = true WHERE verificationToken = ?';
        const result = await new Promise((resolve, reject) => {
            connection.query(updateQuery, [token], (err, result) => {
                if (err) {
                    console.error('Error verifying email:', err);
                    reject(err);
                }
                resolve(result);
            });
        });

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Token de verificación no válido' });
        }

        // Mensaje personalizado de verificación
        const verificationMessage = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificación de Correo - Tareas Pro Lite</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .container {
                        max-width: 600px;
                        padding: 20px;
                        background-color: #ffffff;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        border-radius: 10px;
                        text-align: center;
                    }
                    h1 {
                        color: #333;
                        font-size: 24px;
                        margin-bottom: 10px;
                    }
                    p {
                        color: #555;
                        font-size: 16px;
                        line-height: 1.5;
                        margin-bottom: 20px;
                    }
                    a {
                        color: #007bff;
                        text-decoration: none;
                        font-weight: bold;
                    }
                    .footer {
                        color: #777;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>¡Felicidades, tu correo está verificado!</h1>
                    <p>Bienvenido a Tareas Pro Lite, la plataforma de gestión de tareas y proyectos diseñada para mejorar la eficiencia y colaboración en tu equipo. Estamos emocionados de tenerte a bordo y listos para ayudarte a tener un control más efectivo de tus tareas diarias.</p>
                    <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte a través del correo electrónico <a href="mailto:tareasproliteoficial@gmail.com">tareasproliteoficial@gmail.com</a>. Estamos aquí para asistirte en cada paso del camino.</p>
                    <p>¡Gracias por unirte a nosotros y bienvenido nuevamente a Tareas Pro Lite!</p>
                    <p class="footer">Atentamente,<br>El equipo de Tareas Pro Lite</p>
                </div>
            </body>
            </html>
        `;

        res.send(verificationMessage);
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error durante la verificación de correo. Por favor, inténtelo de nuevo más tarde.' });
    }
});

//Inicio de sesión para los usuarios
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Consultar la base de datos para obtener el usuario por su correo electrónico
        const query = 'SELECT * FROM users WHERE email = ?';
        const results = await new Promise((resolve, reject) => {
            connection.query(query, [email], (err, results) => {
                if (err) {
                    console.error('Error querying the database:', err);
                    reject(err);
                }
                resolve(results);
            });
        });

        if (results.length === 0) {
            return res.status(401).json({ error: 'No hemos podido autenticar su acceso' });
        }

        const user = results[0];

        if (!user.verified) {
            return res.status(401).json({ error: 'Por favor, verifique su cuenta antes de iniciar sesión' });
        }

        // Comparar la contraseña ingresada con el hash almacenado en la base de datos
        const isMatch = await new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (compareErr, isMatch) => {
                if (compareErr) {
                    console.error('Error comparing passwords:', compareErr);
                    reject(compareErr);
                }
                resolve(isMatch);
            });
        });

        if (!isMatch) {
            return res.status(401).json({ error: 'No hemos podido autenticar su acceso' });
        }

        // Generar un token y agregarlo a la respuesta
        const token = middleWare.generateToken(user.id);
        res.status(200).json({ message: 'Datos de acceso validados satisfactoriamente', token });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error durante el proceso de inicio de sesión. Por favor, inténtelo de nuevo más tarde.' });
    }
});

function generateVerificationCode() {
    const length = 6; // Longitud del código de verificación
    const characters = '0123456789'; // Caracteres permitidos
    let code = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}

app.post('/solicitar-cambio-contrasena', async (req, res) => {
    const { email } = req.body;
    const transporter = emailConfig.transporter; // Importa el transporter

    try {
        if (!email) {
            return res.status(400).json({ error: 'El campo de correo electrónico es requerido' });
        }

        const getUserQuery = `SELECT password, verified FROM users WHERE email = ?`;
        const values = [email];

        const results = await new Promise((resolve, reject) => {
            connection.query(getUserQuery, values, (err, results) => {
                if (err) {
                    console.error('Error querying the database:', err);
                    reject(err);
                }
                resolve(results);
            });
        });

        if (results.length === 0) {
            return res.status(401).json({ message: 'No existe el correo', error: 'No existe el correo' });
        }

        const user = results[0];
        if (!user.verified) {
            return res.status(401).json({ error: 'Aún no has verificado tu correo' });
        }

        // Generar un código de verificación
        const verificationCode = generateVerificationCode();

        // Guardar el código de verificación en la base de datos
        const updateVerificationCodeQuery = 'UPDATE users SET verificationCode = ? WHERE email = ?';
        await new Promise((resolve, reject) => {
            connection.query(updateVerificationCodeQuery, [verificationCode, email], (err, result) => {
                if (err) {
                    console.error('Error updating verification code:', err);
                    reject(err);
                }
                resolve(result);
            });
        });

        // Enviar correo electrónico con el código de verificación
        const mailOptions = {
            from: '"TareasProLiteOficial" <myemail@mail.com>',
            to: email,
            subject: 'Código de Verificación para Cambio de Contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Tareas Pro Lite - Cambio de Contraseña</h2>
                    <p>Hemos recibido una solicitud para cambiar la contraseña de tu cuenta en Tareas Pro Lite. Por favor, sigue las instrucciones a continuación:</p>
                    <p style="font-weight: bold; font-size: 18px;">Tu código de verificación es: <span style="color: #007bff;">${verificationCode}</span></p>
                    <p>Ingresa este código en la página de verificación para continuar con el cambio de contraseña.</p>
                    <p>Si no has solicitado este cambio o no reconoces esta acción, por favor contáctanos inmediatamente en <a href="mailto:tareasproliteoficial@gmail.com">tareasproliteoficial@gmail.com</a>.</p>
                    <p>Gracias por utilizar Tareas Pro Lite para gestionar tus tareas y proyectos.</p>
                    <p>Atentamente,<br>El equipo de Tareas Pro Lite</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions); // Utiliza el transporter

        res.status(200).json({ message: 'Se ha enviado un correo con el código de verificación', codigo: verificationCode });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al solicitar el código. Verifica tu correo electrónico.' });
    }
});


app.post('/verificar-codigo', async (req, res) => {
    const { email, verificationCode, code } = req.body;

    try {
        if (verificationCode === code) {
            res.status(200).json({ message: 'Código de verificación correcto' });
        } else {
            res.status(400).json({ error: 'Código de verificación incorrecto' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al verificar el código de verificación' });
    }
});

function validarPasswords(req, res, next) {
    const { newPassword, confirmPassword } = req.body;

    try {
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden' });
        }
        next();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al validar las contraseñas' });
    }
}

app.post('/cambiar-contrasena', validarPasswords, async (req, res) => {
    const { email, newPassword } = req.body;
    const transporter = emailConfig.transporter; // Importa el transporter

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número' });
    }

    try {
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
});


app.listen(3000, () => {
    console.log('server run on port 3000');
});
