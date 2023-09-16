const connection = require("../../database/database");

async function agregarTareasController(req, res) {

    try {
        const { nombre } = req.query;
        const userId = req.userId; // Obtener userId del objeto req

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la tarea es obligatorio' });
        }

        const query = 'INSERT INTO tareas (nombre, user_id) VALUES (?, ?)'; // Asegúrate de tener una columna user_id en tu tabla tareas
        await new Promise((resolve, reject) => {
            connection.query(query, [nombre, userId], (err, results) => {
                if (err) {
                    console.error('Error al agregar la tarea a la base de datos:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Tarea agregada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al agregar la tarea a la base de datos' });
    }
}

module.exports = {
    agregarTareasController,
};