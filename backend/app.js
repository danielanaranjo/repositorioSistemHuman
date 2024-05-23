const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const pdfkit = require('pdfkit');
const path = require('path');

const app = express();
app.use(express.json());

// Ruta para manejar solicitudes GET a la raíz de la aplicación
app.get('/', (req, res) => {
    res.send('¡Bienvenido al sistema de gestión de candidatos!');
});

// Ruta para cargar el formulario de creación de candidatos
app.get('/formulario-candidato', (req, res) => {
    res.sendFile(path.join(__dirname, 'formulario-candidato.html'));
});

// Ruta para manejar la creación de candidatos
app.post('/candidatos', [
    body('nombre').notEmpty(),
    body('correo').isEmail(),
    body('institucion').notEmpty(),
    body('carrera').notEmpty(),
    body('promedio').isFloat({ min: 0, max: 10 }),
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const candidato = req.body;
        fs.readFile(path.join(__dirname, 'candidatos.json'), (err, data) => {
            if (err) {
                console.error('Error al leer el archivo de candidatos:', err);
                return res.status(500).json({ error: 'Error interno del servidor.' });
            }
            const candidatos = JSON.parse(data);
            candidatos.push(candidato);
            fs.writeFile(path.join(__dirname, 'candidatos.json'), JSON.stringify(candidatos), (err) => {
                if (err) {
                    console.error('Error al guardar el candidato:', err);
                    return res.status(500).json({ error: 'Error interno del servidor.' });
                }
                res.status(201).json({ message: 'Candidato creado exitosamente.' });
            });
        });
    } catch (error) {
        console.error('Error en la creación de candidatos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Ruta para generar el reporte de candidatos preseleccionados
app.get('/reporte', (req, res) => {
    try {
        fs.readFile(path.join(__dirname, 'candidatos.json'), (err, data) => {
            if (err) {
                console.error('Error al leer el archivo de candidatos:', err);
                return res.status(500).json({ error: 'Error interno del servidor.' });
            }
            const candidatos = JSON.parse(data);
            const institucionesPrestigio = ['Universidad A', 'Universidad B'];
            const preseleccionados = candidatos.filter(candidato => {
                return candidato.promedio > 7.5 && institucionesPrestigio.includes(candidato.institucion);
            });

            const doc = new pdfkit();
            const pdfPath = path.join(__dirname, 'reportes', 'reporte.pdf'); // Cambiada la ruta de escritura del PDF
            doc.pipe(fs.createWriteStream(pdfPath));
            preseleccionados.forEach(candidato => {
                doc.text(`Nombre: ${candidato.nombre}`);
                doc.text(`Correo: ${candidato.correo}`);
                doc.text(`Institución: ${candidato.institucion}`);
                doc.text(`Carrera: ${candidato.carrera}`);
                doc.text(`Promedio: ${candidato.promedio}`);
                if (candidato.habilidades) {
                    doc.text(`Habilidades: ${candidato.habilidades.join(', ')}`);
                }
                doc.text('---');
            });
            doc.end();

            res.status(200).json({ message: 'Reporte generado exitosamente.', pdfUrl: '/reporte.pdf' });
        });
    } catch (error) {
        console.error('Error en la generación del reporte:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Ruta para descargar el PDF
app.get('/descargar-reporte', (req, res) => {
    const pdfPath = path.join(__dirname, 'reportes', 'reporte.pdf'); // Cambiada la ruta de descarga del PDF
    res.download(pdfPath, 'reporte.pdf', (err) => {
        if (err) {
            console.error('Error al descargar el reporte:', err);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    });
});

// Escuchar en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});
