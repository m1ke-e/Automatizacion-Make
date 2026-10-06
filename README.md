# Distribuidora La Quinta S.A.S.

Aplicación web para la gestión de inventario y despachos de Distribuidora La Quinta S.A.S. El sistema permite registrar pedidos, validar existencias, actualizar el inventario y consultar el historial de movimientos.

## Tecnologías

* HTML5
* CSS3
* JavaScript
* Bootstrap 5
* Make
* Google Sheets

## Funcionalidades

* Registro de pedidos.
* Validación de existencias.
* Actualización automática del inventario.
* Control de cantidades mínimas.
* Estados de aprobación, aprobación con alerta y rechazo.
* Ruta de respaldo para productos no encontrados.
* Consulta del historial de movimientos.
* Integración mediante webhook entre la aplicación y Make.

## Estructura
distribuidora-la-quinta/
├── index.html
├── historial.html
├── css/
│   └── styles.css
└── js/
    ├── registro.js
    └── historial.js

## Almacenamiento

La información del inventario y del historial se almacena en Google Sheets. Make se encarga de procesar las solicitudes recibidas desde la aplicación, aplicar las reglas de negocio y actualizar los datos.

## Ejecución

El proyecto puede ejecutarse directamente desde un navegador utilizando VS Code y Live Server. La aplicación requiere que el webhook de Make esté configurado y conectado con las hojas de Google Sheets correspondientes.
