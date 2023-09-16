const connection = require("../../database/database");

async function mostrarTareasController(req, res) {
    try {
        const userId = req.userId; // Obtener userId del objeto req
        const query = 'SELECT * FROM tareas WHERE user_id = ? ORDER BY id DESC'; // Filtrar tareas por user_id

        const results = await new Promise((resolve, reject) => {
            connection.query(query, [userId], (err, results) => {
                if (err) {
                    console.error('Error al obtener las tareas de la base de datos:', err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las tareas de la base de datos' });
    }
}

module.exports = {
    mostrarTareasController,
};