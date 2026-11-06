function validar(schema, body, res) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  res.status(400).json({
    error: 'Dados inválidos',
    details: result.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
  return null;
}

module.exports = validar;
