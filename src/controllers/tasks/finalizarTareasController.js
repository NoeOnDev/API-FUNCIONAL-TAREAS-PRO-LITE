const connection = require("../../database/database");

const { formatTimeForDatabase } = require('../../utils/timeUtils');

async function finalizarTareasController (req, res) {
    try {
        const { id } = req.params;
        const { completed, tiempo } = req.body;
        const userId = req.userId; // Obtener userId del objeto req
        const tiempoFormateado = formatTimeForDatabase(tiempo);

        if (completed === undefined) {
            return res.status(400).json({ error: 'El estado completado es obligatorio' });
        }

        const query = 'UPDATE tareas SET completed = ?, tiempo = ?, fecha = NOW() WHERE id = ? AND user_id = ?';

        await new Promise((resolve, reject) => {
            connection.query(query, [completed, tiempoFormateado, id, userId], (err, results) => {
                if (err) {
                    console.error('Error al marcar la tarea como completada en la base de datos:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Tarea marcada como completada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al marcar la tarea como completada en la base de datos' });
    }
}

module.exports = {
    finalizarTareasController,
};