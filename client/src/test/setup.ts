import "@testing-library/jest-dom/vitest";

// O jsdom não implementa a API de object URLs. O componente de upload usa
// `URL.createObjectURL` para pré-visualização; sem este shim os testes
// rebentariam antes de chegar ao comportamento em teste.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:preview";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}
