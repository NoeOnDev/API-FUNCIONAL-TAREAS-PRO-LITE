const isStrongPassword = (password) => {
    // La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPasswordRegex.test(password);
};

function validarPasswords(req, res, next) {
    const { newPassword, confirmPassword } = req.body;

    try {
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden' });
        }
        next();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al validar las contraseñas' });
    }
}

module.exports = {
    isStrongPassword,
    validarPasswords,
};

