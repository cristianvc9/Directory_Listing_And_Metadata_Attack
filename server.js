import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import serveIndex from "serve-index";

const app = express();
const PORT = 3000;
const __dirname = path.resolve();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta pública
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

// Aseguramos que exista public/uploads
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ----------------------------------------------------
// RUTA PARA EL VULNERABLE INDEX OF (Directorio raíz expuesto)
// ----------------------------------------------------
const PROJECT_ROOT = __dirname;

app.use(
    "/filelisting",
    // 1. Sirve los archivos estáticos desde la raíz del proyecto
    express.static(PROJECT_ROOT),
    // 2. Habilita el listado automático (Index Of) sobre esa misma carpeta
    serveIndex(PROJECT_ROOT, { icons: true, view: 'details' })
);

// ----------------------------------------------------
// RUTAS ORIGINALES
// ----------------------------------------------------

// Servir archivos estáticos desde /public
app.use(express.static(PUBLIC_DIR));

// Habilitar Directory Listing AUTOMÁTICO con serve-index (montado sobre public/uploads)
app.use(
    "/uploads",
    express.static(UPLOADS_DIR),
    serveIndex(UPLOADS_DIR, { icons: true })
);

// Configuración de multer (almacenamiento en memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta index: servir index.html que está EN LA RAÍZ del proyecto
app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "index.html"));
});

// POST /upload -> subir imagen y guardar con metadatos
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const { username = "anon", comment = "" } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No se subió ninguna imagen" });
        }

        // --- CAMBIO CLAVE ---
        // VULNERABILIDAD: Guardamos el archivo directamente del buffer de Multer, 
        // conservando los metadatos EXIF, GPS, etc., originales.
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const fileName = `img_${Date.now()}${fileExtension}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        // Usamos fs.writeFileSync en lugar de sharp
        fs.writeFileSync(filePath, req.file.buffer);
        // --------------------

        // Guardar metadatos (usando JSON para simular una base de datos)
        const dataPath = path.join(UPLOADS_DIR, "data.json");
        let images = [];
        if (fs.existsSync(dataPath)) {
            try {
                // Vulnerabilidad de des-serialización JSON simple si los datos fueran complejos
                images = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
            } catch (err) {
                images = [];
            }
        }

        images.push({
            username,
            comment,
            file: `/uploads/${fileName}`,
            uploaded_at: new Date().toISOString()
        });

        fs.writeFileSync(dataPath, JSON.stringify(images, null, 2), "utf-8");

        res.json({ success: true, message: "Imagen subida correctamente (CON METADATOS)", file: `/uploads/${fileName}` });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Error al subir la imagen" });
    }
});

// GET /images -> devuelve JSON con metadatos
app.get("/images", (req, res) => {
    const dataPath = path.join(UPLOADS_DIR, "data.json");
    if (fs.existsSync(dataPath)) {
        try {
            const images = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
            return res.json(images);
        } catch (err) {
            return res.status(500).json({ error: "Error leyendo data.json" });
        }
    }
    res.json([]);
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uploadsPath: "/uploads/",
        listEnabled: true
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Visita la nueva ruta para el "Index Of" simulado: http://localhost:${PORT}/filelisting`);
});
