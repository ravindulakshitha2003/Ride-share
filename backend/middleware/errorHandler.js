function notFound(req, res, next) {
  res.status(404).json({
    message: `API endpoint not found: ${req.method} ${req.originalUrl}` 
  });
}
function errorHandler(error, req, res, next) {
  console.error("Request error:", error);

  if (res.headersSent) return next(error);
  return res.status(500).json({
    message: "Internal server error." 
  });
}
module.exports = { notFound, errorHandler };
