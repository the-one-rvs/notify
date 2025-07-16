import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP Request Counter
export const httpRequestCounter = new client.Counter({
  name: "notify_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestCounter);

export const httpRequestDurationHistogram = new client.Histogram({
  name: "notify_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5] // Adjust based on app latency
});
register.registerMetric(httpRequestDurationHistogram);
// Login Success
export const loginSuccessCounter = new client.Counter({
  name: "notify_login_success_total",
  help: "Number of successful user logins",
});
register.registerMetric(loginSuccessCounter);

// Active Session
export const activeSessionGauge = new client.Gauge({
  name: "notify_active_user_sessions",
  help: "Current number of active logged-in users",
});
register.registerMetric(activeSessionGauge);

// Post Created
export const postCreatedCounter = new client.Counter({
  name: "notify_post_created_total",
  help: "Number of posts created",
});
register.registerMetric(postCreatedCounter);

export const activePostInSession = new client.Gauge({
  name: "notify_post_active_in_session_total",
  help: "Number of posts created",
})
register.registerMetric(activePostInSession)

export const fetchPost = new client.Counter({
  name: "notify_fetched_post_total",
  help: "Number of post fetching efforts"
})
register.registerMetric(fetchPost)

export const updationOfPosts = new client.Counter({
  name: "notify_update_posts_total",
  help: "Number of Times Posts Updated"
})
register.registerMetric(updationOfPosts)

export const adminSeeded = new client.Counter({
  name: "notify_number_of_admins_seeded",
  help: "Number of total Admin Seeded in session"
})
register.registerMetric(adminSeeded)
// JWT Failures
export const jwtFailureCounter = new client.Counter({
  name: "notify_jwt_verification_failures_total",
  help: "Number of JWT verification failures",
});
register.registerMetric(jwtFailureCounter);

export const refreshUserTokenMetrics = new client.Counter({
  name: "notify_token_refresh_total",
  help: "How many time token refreshed"
})
register.registerMetric(refreshUserTokenMetrics)

export const roleUpdateMetrics = new client.Counter({
  name: "notify_update_user_roles_total",
  help: "No of Users Role Updated"
})
register.registerMetric(roleUpdateMetrics)

export const updateDetailsMetrics = new client.Counter({
  name: "notify_update_account_details_total",
  help:"Updating Account Details"
})

export const loginDurationSummary = new client.Summary({
  name: "login_duration_seconds",
  help: "Login route duration in seconds",
  labelNames: ["route"],
});
register.registerMetric(loginDurationSummary);


// Mongo Query Duration
export const mongoQueryDuration = new client.Histogram({
  name: "notify_mongodb_query_duration_seconds",
  help: "MongoDB query duration",
  labelNames: ["operation", "collection", "function"],
});
register.registerMetric(mongoQueryDuration);

export const mongoDBConnect = new client.Histogram({
  name: "notify_mongodb_connection_duration_seconds",
  help: "MongoDB Connection Duration"
})
register.registerMetric(mongoDBConnect)

export { register };
