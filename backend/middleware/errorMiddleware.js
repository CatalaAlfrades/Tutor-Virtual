const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode);

    console.error("ERRO NÃO TRATADO:", err.stack);

    res.json({
        message: err.message || 'Ocorreu um erro inesperado no servidor.',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

const notFound = (req, res, next) => {
  const error = new Error(`Não encontrado - ${req.originalUrl}`);
  res.status(404);
  next(error);
};


module.exports = { errorHandler, notFound };