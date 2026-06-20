import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LithicCard {
  token: string;
  last_four: string;
  card_number?: string;
  cvv?: string;
  exp_month: string;
  exp_year: string;
  state: 'OPEN' | 'PAUSED' | 'CLOSED';
  spend_limit?: number;
  spend_limit_duration?: string;
}

export interface LithicTransaction {
  token: string;
  card_token: string;
  amount: number;
  merchant: {
    descriptor: string;
    city?: string;
    state?: string;
    country?: string;
    mcc?: string;
  };
  status: 'PENDING' | 'SETTLED' | 'VOIDED' | 'DECLINED';
  result: 'APPROVED' | 'DECLINED';
  authorization_code?: string;
  declined_reason?: string;
}

export interface CreateCardRequest {
  type: 'VIRTUAL' | 'PHYSICAL' | 'SINGLE_USE';
  spend_limit?: number;
  spend_limit_duration?: 'TRANSACTION' | 'DAILY' | 'MONTHLY' | 'ANNUALLY' | 'FOREVER';
  memo?: string;
}

@Injectable()
export class LithicService {
  private readonly logger = new Logger(LithicService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly isMock: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LITHIC_API_KEY', '');
    this.baseUrl = this.configService.get<string>('LITHIC_BASE_URL', 'https://sandbox.lithic.com/v1');
    this.isMock = !this.apiKey || this.apiKey === 'your-lithic-api-key' || this.apiKey.startsWith('mock');

    if (this.isMock) {
      this.logger.warn('Lithic API key not configured — running in MOCK mode');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.isMock) {
      return this.mockRequest<T>(path, options);
    }

    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Lithic API error: ${response.status} ${error}`);
      throw new Error(`Lithic API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // ─── Card Operations ───

  async createCard(request: CreateCardRequest): Promise<LithicCard> {
    return this.request<LithicCard>('/cards', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getCard(token: string): Promise<LithicCard> {
    return this.request<LithicCard>(`/cards/${token}`);
  }

  async listCards(): Promise<{ data: LithicCard[] }> {
    return this.request<{ data: LithicCard[] }>('/cards');
  }

  async updateCardState(token: string, state: 'OPEN' | 'PAUSED' | 'CLOSED'): Promise<LithicCard> {
    return this.request<LithicCard>(`/cards/${token}`, {
      method: 'PATCH',
      body: JSON.stringify({ state }),
    });
  }

  // ─── Mock Implementation ───

  private mockStore = new Map<string, any>();
  private mockCounter = 0;

  private mockRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET';
    this.logger.debug(`[MOCK] ${method} ${path}`);

    // POST /cards
    if (path === '/cards' && method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      this.mockCounter++;
      const token = `mock-card-${this.mockCounter}`;
      const lastFour = String(1000 + Math.floor(Math.random() * 9000));
      const card: LithicCard = {
        token,
        last_four: lastFour,
        card_number: `411111111111${lastFour}`,
        cvv: String(100 + Math.floor(Math.random() * 900)),
        exp_month: String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'),
        exp_year: String(new Date().getFullYear() + 3),
        state: 'OPEN',
        spend_limit: body.spend_limit,
        spend_limit_duration: body.spend_limit_duration,
      };
      this.mockStore.set(token, card);
      return Promise.resolve(card as T);
    }

    // GET /cards/:token
    const cardMatch = path.match(/^\/cards\/(.+)$/);
    if (cardMatch && method === 'GET') {
      const token = cardMatch[1];
      const card = this.mockStore.get(token);
      if (!card) throw new Error('Card not found');
      return Promise.resolve(card as T);
    }

    // PATCH /cards/:token
    if (cardMatch && method === 'PATCH') {
      const token = cardMatch[1];
      const body = JSON.parse((options.body as string) || '{}');
      const card = this.mockStore.get(token);
      if (!card) throw new Error('Card not found');
      const updated = { ...card, ...body };
      this.mockStore.set(token, updated);
      return Promise.resolve(updated as T);
    }

    // GET /cards
    if (path === '/cards' && method === 'GET') {
      const cards = Array.from(this.mockStore.values());
      return Promise.resolve({ data: cards } as T);
    }

    throw new Error(`Mock not implemented: ${method} ${path}`);
  }
}
