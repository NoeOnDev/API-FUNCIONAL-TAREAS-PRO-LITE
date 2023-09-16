const connection = require("../../database/database");

async function editarTareasController(req, res) {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nuevo nombre de la tarea es obligatorio' });
        }

        const query = 'UPDATE tareas SET nombre = ? WHERE id = ?';

        await new Promise((resolve, reject) => {
            connection.query(query, [nombre, id], (err, results) => {
                if (err) {
                    console.error('Error al editar la tarea en la base de datos:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Tarea editada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al editar la tarea en la base de datos' });
    }
}

module.exports = {
    editarTareasController,
};