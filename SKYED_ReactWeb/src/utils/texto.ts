export const capitalizar = (value: string) =>
  value.replace(/\S/, (c) => c.toLocaleUpperCase("es"));