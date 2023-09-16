const connection = require('../../database/database');

async function completarTareasController (req, res) {
    try {
        const userId = req.userId; // Obtener userId del objeto req
        // Query the database to get completed tasks for the user
        const query = 'SELECT * FROM tareas WHERE completed = true AND user_id = ? ORDER BY id DESC';

        const results = await new Promise((resolve, reject) => {
            connection.query(query, [userId], (err, results) => {
                if (err) {
                    console.error('Error al obtener las tareas completadas de la base de datos:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las tareas completadas de la base de datos' });
    }
}

module.exports = {
    completarTareasController,
};