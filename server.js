// server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());


const serviceAccount = require('./inventoryapp-fb533-firebase-adminsdk-fbsvc-1f1655fd1f.json'); // Descarga JSON desde Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


function checkAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });


  if (authHeader === 'Bearer saul2401') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado' });
  }
}


app.post('/crear-usuario', checkAdminAuth, async (req, res) => {
  const { email, password, nombre } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
   
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
    });

    
    const db = admin.firestore();
    await db.collection('usuarios').doc(userRecord.uid).set({
      email,
      nombre,
      createdAt: new Date(),
    });

    res.json({ message: 'Usuario creado exitosamente', uid: userRecord.uid });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});
