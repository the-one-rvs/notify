import { httpRequestCounter, httpRequestDurationHistogram } from "../metrics.js";

export const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationInSeconds = (Date.now() - start) / 1000;

    const route = req.route?.path || req.path || "unknown";

    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDurationHistogram.observe(
      {
        method: req.method,
        route,
        status: res.statusCode,
      },
      durationInSeconds
    );
  });

  next();
};
