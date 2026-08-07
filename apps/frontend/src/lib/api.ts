const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

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

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || "An error occurred",
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

  async registerForContest(contestId: string, token: string) {
    return this.request<any>(`/api/v1/contests/${contestId}/register`, {
      method: "POST",
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
