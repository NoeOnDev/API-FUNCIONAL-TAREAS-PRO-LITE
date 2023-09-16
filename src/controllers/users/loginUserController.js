const bcrypt = require('bcrypt');

const emailConfig = require('../../auth/email/emailConfig'); // Importa el módulo de configuración de correo
const connection = require('../../database/database'); // Importa la conexión a la base de datos
const middleWare = require('../../auth/middleware/middleWare');

async function loginUserController(req, res) {
    try {
        const { email, password } = req.body;

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
        res.status(200).json({ message: 'Datos de acceso validados satisfactoriamente', token, username: user.username });
    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Ocurrió un error durante el proceso de inicio de sesión. Por favor, inténtelo de nuevo más tarde.' });
    }
}

module.exports = {
    loginUserController,
};