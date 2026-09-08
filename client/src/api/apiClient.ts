import axios from "axios";
import { env } from "../config/env";

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

export default apiClient;