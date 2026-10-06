const dispatchForm = document.getElementById("dispatchForm");
const productCodeField = document.getElementById("productCode");
const quantityField = document.getElementById("quantity");
const customerField = document.getElementById("customer");
const observationsField = document.getElementById("observations");
const submitButton = document.getElementById("submitDispatch");
const requestStatus = document.getElementById("requestStatus");
const webhookUrl = window.MAKE_WEBHOOK_URL || "";

function showRequestStatus(message, type) {
	requestStatus.textContent = message;
	requestStatus.className = `alert alert-${type} mt-3 mb-0`;
}

const RESULT_STYLES = {
	"APROBADO": "success",
	"APROBADO CON ALERTA": "warning",
	"RECHAZADO": "danger",
	"RUTA DE RESPALDO": "info",
	"ERROR DE COMUNICACIÓN": "danger"
};

const RESULT_FIELDS = [
	["codigoProducto", "Código del producto"],
	["producto", "Producto"],
	["cantidad", "Cantidad"],
	["saldoAnterior", "Saldo anterior"],
	["saldoNuevo", "Saldo nuevo"],
	["minimo", "Mínimo"],
	["fecha", "Fecha"]
];

function createTextElement(tagName, className, text) {
	const element = document.createElement(tagName);
	element.className = className;
	element.textContent = text;
	return element;
}

function showDispatchResult(responseData) {
	const response = responseData && typeof responseData === "object" && !Array.isArray(responseData)
		? responseData
		: {};
	const resultValue = typeof response.resultado === "string" ? response.resultado : response.estado;
	const rawResult = typeof resultValue === "string" ? resultValue.trim() : "";
	const result = rawResult.toLocaleUpperCase("es");
	const resultStyle = RESULT_STYLES[result] || "secondary";
	const heading = document.createElement("div");
	heading.className = "d-flex flex-wrap align-items-center gap-2 mb-2";
	heading.append(
		createTextElement("h3", "h5 mb-0", "Resultado del despacho"),
		createTextElement("span", `badge text-bg-${resultStyle}`, rawResult || "RESPUESTA RECIBIDA")
	);

	requestStatus.className = `alert alert-${resultStyle} mt-3 mb-0`;
	requestStatus.replaceChildren(heading);

	const defaultMessage = typeof responseData === "string"
		? responseData
		: rawResult
			? "Make procesó la solicitud."
			: "Make recibió la solicitud, pero no devolvió un resultado detallado.";
	const message = typeof response.mensaje === "string" && response.mensaje.trim()
		? response.mensaje.trim()
		: defaultMessage;
	requestStatus.append(createTextElement("p", "mb-0", message));
	const motivo = typeof response.motivo === "string" && response.motivo.trim()
		? response.motivo.trim()
		: null;

	if (motivo) {
		requestStatus.append(createTextElement("p", "mt-2 mb-0", `Motivo: ${motivo}`));
	}

	const availableFields = RESULT_FIELDS.filter(([key]) =>
		response[key] !== undefined && response[key] !== null && String(response[key]).trim() !== ""
	);

	if (availableFields.length > 0) {
		const details = document.createElement("dl");
		details.className = "row mt-3 mb-0";

		for (const [key, label] of availableFields) {
			details.append(
				createTextElement("dt", "col-sm-4 col-md-3", label),
				createTextElement("dd", "col-sm-8 col-md-9", String(response[key]))
			);
		}

		requestStatus.append(details);
	}
}

function validateDispatchForm() {
	const quantity = Number(quantityField.value);
	const customer = customerField.value.trim();

	quantityField.setCustomValidity(
		Number.isFinite(quantity) && quantity > 0 ? "" : "Ingresa una cantidad numérica mayor que cero."
	);
	customerField.setCustomValidity(customer ? "" : "Ingresa el nombre del cliente.");

	if (!dispatchForm.checkValidity()) {
		dispatchForm.reportValidity();
		return false;
	}

	return true;
}

function parseResponseBody(responseText) {
	if (!responseText) {
		return null;
	}

	try {
		return JSON.parse(responseText);
	} catch {
		return responseText;
	}
}

async function sendDispatch(data) {
	if (!webhookUrl.trim()) {
		throw new Error("CONFIG_ERROR");
	}

	let response;
	try {
		response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data)
		});
	} catch {
		throw new Error("NETWORK_ERROR");
	}

	if (!response.ok) {
		throw new Error(`HTTP_ERROR_${response.status}`);
	}

	let responseText;
	try {
		responseText = await response.text();
	} catch {
		throw new Error("NETWORK_ERROR");
	}

	return parseResponseBody(responseText);
}

dispatchForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	requestStatus.classList.add("d-none");

	if (!validateDispatchForm()) {
		return;
	}

	const data = {
		operacion: "registro",
		codigoProducto: productCodeField.value,
		cantidad: Number(quantityField.value),
		cliente: customerField.value.trim(),
		observaciones: observationsField.value.trim()
	};

	submitButton.disabled = true;
	submitButton.textContent = "Enviando...";
	showRequestStatus("Enviando el despacho...", "info");

	try {
		const response = await sendDispatch(data);
		showDispatchResult(response);
	} catch (error) {
		if (error.message === "CONFIG_ERROR") {
			showDispatchResult({
				resultado: "ERROR DE COMUNICACIÓN",
				mensaje: "El webhook de Make no está configurado en este despliegue."
			});
		} else if (error.message.startsWith("HTTP_ERROR_")) {
			const statusCode = error.message.replace("HTTP_ERROR_", "");
			showDispatchResult({
				resultado: "ERROR DE COMUNICACIÓN",
				mensaje: `Make respondió con un error HTTP (${statusCode}). Verifica la configuración del webhook o intenta más tarde.`
			});
		} else {
			showDispatchResult({
				resultado: "ERROR DE COMUNICACIÓN",
				mensaje: "No fue posible comunicarse con Make. Revisa tu conexión e inténtalo de nuevo."
			});
		}
	} finally {
		submitButton.disabled = false;
		submitButton.textContent = "Enviar despacho";
	}
});

customerField.addEventListener("input", () => {
	customerField.setCustomValidity("");
});

quantityField.addEventListener("input", () => {
	quantityField.setCustomValidity("");
});
