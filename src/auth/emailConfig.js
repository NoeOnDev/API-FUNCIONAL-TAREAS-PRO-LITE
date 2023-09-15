const nodemailer = require("nodemailer");
const axios = require("axios"); // Importa axios para hacer solicitudes HTTP

// Definir los datos de autenticación
const authData = {
    type: 'OAuth2',
    user: 'tareasproliteoficial@gmail.com',
    clientId: "922505212231-ppfa8vdaunlt7uf8amame8hf0f82atm7.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04cTYnOPuYIulCgYIARAAGAQSNwF-L9IrJDpV7MHvzNBgEGgTBhhmpFgHB4mAP8zxgFeUJhhYqH8PiYFWik37RplNDir8mU1siEg",
    accessToken: 'ya29.a0AfB_byCmeKv0b7sz5-1shQtZT_JRqBNjZ0qiTa5hTjvNZ9-0PTWGjyjahb-NuTUZ9kzrnkFp6-uOksmD3vwYMm_QKNPCX8Xf8zdhQYMNNKZOuPwcnw-odP5LDB6cRLACxIlLQK7Wq66Sk5bzjuQokdTFwqpxmT4HRKrvaCgYKAYQSARISFQGOcNnCUAAOqA5nCgiy80t3nx-L1A0171',
    expires: 1484314697598,
};


// Función para obtener un nuevo token de acceso si ha expirado
async function getAccessTokenIfNeeded() {
    // Verificar si el token de acceso ha expirado (compararlo con la hora actual)
    const currentTime = new Date().getTime();
    if (authData.expires < currentTime) {
        try {
            // El token de acceso ha expirado, obtener un nuevo token de acceso usando el refreshToken
            const response = await axios.post('https://www.googleapis.com/oauth2/v4/token', {
                client_id: authData.clientId,
                client_secret: authData.clientSecret,
                refresh_token: authData.refreshToken,
                grant_type: 'refresh_token'
            });

            // Actualizar el campo authData.accessToken con el nuevo token de acceso
            authData.accessToken = response.data.access_token;

            // Calcular la nueva fecha de vencimiento (una hora desde la hora actual)
            authData.expires = new Date().getTime() + 3500000; // 3600000 milisegundos = 1 hora
        } catch (error) {
            console.error('Error al renovar el token de acceso:', error);
        }
    }
}

// Crear el transporte de nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: authData,
});

module.exports = {
    transporter,
    getAccessTokenIfNeeded, // Exportar la función para su uso en otros lugares
};