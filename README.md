# SISTEMA DE CERTIFICADOS - INSTALACION COMPLETADA

## PASOS SIGUIENTES:

### 1. INSTALAR DEPENDENCIAS
```bash
composer install
```

### 2. CONFIGURAR BASE DE DATOS
- Importar: src/Config/database.sql
- Editar conexión en: src/Models/Database.php

### 3. CONFIGURAR CERTIFICADO
- Colocar imagen base en: certificates/template.jpg
- Formato: JPG, A4 horizontal (297x210mm), 300 DPI

### 4. PERMISOS (Linux/Mac)
```bash
chmod 755 public/uploads generated certificates
```

### 5. ARCHIVOS A CREAR MANUALMENTE:
Copiar el código desde los artifacts a estos archivos:

**MODELOS:**
- src/Models/Database.php
- src/Models/Participant.php
- src/Models/Certificate.php

**CONTROLADORES:**
- src/Controllers/HomeController.php
- src/Controllers/UploadController.php
- src/Controllers/CertificateController.php

**VISTAS:**
- src/Views/layout.php
- src/Views/home.php
- src/Views/participants.php

**PÚBLICOS:**
- public/index.php
- public/assets/css/style.css
- public/assets/js/app.js

### 6. PROBAR LA APLICACIÓN
- Acceder via navegador al directorio public/
- Subir el archivo ejemplo.csv para probar

## ESTRUCTURA FINAL:
```
sistema-certificados/
├── composer.json
├── vendor/ (después de composer install)
├── public/
│   ├── index.php
│   ├── .htaccess
│   ├── assets/
│   │   ├── css/style.css
│   │   └── js/app.js
│   └── uploads/
├── src/
│   ├── Controllers/
│   ├── Models/
│   ├── Views/
│   └── Config/database.sql
├── certificates/template.jpg (tu imagen)
├── generated/ (PDFs generados)
└── ejemplo.csv
```
# sistema-certificados
# sistema-certificados
