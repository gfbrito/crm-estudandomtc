const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
    private getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    setToken(token: string): void {
        localStorage.setItem('auth_token', token);
    }

    clearToken(): void {
        localStorage.removeItem('auth_token');
    }

    private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            this.clearToken();
            window.location.href = '/login';
            throw new Error('Sessão expirada');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(error.error || error.message || `HTTP ${response.status}`);
        }

        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : (null as unknown as T);
    }

    async get<T = any>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'GET' });
    }

    async post<T = any>(path: string, body?: any): Promise<T> {
        return this.request<T>(path, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async put<T = any>(path: string, body?: any): Promise<T> {
        return this.request<T>(path, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T = any>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
