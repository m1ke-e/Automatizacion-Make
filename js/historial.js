const historyRows = document.getElementById("historyRows");
const historyStatus = document.getElementById("historyStatus");
const refreshHistoryButton = document.getElementById("refreshHistory");

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
		cell.colSpan = 10;
		row.append(cell);
		historyRows.append(row);
		return;
	}

	for (const movement of movements) {
		const row = document.createElement("tr");
		if (String(movement.estado || "").trim().toLocaleLowerCase("es") === "rechazado") {
			row.classList.add("table-danger");
		}
		const values = [
			movement.estado,
			movement.operacion,
			movement.fecha,
			movement.codigo || movement.codigoProducto,
			movement.producto,
			movement.cantidad,
			movement.cliente,
			movement.correo,
			movement.destino,
			movement.motivo,
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
				estado: movement["0"],
				operacion: movement["1"],
				fecha: movement["2"],
				codigo: movement["3"],
				producto: movement["4"],
				cantidad: movement["5"],
				cliente: movement["6"],
				correo: movement["7"],
				destino: movement["8"],
				motivo: movement["9"],
				observaciones: movement["10"]
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
		if (data.estado  || data.operacion || data.fecha || data.codigo || data.codigoProducto || data.producto || Object.hasOwn(data, "0")) {
			return [normalizeMovement(data)];
		}
	}

	throw new Error("INVALID_RESPONSE");
}

async function loadHistory() {
	refreshHistoryButton.disabled = true;
	refreshHistoryButton.textContent = "Cargando...";

	if (!MAKE_WEBHOOK_URL.trim()) {
		renderMovements([]);
		showHistoryStatus("Configura MAKE_WEBHOOK_URL en js/config.js para consultar movimientos reales.", "warning");
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
