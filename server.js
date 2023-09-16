const express = require('express');
const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

const registerUserController = require('./src/controllers/users/registerUserController');
const verifyUserController = require('./src/controllers/users/virifyUserController');
const loginUserController = require('./src/controllers/users/loginUserController');

const requestPasswordResetController = require('./src/controllers/recoveryPassword/requestPasswordResetController');
const verifyPasswordResetCodeController = require('./src/controllers/recoveryPassword/verifyPasswordResetCodeController');
const changePasswordController = require('./src/controllers/recoveryPassword/changePasswordController');

const agregarTareasController = require('./src/controllers/tasks/agregarTareasController');
const mostrarTareasController = require('./src/controllers/tasks/mostrarTareasController');
const editarTareasController = require('./src/controllers/tasks/editarTareasController');
const finalizarTareasController = require('./src/controllers/tasks/finalizarTareasController');
const completarTareasController = require('./src/controllers/tasks/completarTareasController');

const middleWare = require('./src/auth/middleWare');

const { validarPasswords } = require('./src/utils/passwordUtils');


//RUTAS PARA GESTION DE USUARIOS
app.post('/register', registerUserController.registerUserController);

app.get('/verify', verifyUserController.virifyUserController);

app.post('/login', loginUserController.loginUserController);


//RUTAS PARA RESTAURAR CONTRASEÑA
app.post('/solicitar-cambio-contrasena', requestPasswordResetController.requestPasswordResetController);

app.post('/verificar-codigo', verifyPasswordResetCodeController.verifyPasswordResetCodeController);

app.post('/cambiar-contrasena',validarPasswords, changePasswordController.changePasswordController);


//RUTAS PARA GESTION DE TAREAS
app.post('/tareas/agregar', middleWare.verifyToken, agregarTareasController.agregarTareasController);

app.get('/tareas', middleWare.verifyToken, mostrarTareasController.mostrarTareasController);

app.put('/tareas/editar/:id', editarTareasController.editarTareasController);

app.put('/tareas/finalizar/:id', middleWare.verifyToken, finalizarTareasController.finalizarTareasController );

app.get('/tareas/completadas', middleWare.verifyToken, completarTareasController.completarTareasController);



app.listen(3000, () => {
    console.log('Server listening on port 3000');
});