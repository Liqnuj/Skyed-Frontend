import type { FormEvent } from "react";

type ControlValidable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function esControlValidable(elemento: HTMLElement): elemento is ControlValidable {
  return elemento instanceof HTMLInputElement
    || elemento instanceof HTMLSelectElement
    || elemento instanceof HTMLTextAreaElement;
}

export type CampoAdicionalInvalido = {
  etiqueta: string;
  elemento: HTMLElement | null;
};

function obtenerCampo(elemento: HTMLElement): HTMLElement {
  return elemento.closest<HTMLElement>(".admin-field, .part-form-group") ?? elemento;
}

function obtenerEtiqueta(campo: HTMLElement, control: ControlValidable): string {
  const etiqueta = campo.querySelector<HTMLElement>(":scope > span, :scope > label")?.textContent?.trim()
    || control.getAttribute("aria-label")
    || control.labels?.[0]?.textContent?.trim()
    || "Campo obligatorio";
  return etiqueta.replace(/\s*\*\s*$/, "");
}

function esControlInvalido(control: ControlValidable): boolean {
  const valorRequeridoVacio = control.required
    && !("type" in control && (control.type === "checkbox" || control.type === "radio"))
    && control.value.trim() === "";
  return !control.validity.valid || valorRequeridoVacio;
}

function enfocarCampo(campo: HTMLElement) {
  const personalizado = campo.querySelector<HTMLElement>("[data-validacion]");
  const control = personalizado
    ?? (campo.matches("input, select, textarea, button, [tabindex]")
      ? campo
      : campo.querySelector<HTMLElement>("input:not([type='hidden']), select, textarea, button, [tabindex]"));
  if (personalizado && !personalizado.hasAttribute("tabindex")) personalizado.tabIndex = -1;
  control?.focus();
  control?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function vincularLimpieza(control: ControlValidable, campo: HTMLElement) {
  if (control.dataset.limpiarValidacion === "true") return;
  control.dataset.limpiarValidacion = "true";
  const limpiar = () => {
    if (esControlInvalido(control)) return;
    control.removeAttribute("aria-invalid");
    if (campo.querySelectorAll<ControlValidable>("input, select, textarea").length
      && Array.from(campo.querySelectorAll<ControlValidable>("input, select, textarea"))
        .some((otro) => !otro.disabled && otro.willValidate && !otro.validity.valid)) return;
    campo.classList.remove("usr-invalido");
    control.classList.remove("usr-invalido", "part-input-error");
  };
  control.addEventListener("input", limpiar);
  control.addEventListener("change", limpiar);
}

export function limpiarCampoValidacion(elemento: HTMLElement | null) {
  if (!elemento) return;
  const campo = obtenerCampo(elemento);
  campo.classList.remove("usr-invalido");
  campo.querySelectorAll<HTMLElement>(".part-input-error").forEach((control) => {
    control.classList.remove("part-input-error");
    control.removeAttribute("aria-invalid");
  });
  if (esControlValidable(elemento)) {
    elemento.classList.remove("usr-invalido", "part-input-error");
    elemento.removeAttribute("aria-invalid");
  }
}

export function validarFormularioDeportivo(
  evento: FormEvent,
  notificar: (mensaje: string, tipo?: "ok" | "error") => void,
  adicionales: CampoAdicionalInvalido[] = [],
): boolean {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const controles = Array.from(formulario.querySelectorAll<ControlValidable>("input, select, textarea"));
  const invalidos: Array<{ etiqueta: string; elemento: HTMLElement; campo: HTMLElement }> = controles
    .filter((control) => !control.disabled && control.willValidate && esControlInvalido(control))
    .map((control) => ({
      etiqueta: obtenerEtiqueta(obtenerCampo(control), control),
      elemento: control,
      campo: obtenerCampo(control),
    }));

  adicionales.forEach(({ etiqueta, elemento }) => {
    if (!elemento) return;
    invalidos.push({
      etiqueta,
      elemento,
      campo: obtenerCampo(elemento),
    });
  });

  if (!invalidos.length) {
    formulario.querySelectorAll<HTMLElement>(".usr-invalido").forEach(limpiarCampoValidacion);
    return true;
  }

  invalidos.forEach(({ elemento, campo }) => {
    campo.classList.add("usr-invalido");
    if (esControlValidable(elemento)) {
      elemento.setAttribute("aria-invalid", "true");
      if (campo.classList.contains("part-form-group")) elemento.classList.add("part-input-error");
      vincularLimpieza(elemento, campo);
    }
  });

  const nombres = [...new Set(invalidos.map(({ etiqueta }) => etiqueta))];
  notificar(`Completa o corrige estos campos: ${nombres.join(", ")}.`, "error");
  enfocarCampo(invalidos[0].campo);
  return false;
}
