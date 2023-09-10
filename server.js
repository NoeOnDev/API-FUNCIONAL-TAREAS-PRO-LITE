const express = require('express');
const app = express();
app.use(express.json());
const validator = require('validator');
const cors = require('cors');
app.use(cors());
const crypto = require("crypto");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


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
            // No se encontró el usuario, lo cual es un error de autenticación
            return res.status(401).json({ error: 'No hemos podido autenticar su acceso' });
        }

        const user = results[0];

        if (!user.verified) {
            // El usuario no está verificado y no puede iniciar sesión
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
            // La contraseña no coincide, lo cual es un error de autenticación
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


app.post('/solicitar-cambio-contrasena', async (req, res) => {
    const { email } = req.body;

    try {
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
});




app.post('/verificar-codigo', async (req, res) => {
    const { email, verificationCode } = req.body;

    try {
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

        // Verificar si el código de verificación coincide con el almacenado en la base de datos
        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ error: 'El código de verificación no es válido' });
        }

        // Eliminar el código de verificación de la base de datos
        const clearCodeQuery = 'UPDATE users SET verificationCode = NULL WHERE email = ?';
        await new Promise((resolve, reject) => {
            connection.query(clearCodeQuery, [email], (err, result) => {
                if (err) {
                    console.error('Error clearing verification code:', err);
                    reject(err);
                }
                resolve();
            });
        });

        res.status(200).json({ message: 'Código de verificación válido' });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error al verificar el código. Por favor, inténtelo de nuevo más tarde.' });
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




//Andrea Task

app.post('/tareas/agregar', middleWare.verifyToken, (req, res) => {
    const { nombre } = req.query;
    const userId = req.userId; // Obtener userId del objeto req

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la tarea es obligatorio' });
    }

    const query = 'INSERT INTO tareas (nombre, user_id) VALUES (?, ?)'; // Asegúrate de tener una columna user_id en tu tabla tareas
    connection.query(query, [nombre, userId], (err, results) => {
        if (err) {
            console.error('Error al agregar la tarea a la base de datos:', err);
            return res.status(500).json({ error: 'Error al agregar la tarea a la base de datos' });
        }
        res.status(200).json({ message: 'Tarea agregada exitosamente' });
    });
});



// Define the route to get tasks
app.get('/tareas', middleWare.verifyToken, (req, res) => {
    const userId = req.userId; // Obtener userId del objeto req
    const query = 'SELECT * FROM tareas WHERE user_id = ? ORDER BY id DESC'; // Filtrar tareas por user_id
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener las tareas de la base de datos:', err);
            return res.status(500).json({ error: 'Error al obtener las tareas de la base de datos' });
        }
        res.status(200).json(results);
    });
});


app.put('/tareas/editar/:id', (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nuevo nombre de la tarea es obligatorio' });
    }

    const query = 'UPDATE tareas SET nombre = ? WHERE id = ?';
    connection.query(query, [nombre, id], (err, results) => {
        if (err) {
            console.error('Error al editar la tarea en la base de datos:', err);
            return res.status(500).json({ error: 'Error al editar la tarea en la base de datos' });
        }
        res.status(200).json({ message: 'Tarea editada exitosamente' });
    });
});

function formatTimeForDatabase(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '00')}`;
}

app.put('/tareas/finalizar/:id', middleWare.verifyToken, (req, res) => {
    const { id } = req.params;
    const { completed, tiempo } = req.body;
    const userId = req.userId; // Obtener userId del objeto req
    const tiempoFormateado = formatTimeForDatabase(tiempo);


    if (completed === undefined) {
        return res.status(400).json({ error: 'El estado completado es obligatorio' });
    }

    const query = 'UPDATE tareas SET completed = ?, tiempo = ?, fecha = NOW() WHERE id = ? AND user_id = ?';
    connection.query(query, [completed, tiempoFormateado, id, userId], (err, results) => {
        if (err) {
            console.error('Error al marcar la tarea como completada en la base de datos:', err);
            return res.status(500).json({ error: 'Error al marcar la tarea como completada en la base de datos' });
        }
        res.status(200).json({ message: 'Tarea marcada como completada exitosamente' });
    });
});


// Define the route to get completed tasks
app.get('/tareas/completadas', middleWare.verifyToken, (req, res) => {
    const userId = req.userId; // Obtener userId del objeto req
    // Query the database to get completed tasks for the user
    const query = 'SELECT * FROM tareas WHERE completed = true AND user_id = ? ORDER BY id DESC';
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener las tareas completadas de la base de datos:', err);
            return res.status(500).json({ error: 'Error al obtener las tareas completadas de la base de datos' });
        }
        res.status(200).json(results);
    });
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});