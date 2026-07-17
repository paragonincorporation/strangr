export default {
  async fetch(request, environment) {
    const incomingUrl = new URL(request.url);
    const origin = new URL(environment.ORIGIN_URL);
    incomingUrl.protocol = origin.protocol;
    incomingUrl.host = origin.host;

    const headers = new Headers(request.headers);
    headers.set("cf-ipcountry", request.cf?.country ?? "ZZ");
    headers.set("x-paramingle-edge-secret", environment.EDGE_PROXY_SECRET);

    return fetch(
      new Request(incomingUrl, {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      }),
    );
  },
};
