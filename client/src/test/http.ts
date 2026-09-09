import { AxiosError, AxiosHeaders } from "axios";

export function httpError(status: number, body?: unknown) {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    {},
    {
      status,
      data: body,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

export function networkError() {
  return new AxiosError("Network Error", "ERR_NETWORK");
}