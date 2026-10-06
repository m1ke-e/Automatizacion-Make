const historyRows = document.getElementById("historyRows");
const historyStatus = document.getElementById("historyStatus");
const refreshHistoryButton = document.getElementById("refreshHistory");

const DEVELOPMENT_MOVEMENTS = [
	{
		fecha: "2026-10-05",
		codigoProducto: "INS-0101",
		producto: "Harina de trigo x 25 kg",
		cantidad: 10,
		cliente: "Cliente de prueba",
		resultado: "APROBADO",
		saldoAnterior: 48,
		saldoNuevo: 38
	},
	{
		fecha: "2026-10-05",
		codigoProducto: "INS-0102",
		producto: "Azúcar refinada x 50 kg",
		cantidad: 5,
		cliente: "Cliente de prueba",
		resultado: "APROBADO CON ALERTA",
		saldoAnterior: 12,
		saldoNuevo: 7
	},
	{
		fecha: "2026-10-05",
		codigoProducto: "INS-0204",
		producto: "Arroz blanco x 25 kg",
		cantidad: 7,
		cliente: "Cliente de prueba",
		resultado: "APROBADO CON ALERTA",
		saldoAnterior: 7,
		saldoNuevo: 0
	}
];

function createTextElement(tagName, className, text) {
	const element = document.createElement(tagName);
	element.className = className;
	element.textContent = text;
	return element;
}

function getDisplayValue(value) {
	return value === undefined || value === null || String(value).trim() === ""
		? "-"
		: String(value);
}

function showHistoryStatus(message, type) {
	historyStatus.textContent = message;
	historyStatus.className = `alert alert-${type} mb-3`;
}

function renderMovements(movements) {
	historyRows.replaceChildren();

	if (movements.length === 0) {
		const row = document.createElement("tr");
		const cell = createTextElement("td", "text-center text-body-secondary py-4", "No hay movimientos para mostrar.");
		cell.colSpan = 6;
		row.append(cell);
		historyRows.append(row);
		return;
	}

	for (const movement of movements) {
		const row = document.createElement("tr");
		const values = [
			movement.fecha,
			movement.codigo || movement.codigoProducto,
			movement.producto,
			movement.cliente,
			movement.cantidad,
			movement.observaciones
		];

		values.forEach((value) => {
			const cell = document.createElement("td");
			cell.textContent = getDisplayValue(value);
			row.append(cell);
		});

		historyRows.append(row);
	}
}

function normalizeMovements(data) {
	const normalizeMovement = (movement) => {
		if (!movement || typeof movement !== "object") {
			throw new Error("INVALID_RESPONSE");
		}

		if (Object.hasOwn(movement, "0")) {
			return {
				fecha: movement["0"],
				codigo: movement["1"],
				producto: movement["2"],
				cliente: movement["3"],
				cantidad: movement["4"],
				observaciones: movement["5"]
			};
		}

		return movement;
	};

	if (Array.isArray(data)) {
		return data.map(normalizeMovement);
	}

	if (data && typeof data === "object") {
		if (Array.isArray(data.movimientos)) {
			return data.movimientos.map(normalizeMovement);
		}
		if (Array.isArray(data.historial)) {
			return data.historial.map(normalizeMovement);
		}
		const values = Object.values(data);
		if (values.length > 0 && values.every((value) => value && typeof value === "object")) {
			return values.map(normalizeMovement);
		}
		if (data.fecha || data.codigo || data.codigoProducto || data.producto || Object.hasOwn(data, "0")) {
			return [normalizeMovement(data)];
		}
	}

	throw new Error("INVALID_RESPONSE");
}

async function loadHistory() {
	refreshHistoryButton.disabled = true;
	refreshHistoryButton.textContent = "Cargando...";

	if (!MAKE_WEBHOOK_URL.trim()) {
		renderMovements(DEVELOPMENT_MOVEMENTS);
		showHistoryStatus("Datos mock de desarrollo. Configura MAKE_WEBHOOK_URL en js/config.js para consultar movimientos reales.", "warning");
		refreshHistoryButton.disabled = false;
		refreshHistoryButton.textContent = "Actualizar";
		return;
	}

	showHistoryStatus("Consultando el historial en Make...", "info");
	historyRows.replaceChildren();

	try {
		const response = await fetch(MAKE_WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify({
				codigoProducto: null,
				cantidad: null,
				cliente: null,
				observaciones: null,
				operacion: "historial"
			})
		});

		if (!response.ok) {
			throw new Error("HTTP_ERROR");
		}

		const movements = normalizeMovements(await response.json());
		renderMovements(movements);
		showHistoryStatus("Historial actualizado desde Make.", "success");
	} catch (error) {
		renderMovements([]);
		const message = error.message === "INVALID_RESPONSE"
			? "Make respondió con un formato de historial no reconocido."
			: "No fue posible consultar el historial en Make. Revisa la conexión y la configuración del webhook.";
		showHistoryStatus(message, "danger");
	} finally {
		refreshHistoryButton.disabled = false;
		refreshHistoryButton.textContent = "Actualizar";
	}
}

refreshHistoryButton.addEventListener("click", loadHistory);
loadHistory();
