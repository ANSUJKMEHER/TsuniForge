import { useAuthStore } from "@/stores/auth.store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string;
  _retry?: boolean;
}

interface RefreshSubscriber {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: RefreshSubscriber[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((sub) => sub.resolve(token));
    this.refreshSubscribers = [];
  }

  private onTokenRefreshFailed(err: any) {
    this.refreshSubscribers.forEach((sub) => sub.reject(err));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(subscriber: RefreshSubscriber) {
    this.refreshSubscribers.push(subscriber);
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { token, _retry, ...fetchOptions } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle 204 No Content safely
    if (response.status === 204) {
      return {} as T;
    }

    // 401 Interceptor: attempt token refresh and replay request
    if (response.status === 401 && !_retry && typeof window !== "undefined") {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken && endpoint !== "/api/v1/auth/refresh" && endpoint !== "/api/v1/auth/login") {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshRes = await this.refreshTokens(refreshToken);
            const newAccessToken =
              refreshRes?.data?.accessToken || refreshRes?.accessToken;
            const newRefreshToken =
              refreshRes?.data?.refreshToken || refreshRes?.refreshToken || refreshToken;

            if (newAccessToken) {
              useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
              this.onTokenRefreshed(newAccessToken);

              return this.request<T>(endpoint, {
                ...options,
                token: newAccessToken,
                _retry: true,
              });
            } else {
              throw new ApiError("Failed to obtain new access token", 401, null);
            }
          } catch (refreshErr) {
            this.onTokenRefreshFailed(refreshErr);
            useAuthStore.getState().clearAuth();
            throw new ApiError("Session expired. Please log in again.", 401, null);
          } finally {
            this.isRefreshing = false;
          }
        } else {
          // Wait for token refresh in-flight
          return new Promise<T>((resolve, reject) => {
            this.addRefreshSubscriber({
              resolve: async (newToken: string) => {
                try {
                  const retryRes = await this.request<T>(endpoint, {
                    ...options,
                    token: newToken,
                    _retry: true,
                  });
                  resolve(retryRes);
                } catch (err) {
                  reject(err);
                }
              },
              reject: (err: any) => {
                reject(err);
              },
            });
          });
        }
      }
    }

    const contentType = response.headers.get("content-type");
    let data: any = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  }

  // ─── Auth ─────────────────────────────────

  async register(username: string, email: string, password: string) {
    return this.request<any>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<any>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshTokens(refreshToken: string) {
    return this.request<any>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getProfile(token: string) {
    return this.request<any>("/api/v1/auth/me", {
      token,
    });
  }

  // ─── Problems ─────────────────────────────

  async getProblems(
    params: {
      page?: number;
      limit?: number;
      difficulty?: string;
      tags?: string[];
      search?: string;
    } = {},
    token?: string
  ) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.difficulty) searchParams.set("difficulty", params.difficulty);
    if (params.tags) searchParams.set("tags", params.tags.join(","));
    if (params.search) searchParams.set("search", params.search);

    return this.request<any>(
      `/api/v1/problems?${searchParams.toString()}`,
      { token }
    );
  }

  async getProblem(slug: string, token?: string) {
    return this.request<any>(`/api/v1/problems/${slug}`, { token });
  }

  // ─── Submissions ──────────────────────────

  async submitCode(
    problemId: string,
    language: string,
    code: string,
    token: string,
    contestId?: string
  ) {
    return this.request<any>("/api/v1/submissions", {
      method: "POST",
      body: JSON.stringify({ problemId, language, code, contestId }),
      token,
    });
  }

  async runCode(
    problemId: string,
    language: string,
    code: string,
    customInput: string,
    token: string
  ) {
    return this.request<any>("/api/v1/run", {
      method: "POST",
      body: JSON.stringify({ problemId, language, code, customInput }),
      token,
    });
  }

  async getSubmission(id: string, token: string) {
    return this.request<any>(`/api/v1/submissions/${id}`, { token });
  }

  async getSubmissions(
    params: { problemId?: string; userId?: string; language?: string; verdict?: string } = {},
    token: string
  ) {
    const searchParams = new URLSearchParams();
    if (params.problemId) searchParams.set("problemId", params.problemId);
    if (params.userId) searchParams.set("userId", params.userId);
    if (params.language) searchParams.set("language", params.language);
    if (params.verdict) searchParams.set("verdict", params.verdict);

    return this.request<any>(
      `/api/v1/submissions?${searchParams.toString()}`,
      { token }
    );
  }

  // ─── Contests ─────────────────────────────

  async getContests(status?: string, token?: string) {
    const params = status ? `?status=${status}` : "";
    return this.request<any>(`/api/v1/contests${params}`, { token });
  }

  async getContest(id: string, token?: string) {
    return this.request<any>(`/api/v1/contests/${id}`, { token });
  }

  async getContestProblems(contestId: string, token?: string) {
    return this.request<any>(`/api/v1/contests/${contestId}/problems`, { token });
  }

  async registerForContest(contestId: string, token: string, password?: string) {
    return this.request<any>(`/api/v1/contests/${contestId}/register`, {
      method: "POST",
      body: password ? JSON.stringify({ password }) : undefined,
      token,
    });
  }

  async getLeaderboard(contestId: string, token?: string) {
    return this.request<any>(
      `/api/v1/contests/${contestId}/leaderboard`,
      { token }
    );
  }

  // ─── Global Leaderboard ───────────────────

  async getGlobalLeaderboard(limit = 50) {
    return this.request<any>(`/api/v1/users/leaderboard?limit=${limit}`);
  }

  // ─── Assessments & Proctoring ─────────────

  async getAssessment(id: string, token?: string) {
    return this.request<any>(`/api/v1/assessments/${id}`, { token });
  }

  async getAssessmentSession(id: string, token: string) {
    return this.request<any>(`/api/v1/assessments/${id}/session`, { token });
  }

  async startAssessment(id: string, token: string) {
    return this.request<any>(`/api/v1/assessments/${id}/start`, {
      method: "POST",
      token,
    });
  }

  async completeAssessment(id: string, token: string) {
    return this.request<any>(`/api/v1/assessments/${id}/complete`, {
      method: "POST",
      token,
    });
  }

  async reportCheatEvent(
    assessmentId: string,
    candidateId: string | undefined,
    eventType: string,
    timestamp?: string,
    token?: string,
    metadata?: any
  ) {
    return this.request<any>(`/api/v1/assessments/${assessmentId}/cheat-event`, {
      method: "POST",
      body: JSON.stringify({
        candidateId,
        eventType,
        timestamp: timestamp || new Date().toISOString(),
        metadata,
      }),
      token,
    });
  }

  async submitAssessment(
    assessmentId: string,
    candidateId: string | undefined,
    answers: Array<{ questionId: string; code: string; language: string }>,
    token: string
  ) {
    return this.request<any>(`/api/v1/assessments/${assessmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        candidateId,
        answers,
      }),
      token,
    });
  }
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE_URL);
export { ApiError };
