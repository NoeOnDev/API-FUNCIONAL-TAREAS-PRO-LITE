const emailConfig = require('../../auth/email/emailConfig');

async function generateInvalidTokenMessage() {
    // Generar y devolver el mensaje HTML para un token de verificación no válido
    return `
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
}

module.exports = {
    generateInvalidTokenMessage,
};