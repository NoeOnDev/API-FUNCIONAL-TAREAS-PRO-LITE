const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');
const emailConfig = require('../../auth/emailConfig'); // Importa el módulo de configuración de correo
const connection = require('../../database/database'); // Importa la conexión a la base de datos

async function virifyUserController(req, res) {
    try {
        const { token } = req.query;

        // Query para verificar el token y actualizar el estado de verificación
        const updateQuery = 'UPDATE users SET verified = true, verificationToken = NULL WHERE verificationToken = ?';
        const result = await new Promise((resolve, reject) => {
            connection.query(updateQuery, [token], async (err, result) => {
                if (err) {
                    console.error('Error verifying email:', err);
                    reject(err);
                } else {
                    if (result.affectedRows === 0) {
                        // Token de verificación no válido
                        const invalidTokenMessage = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Token de Verificación No Válido - Tareas Pro Lite</title>
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
                        .error-message {
                            color: #ff0000;
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
                        <h1>¡Lo sentimos, tu token de verificación no es válido!</h1>
                        <p class="error-message">Por favor, verifica que estás utilizando el enlace correcto de verificación.</p>
                        <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte a través del correo electrónico <a href="mailto:tareasproliteoficial@gmail.com">tareasproliteoficial@gmail.com</a>. Estamos aquí para asistirte en cada paso del camino.</p>
                        <p class="footer">Atentamente,<br>El equipo de Tareas Pro Lite</p>
                    </div>
                </body>
                </html>
            `;
                        return res.send(invalidTokenMessage);
                    } else {
                        // Token verificado con éxito
                        // Mensaje personalizado de verificación exitosa
                        const verificationMessage = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificación de Correo Exitosa - Tareas Pro Lite</title>
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
                        return res.send(verificationMessage);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error durante la verificación de correo. Por favor, inténtelo de nuevo más tarde.' });
    }

}

module.exports = {
    virifyUserController,
};